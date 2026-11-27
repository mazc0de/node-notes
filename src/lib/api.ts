import type { JSONContent } from '@tiptap/react'
import { supabase } from './supabase'
import type { Collection, ItemSummary, NoteFull, SearchResult, Tag } from './types'
import { urlKey } from './url'

const SUMMARY_COLUMNS =
  'id,kind,title,url,url_key,description,excerpt,collection_id,pinned,created_at,updated_at,tags(id,name)'
/** Everything needed to put a deleted Item back exactly as it was (generated columns excluded). */
const SNAPSHOT_COLUMNS =
  'id,kind,title,url,url_key,description,body,body_text,collection_id,pinned,created_at,updated_at,tags(name)'
const PAGE_SIZE = 1000

type Result<T> = { data: T | null; error: { message: string; code?: string } | null }

function unwrap<T>({ data, error }: Result<T>): T {
  if (error) throw Object.assign(new Error(error.message), { code: error.code })
  return data as T
}

// ─── Items ──────────────────────────────────────────────────────────────────

/** The whole library (summaries only). PostgREST caps responses, so page through it. */
export async function fetchItems(): Promise<ItemSummary[]> {
  const all: ItemSummary[] = []
  for (let from = 0; ; from += PAGE_SIZE) {
    const page = unwrap(
      await supabase
        .from('items')
        .select(SUMMARY_COLUMNS)
        .order('created_at', { ascending: false })
        .order('id')
        .range(from, from + PAGE_SIZE - 1),
    ) as unknown as ItemSummary[]
    all.push(...page)
    if (page.length < PAGE_SIZE) return all
  }
}

export async function fetchNote(id: string): Promise<NoteFull | null> {
  const res = await supabase
    .from('items')
    .select(`${SUMMARY_COLUMNS},body,body_text`)
    .eq('id', id)
    .eq('kind', 'note')
    .maybeSingle()
  return unwrap(res) as unknown as NoteFull | null
}

export interface BookmarkInput {
  url: string
  title: string
  description: string
  collection_id: string | null
  tags: string[]
}

function bookmarkRow(input: BookmarkInput) {
  return {
    url: input.url,
    url_key: urlKey(input.url),
    title: input.title.trim() || null,
    description: input.description.trim() || null,
    collection_id: input.collection_id,
  }
}

export async function createBookmark(input: BookmarkInput): Promise<string> {
  const { id } = unwrap(
    await supabase
      .from('items')
      .insert({ kind: 'bookmark', ...bookmarkRow(input) })
      .select('id')
      .single(),
  ) as { id: string }
  if (input.tags.length) await setItemTags(id, input.tags)
  return id
}

export async function updateBookmark(id: string, input: BookmarkInput): Promise<void> {
  unwrap(await supabase.from('items').update(bookmarkRow(input)).eq('id', id))
  await setItemTags(id, input.tags)
}

export interface NoteInput {
  title: string | null
  body: JSONContent
  body_text: string
  collection_id: string | null
  pinned: boolean
}

export async function createNote(input: NoteInput): Promise<string> {
  const { id } = unwrap(
    await supabase
      .from('items')
      .insert({ kind: 'note', ...input })
      .select('id')
      .single(),
  ) as { id: string }
  return id
}

export async function updateNote(id: string, input: NoteInput): Promise<void> {
  unwrap(await supabase.from('items').update(input).eq('id', id))
}

export async function setPinned(id: string, pinned: boolean): Promise<void> {
  unwrap(await supabase.from('items').update({ pinned }).eq('id', id))
}

export async function setItemTags(id: string, names: string[]): Promise<void> {
  unwrap(await supabase.rpc('set_item_tags', { p_item_id: id, p_names: names }))
}

export interface ItemSnapshot {
  id: string
  kind: string
  title: string | null
  url: string | null
  url_key: string | null
  description: string | null
  body: JSONContent | null
  body_text: string | null
  collection_id: string | null
  pinned: boolean
  created_at: string
  updated_at: string
  tags: { name: string }[]
}

/** Deletes right away and returns what is needed for Undo. */
export async function deleteItem(id: string): Promise<ItemSnapshot> {
  const snapshot = unwrap(
    await supabase.from('items').select(SNAPSHOT_COLUMNS).eq('id', id).single(),
  ) as unknown as ItemSnapshot
  unwrap(await supabase.from('items').delete().eq('id', id))
  return snapshot
}

export async function restoreItem(snapshot: ItemSnapshot): Promise<void> {
  const { tags, ...row } = snapshot
  let res = await supabase.from('items').insert(row)
  // The Collection may have been deleted in the meantime — keep the Item without it.
  if (res.error?.code === '23503') {
    res = await supabase.from('items').insert({ ...row, collection_id: null })
  }
  unwrap(res)
  if (tags.length) await setItemTags(row.id, tags.map((t) => t.name))
}

export async function searchItems(q: string): Promise<SearchResult[]> {
  return unwrap(await supabase.rpc('search_items', { q })) as SearchResult[]
}

// ─── Collections ────────────────────────────────────────────────────────────

export async function fetchCollections(): Promise<Collection[]> {
  return unwrap(
    await supabase.from('collections').select('id,name,created_at').order('name'),
  ) as Collection[]
}

export async function createCollection(name: string): Promise<Collection> {
  return unwrap(
    await supabase.from('collections').insert({ name: name.trim() }).select('id,name,created_at').single(),
  ) as Collection
}

export async function renameCollection(id: string, name: string): Promise<void> {
  unwrap(await supabase.from('collections').update({ name: name.trim() }).eq('id', id))
}

export async function deleteCollection(id: string): Promise<void> {
  unwrap(await supabase.from('collections').delete().eq('id', id))
}

// ─── Tags ───────────────────────────────────────────────────────────────────

export async function fetchTags(): Promise<Tag[]> {
  return unwrap(await supabase.from('tags').select('id,name').order('name')) as Tag[]
}

export async function deleteTag(id: string): Promise<void> {
  unwrap(await supabase.from('tags').delete().eq('id', id))
}
