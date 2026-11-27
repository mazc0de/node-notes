import { Link, useNavigate } from 'react-router'
import { itemTitle, noteSnippet } from '../lib/display'
import { useDeleteItem, useTogglePin } from '../lib/queries'
import type { ItemSummary } from '../lib/types'
import { useBookmarkPanel } from '../lib/useBookmarkPanel'
import { domainOf } from '../lib/url'
import { BookmarkIcon, NoteIcon, OpenIcon, PinIcon } from './icons'
import { Menu, cx } from './ui'

export function ItemRow({ item, showKind }: { item: ItemSummary; showKind?: boolean }) {
  const { openItem } = useBookmarkPanel()
  const navigate = useNavigate()
  const togglePin = useTogglePin()
  const deleteItem = useDeleteItem()
  const isBookmark = item.kind === 'bookmark'
  const title = itemTitle(item)
  const snippet = isBookmark ? item.description : noteSnippet(item)

  const pinItem = { label: item.pinned ? 'Unpin' : 'Pin', onSelect: () => void togglePin(item) }
  const deleteMenuItem = { label: 'Delete', danger: true, onSelect: () => void deleteItem(item) }

  // Stretched-link pattern: the title control covers the row; Open, tags and ⋯ sit above it.
  const overlay = 'after:absolute after:inset-0 after:rounded-xl after:content-[""]'

  return (
    <li className="group relative flex gap-3 rounded-xl px-3 py-3 transition hover:bg-raised has-[:focus-visible]:bg-raised md:px-4">
      {showKind && (
        <span className="mt-1 text-muted" title={isBookmark ? 'Bookmark' : 'Note'}>
          {isBookmark ? <BookmarkIcon size={16} /> : <NoteIcon size={16} />}
          <span className="sr-only">{isBookmark ? 'Bookmark' : 'Note'}</span>
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          {isBookmark ? (
            <button
              type="button"
              onClick={() => openItem(item.id)}
              className={cx('min-w-0 truncate text-left font-serif text-[1.075rem] leading-snug font-medium text-ink focus-visible:outline-none', overlay)}
            >
              {title}
            </button>
          ) : (
            <Link
              to={`/notes/${item.id}`}
              className={cx('min-w-0 truncate font-serif text-[1.075rem] leading-snug font-medium text-ink focus-visible:outline-none', overlay)}
            >
              {title}
            </Link>
          )}
          {item.pinned && (
            <span className="shrink-0 text-accent" title="Pinned">
              <PinIcon size={14} fill="currentColor" />
              <span className="sr-only">Pinned</span>
            </span>
          )}
        </div>

        {isBookmark && item.url && <p className="truncate text-[13px] text-muted">{domainOf(item.url)}</p>}
        {snippet && <p className="mt-0.5 line-clamp-2 text-[15px] text-ink-soft">{snippet}</p>}

        {item.tags.length > 0 && (
          <ul className="pointer-events-none relative z-10 mt-1.5 flex flex-wrap gap-1.5">
            {item.tags.map((tag) => (
              <li key={tag.id}>
                <Link
                  to={`/tags/${encodeURIComponent(tag.name)}`}
                  className="pointer-events-auto rounded-md px-1.5 py-0.5 text-[13px] text-muted ring-1 ring-line hover:text-ink hover:ring-line-strong"
                >
                  #{tag.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="relative z-10 flex shrink-0 items-start gap-0.5">
        {isBookmark && item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2.5 text-sm font-medium text-ink-soft ring-1 ring-line hover:bg-paper hover:text-accent hover:ring-line-strong"
            aria-label={`Open ${title} in a new tab`}
          >
            <OpenIcon size={16} />
            <span className="hidden sm:inline">Open</span>
          </a>
        )}
        <Menu
          label={`Actions for ${title}`}
          items={
            isBookmark
              ? [{ label: 'Edit', onSelect: () => openItem(item.id) }, pinItem, deleteMenuItem]
              : [{ label: 'Open', onSelect: () => navigate(`/notes/${item.id}`) }, pinItem, deleteMenuItem]
          }
        />
      </div>
    </li>
  )
}
