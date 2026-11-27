import type { ItemSummary, SortMode } from './types'
import { domainOf } from './url'

type Titled = Pick<ItemSummary, 'kind' | 'title' | 'url' | 'excerpt'>

function firstLine(text: string | null | undefined): string {
  return (text ?? '').trim().split('\n')[0]?.trim() ?? ''
}

/** Bookmark without a title → its domain. Note without a title → first line of its body. */
export function itemTitle(item: Titled): string {
  const title = item.title?.trim()
  if (title) return title
  if (item.kind === 'bookmark' && item.url) return domainOf(item.url)
  return firstLine(item.excerpt) || 'Untitled'
}

/** A short body preview for a Note, skipping the first line when it is already shown as the title. */
export function noteSnippet(item: Titled): string {
  const text = (item.excerpt ?? '').trim()
  if (item.title?.trim()) return text.replace(/\s+/g, ' ')
  const newline = text.indexOf('\n')
  return newline === -1 ? '' : text.slice(newline + 1).replace(/\s+/g, ' ').trim()
}

export function sortItems<T extends ItemSummary>(items: T[], mode: SortMode): T[] {
  return [...items].sort((a, b) => {
    if (a.pinned !== b.pinned) return a.pinned ? -1 : 1
    if (mode === 'title') {
      return itemTitle(a).localeCompare(itemTitle(b), undefined, { sensitivity: 'base', numeric: true })
    }
    return b.created_at.localeCompare(a.created_at)
  })
}

export function truncate(text: string, max = 40): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`
}

export function normalizeTag(raw: string): string {
  return raw.trim().toLowerCase().slice(0, 50)
}
