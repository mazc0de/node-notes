import type { JSONContent } from '@tiptap/react'

export type ItemKind = 'bookmark' | 'note'

export interface Tag {
  id: string
  name: string
}

export interface Collection {
  id: string
  name: string
  created_at: string
}

/** The lightweight shape of an Item used by every list (no note body). */
export interface ItemSummary {
  id: string
  kind: ItemKind
  title: string | null
  url: string | null
  url_key: string | null
  description: string | null
  excerpt: string | null
  collection_id: string | null
  pinned: boolean
  created_at: string
  updated_at: string
  tags: Tag[]
}

export interface NoteFull extends ItemSummary {
  body: JSONContent | null
  body_text: string | null
}

export interface SearchResult {
  id: string
  kind: ItemKind
  title: string | null
  url: string | null
  description: string | null
  excerpt: string | null
  pinned: boolean
  updated_at: string
}

export type SortMode = 'recent' | 'title'
export type KindFilter = 'all' | ItemKind
