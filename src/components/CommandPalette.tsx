import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { searchItems } from '../lib/api'
import { itemTitle, noteSnippet } from '../lib/display'
import { keys } from '../lib/queries'
import { useBookmarkPanel } from '../lib/useBookmarkPanel'
import { domainOf } from '../lib/url'
import { BookmarkIcon, KeyboardIcon, NoteIcon, PlusIcon, SearchIcon, SettingsIcon } from './icons'
import { Kbd, Modal, cx } from './ui'

interface Entry {
  id: string
  icon: ReactNode
  label: string
  detail?: string
  hint?: ReactNode
  run: (opts: { newTab: boolean }) => void
}

export function CommandPalette({
  open,
  onClose,
  onShowShortcuts,
}: {
  open: boolean
  onClose: () => void
  onShowShortcuts: () => void
}) {
  return (
    <Modal open={open} onClose={onClose} variant="palette" label="Search">
      <PaletteBody onClose={onClose} onShowShortcuts={onShowShortcuts} />
    </Modal>
  )
}

function useDebounced<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), ms)
    return () => window.clearTimeout(t)
  }, [value, ms])
  return debounced
}

function PaletteBody({ onClose, onShowShortcuts }: { onClose: () => void; onShowShortcuts: () => void }) {
  const navigate = useNavigate()
  const { openItem, openNew } = useBookmarkPanel()
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()
  const q = useDebounced(query.trim(), 150)

  const search = useQuery({
    queryKey: keys.search(q),
    queryFn: () => searchItems(q),
    enabled: q.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 10_000,
  })

  const entries: Entry[] = useMemo(() => {
    if (!query.trim()) {
      return [
        { id: 'new-bookmark', icon: <PlusIcon size={16} />, label: 'New bookmark', hint: <Kbd>B</Kbd>, run: () => openNew() },
        { id: 'new-note', icon: <PlusIcon size={16} />, label: 'New note', hint: <Kbd>N</Kbd>, run: () => navigate('/notes/new') },
        { id: 'go-bookmarks', icon: <BookmarkIcon size={16} />, label: 'Go to Bookmarks', run: () => navigate('/bookmarks') },
        { id: 'go-notes', icon: <NoteIcon size={16} />, label: 'Go to Notes', run: () => navigate('/notes') },
        { id: 'go-settings', icon: <SettingsIcon size={16} />, label: 'Settings', run: () => navigate('/settings') },
        { id: 'shortcuts', icon: <KeyboardIcon size={16} />, label: 'Keyboard shortcuts', hint: <Kbd>?</Kbd>, run: onShowShortcuts },
      ]
    }
    return (search.data ?? []).map((r) => {
      const isBookmark = r.kind === 'bookmark'
      return {
        id: r.id,
        icon: isBookmark ? <BookmarkIcon size={16} /> : <NoteIcon size={16} />,
        label: itemTitle(r),
        detail: isBookmark ? (r.url ? domainOf(r.url) : undefined) : noteSnippet(r) || undefined,
        run: ({ newTab }) => {
          if (isBookmark && newTab && r.url) window.open(r.url, '_blank', 'noopener,noreferrer')
          else if (isBookmark) openItem(r.id)
          else navigate(`/notes/${r.id}`)
        },
      }
    })
  }, [query, search.data, navigate, openItem, openNew, onShowShortcuts])

  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' })
  }, [active])

  const select = (entry: Entry | undefined, newTab = false) => {
    if (!entry) return
    onClose()
    entry.run({ newTab })
  }

  const searching = query.trim() && (search.isFetching || q !== query.trim())

  return (
    <div className="flex max-h-[70vh] flex-col">
      <div className="flex items-center gap-3 border-b border-line px-4">
        <SearchIcon className="text-muted" />
        <input
          data-autofocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-activedescendant={entries[active] ? `${listId}-${active}` : undefined}
          aria-label="Search bookmarks and notes"
          placeholder="Search titles, links, descriptions and notes…"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setActive(0)
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault()
              setActive((a) => Math.min(a + 1, entries.length - 1))
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              setActive((a) => Math.max(a - 1, 0))
            } else if (e.key === 'Enter') {
              e.preventDefault()
              select(entries[active], e.metaKey || e.ctrlKey)
            }
          }}
          className="h-14 flex-1 bg-transparent text-[16px] text-ink outline-none placeholder:text-muted focus-visible:outline-none"
        />
        <Kbd>esc</Kbd>
      </div>

      <ul id={listId} ref={listRef} role="listbox" className="flex-1 overflow-y-auto p-2">
        {entries.map((entry, i) => (
          <li
            key={entry.id}
            id={`${listId}-${i}`}
            data-index={i}
            role="option"
            aria-selected={i === active}
            onPointerMove={() => setActive(i)}
            onClick={(e) => select(entry, e.metaKey || e.ctrlKey)}
            className={cx(
              'flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2',
              i === active ? 'bg-ink/[0.07]' : '',
            )}
          >
            <span className="text-muted">{entry.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] text-ink">{entry.label}</span>
              {entry.detail && <span className="block truncate text-[13px] text-muted">{entry.detail}</span>}
            </span>
            {entry.hint}
          </li>
        ))}
        {query.trim() && !searching && entries.length === 0 && (
          <li className="px-3 py-8 text-center text-sm text-muted">Nothing matches “{query.trim()}”.</li>
        )}
        {search.isError && <li className="px-3 py-4 text-center text-sm text-danger">Search failed. Try again.</li>}
      </ul>

      {query.trim() && entries.length > 0 && (
        <p className="hidden border-t border-line px-4 py-2 text-xs text-muted md:block">
          <Kbd>↵</Kbd> open · <Kbd>⌘</Kbd>
          <Kbd>↵</Kbd> open link in new tab
        </p>
      )}
    </div>
  )
}
