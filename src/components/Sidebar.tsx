import { useQueryClient } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { NavLink, useNavigate } from 'react-router'
import { displayName, useAuth } from '../auth/AuthProvider'
import { createCollection } from '../lib/api'
import { keys, useCollections, useItems, useTags } from '../lib/queries'
import { BookmarkIcon, CollectionIcon, HashIcon, NoteIcon, PlusIcon, SearchIcon, SettingsIcon } from './icons'
import { useToast } from './Toast'
import { IconButton, Kbd, cx } from './ui'

const linkClass = ({ isActive }: { isActive: boolean }) =>
  cx(
    'flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[15px] transition',
    isActive ? 'bg-ink/[0.07] font-medium text-ink' : 'text-ink-soft hover:bg-ink/5 hover:text-ink',
  )

function Count({ n }: { n: number | undefined }) {
  if (!n) return null
  return <span className="ml-auto text-xs text-muted tabular-nums">{n}</span>
}

export function Sidebar({ onSearch }: { onSearch: () => void }) {
  const { user } = useAuth()
  const { data: items = [] } = useItems()
  const { data: collections = [] } = useCollections()
  const { data: tags = [] } = useTags()

  const counts = useMemo(() => {
    const byKind = { bookmark: 0, note: 0 }
    const byCollection = new Map<string, number>()
    const byTag = new Map<string, number>()
    for (const item of items) {
      byKind[item.kind]++
      if (item.collection_id) byCollection.set(item.collection_id, (byCollection.get(item.collection_id) ?? 0) + 1)
      for (const t of item.tags) byTag.set(t.id, (byTag.get(t.id) ?? 0) + 1)
    }
    return { byKind, byCollection, byTag }
  }, [items])

  return (
    <nav aria-label="Library" className="flex h-full flex-col gap-5 overflow-y-auto px-3 pt-5 pb-4">
      <div className="flex items-center gap-2 px-2.5">
        <img src="/favicon.svg" alt="" className="size-6 rounded-md" />
        <span className="font-serif text-xl font-semibold tracking-tight">Node</span>
      </div>

      <button
        type="button"
        onClick={onSearch}
        className="flex items-center gap-2 rounded-lg border border-line bg-raised px-2.5 py-1.5 text-left text-sm text-muted hover:border-line-strong"
      >
        <SearchIcon size={16} />
        <span className="flex-1">Search</span>
        <Kbd>⌘K</Kbd>
      </button>

      <ul className="space-y-0.5">
        <li>
          <NavLink to="/bookmarks" className={linkClass}>
            <BookmarkIcon size={17} /> Bookmarks <Count n={counts.byKind.bookmark} />
          </NavLink>
        </li>
        <li>
          <NavLink to="/notes" end={false} className={linkClass}>
            <NoteIcon size={17} /> Notes <Count n={counts.byKind.note} />
          </NavLink>
        </li>
      </ul>

      <section>
        <CollectionsHeader />
        {collections.length === 0 ? (
          <p className="px-2.5 py-1 text-sm text-muted">No collections yet.</p>
        ) : (
          <ul className="space-y-0.5">
            {collections.map((c) => (
              <li key={c.id}>
                <NavLink to={`/collections/${c.id}`} className={linkClass}>
                  <CollectionIcon size={16} className="shrink-0 text-muted" />
                  <span className="truncate">{c.name}</span>
                  <Count n={counts.byCollection.get(c.id)} />
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-1 px-2.5 text-xs font-semibold tracking-wider text-muted uppercase">Tags</h2>
        {tags.length === 0 ? (
          <p className="px-2.5 py-1 text-sm text-muted">Tags you add show up here.</p>
        ) : (
          <ul className="space-y-0.5">
            {tags.map((t) => (
              <li key={t.id}>
                <NavLink to={`/tags/${encodeURIComponent(t.name)}`} className={linkClass}>
                  <HashIcon size={15} className="shrink-0 text-muted" />
                  <span className="truncate">{t.name}</span>
                  <Count n={counts.byTag.get(t.id)} />
                </NavLink>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-auto border-t border-line pt-3">
        <NavLink to="/settings" className={linkClass}>
          <SettingsIcon size={17} />
          <span className="min-w-0 flex-1 truncate">Settings</span>
          <span className="max-w-28 truncate text-xs text-muted">{displayName(user)}</span>
        </NavLink>
      </div>
    </nav>
  )
}

function CollectionsHeader() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const submit = async () => {
    const value = name.trim()
    if (!value) return setCreating(false)
    try {
      const collection = await createCollection(value)
      await qc.invalidateQueries({ queryKey: keys.collections })
      setName('')
      setCreating(false)
      navigate(`/collections/${collection.id}`)
    } catch (e) {
      toast({ message: `Couldn't create collection: ${(e as Error).message}` })
    }
  }

  return (
    <>
      <div className="mb-1 flex items-center justify-between pl-2.5">
        <h2 className="text-xs font-semibold tracking-wider text-muted uppercase">Collections</h2>
        <IconButton label="New collection" className="size-7" onClick={() => setCreating(true)}>
          <PlusIcon size={16} />
        </IconButton>
      </div>
      {creating && (
        <form
          className="mb-1 px-1"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <input
            autoFocus
            value={name}
            maxLength={100}
            aria-label="Collection name"
            placeholder="Collection name"
            onChange={(e) => setName(e.target.value)}
            onBlur={() => void submit()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault()
                e.stopPropagation()
                setName('')
                setCreating(false)
              }
            }}
            className="w-full rounded-lg border border-accent bg-raised px-2.5 py-1.5 text-[15px] outline-none"
          />
        </form>
      )}
    </>
  )
}
