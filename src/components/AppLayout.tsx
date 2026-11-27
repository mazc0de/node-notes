import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router'
import { useBookmarkPanel } from '../lib/useBookmarkPanel'
import { BookmarkPanel } from './BookmarkPanel'
import { CommandPalette } from './CommandPalette'
import { BookmarkIcon, MenuIcon, NoteIcon, OfflineIcon, PlusIcon, SearchIcon } from './icons'
import { Sidebar } from './Sidebar'
import { IconButton, Kbd, Modal, cx } from './ui'

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, select, [contenteditable="true"], [contenteditable=""]'))
}

export function AppLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { openNew } = useBookmarkPanel()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [helpOpen, setHelpOpen] = useState(false)

  useEffect(() => setDrawerOpen(false), [location.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return
      if (isTypingTarget(e.target) || document.querySelector('dialog[open]')) return
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        openNew()
      } else if (e.key === 'n' || e.key === 'N') {
        e.preventDefault()
        navigate('/notes/new')
      } else if (e.key === '?') {
        e.preventDefault()
        setHelpOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, openNew])

  const openSearch = () => {
    setDrawerOpen(false)
    setPaletteOpen(true)
  }

  return (
    <div className="min-h-dvh md:flex">
      <OfflineBanner />

      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 border-r border-line bg-surface/60 md:block">
        <Sidebar onSearch={openSearch} />
      </aside>

      <header className="sticky top-0 z-20 flex items-center gap-1 border-b border-line bg-paper/90 px-2 pt-[env(safe-area-inset-top)] backdrop-blur md:hidden">
        <IconButton label="Open menu" className="size-11" onClick={() => setDrawerOpen(true)}>
          <MenuIcon size={20} />
        </IconButton>
        <span className="flex-1 font-serif text-lg font-semibold">Node</span>
        <IconButton label="Search" className="size-11" onClick={openSearch}>
          <SearchIcon size={20} />
        </IconButton>
      </header>

      <Modal open={drawerOpen} onClose={() => setDrawerOpen(false)} variant="drawer" label="Menu">
        <div className="h-full bg-surface pt-[env(safe-area-inset-top)]">
          <Sidebar onSearch={openSearch} />
        </div>
      </Modal>

      <main className="min-w-0 flex-1">
        <Outlet />
      </main>

      <Fab onBookmark={() => openNew()} onNote={() => navigate('/notes/new')} />

      <BookmarkPanel />
      <CommandPalette
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        onShowShortcuts={() => setHelpOpen(true)}
      />
      <ShortcutsDialog open={helpOpen} onClose={() => setHelpOpen(false)} />
    </div>
  )
}

function Fab({ onBookmark, onNote }: { onBookmark: () => void; onNote: () => void }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  useEffect(() => setOpen(false), [location])
  if (location.pathname.startsWith('/notes/') || location.pathname === '/settings') return null

  return (
    <div className="fixed right-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-30 flex flex-col items-end gap-2 md:hidden">
      {open && (
        <>
          <button
            type="button"
            onClick={onBookmark}
            className="toast-in flex items-center gap-2 rounded-full border border-line bg-raised px-4 py-2.5 text-[15px] font-medium shadow-lg"
          >
            <BookmarkIcon size={17} /> Bookmark
          </button>
          <button
            type="button"
            onClick={onNote}
            className="toast-in flex items-center gap-2 rounded-full border border-line bg-raised px-4 py-2.5 text-[15px] font-medium shadow-lg"
          >
            <NoteIcon size={17} /> Note
          </button>
        </>
      )}
      <button
        type="button"
        aria-label={open ? 'Close' : 'New'}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex size-14 items-center justify-center rounded-full bg-accent text-accent-ink shadow-xl active:scale-95"
      >
        <PlusIcon size={26} className={cx('transition-transform', open && 'rotate-45')} />
      </button>
    </div>
  )
}

function OfflineBanner() {
  const [online, setOnline] = useState(() => navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
    }
  }, [])
  if (online) return null
  return (
    <div
      role="status"
      className="fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 bg-ink px-4 pt-[calc(env(safe-area-inset-top)+0.375rem)] pb-1.5 text-sm text-paper"
    >
      <OfflineIcon size={16} /> You're offline. Changes can't be saved until you reconnect.
    </div>
  )
}

const SHORTCUTS: [string[], string][] = [
  [['⌘', 'K'], 'Search'],
  [['B'], 'New bookmark'],
  [['N'], 'New note'],
  [['Esc'], 'Close panel or dialog'],
  [['?'], 'Show shortcuts'],
  [['⌘', '↵'], 'Save bookmark'],
]

function ShortcutsDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} label="Keyboard shortcuts">
      <div className="p-6">
        <h2 className="font-serif text-xl font-medium">Keyboard shortcuts</h2>
        <dl className="mt-4 divide-y divide-line">
          {SHORTCUTS.map(([keysList, label]) => (
            <div key={label} className="flex items-center justify-between py-2.5">
              <dt className="text-[15px] text-ink-soft">{label}</dt>
              <dd className="flex gap-1">
                {keysList.map((k) => (
                  <Kbd key={k}>{k}</Kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-sm text-muted">Single-key shortcuts are ignored while you're typing.</p>
      </div>
    </Modal>
  )
}
