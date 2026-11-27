import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { ItemsView } from '../components/ItemsView'
import { BookmarkIcon, NoteIcon, PlusIcon } from '../components/icons'
import { useToast } from '../components/Toast'
import { Button, ConfirmDialog, Kbd, Menu, Spinner, inputClass } from '../components/ui'
import { deleteCollection, deleteTag, renameCollection } from '../lib/api'
import { plural } from '../lib/display'
import { keys, useCollections, useItems, useRefreshLibrary, useTags } from '../lib/queries'
import { useBookmarkPanel } from '../lib/useBookmarkPanel'

function NewButtons({ noteHref = '/notes/new', only }: { noteHref?: string; only?: 'bookmark' | 'note' }) {
  const { openNew } = useBookmarkPanel()
  const navigate = useNavigate()
  return (
    <div className="hidden gap-2 md:flex">
      {only !== 'note' && (
        <Button variant={only ? 'primary' : 'secondary'} onClick={() => openNew()}>
          <PlusIcon size={16} /> Bookmark
        </Button>
      )}
      {only !== 'bookmark' && (
        <Button variant={only ? 'primary' : 'secondary'} onClick={() => navigate(noteHref)}>
          <PlusIcon size={16} /> Note
        </Button>
      )}
    </div>
  )
}

export function BookmarksPage() {
  return (
    <ItemsView
      title="Bookmarks"
      fixedKind="bookmark"
      filter={(i) => i.kind === 'bookmark'}
      actions={<NewButtons only="bookmark" />}
      empty={
        <>
          <BookmarkIcon size={28} className="mx-auto mb-3 text-muted" />
          <p className="font-serif text-xl text-ink">No bookmarks yet</p>
          <p className="mt-1">
            Press <Kbd>B</Kbd> to save your first link.
          </p>
        </>
      }
    />
  )
}

export function NotesPage() {
  return (
    <ItemsView
      title="Notes"
      fixedKind="note"
      filter={(i) => i.kind === 'note'}
      actions={<NewButtons only="note" />}
      empty={
        <>
          <NoteIcon size={28} className="mx-auto mb-3 text-muted" />
          <p className="font-serif text-xl text-ink">No notes yet</p>
          <p className="mt-1">
            Press <Kbd>N</Kbd> to start writing.
          </p>
        </>
      }
    />
  )
}

export function CollectionPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const refresh = useRefreshLibrary()
  const { toast } = useToast()
  const { data: collections, isPending } = useCollections()
  const { data: items = [] } = useItems()
  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const collection = collections?.find((c) => c.id === id)
  if (isPending) return <Spinner />
  if (!collection) return <Missing what="collection" />

  const count = items.filter((i) => i.collection_id === id).length

  const saveName = async () => {
    const value = name.trim()
    setRenaming(false)
    if (!value || value === collection.name) return
    try {
      await renameCollection(id, value)
      await qc.invalidateQueries({ queryKey: keys.collections })
    } catch (e) {
      toast({ message: `Couldn't rename: ${(e as Error).message}` })
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      await deleteCollection(id)
      setConfirming(false)
      navigate('/bookmarks', { replace: true })
      await refresh()
      toast({ message: `Deleted collection “${collection.name}”` })
    } catch (e) {
      toast({ message: `Couldn't delete: ${(e as Error).message}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ItemsView
        eyebrow="Collection"
        title={
          renaming ? (
            <form
              onSubmit={(e) => {
                e.preventDefault()
                void saveName()
              }}
            >
              <input
                autoFocus
                aria-label="Collection name"
                value={name}
                maxLength={100}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => void saveName()}
                onKeyDown={(e) => e.key === 'Escape' && (e.preventDefault(), setRenaming(false))}
                className={`${inputClass} font-serif text-2xl`}
              />
            </form>
          ) : (
            collection.name
          )
        }
        filter={(i) => i.collection_id === id}
        actions={
          <>
            <NewButtons noteHref={`/notes/new?collection=${id}`} />
            <Menu
              label="Collection actions"
              items={[
                {
                  label: 'Rename',
                  onSelect: () => {
                    setName(collection.name)
                    setRenaming(true)
                  },
                },
                { label: 'Delete collection', danger: true, onSelect: () => setConfirming(true) },
              ]}
            />
          </>
        }
        empty={<p>This collection is empty. Choose it when saving a Bookmark or Note.</p>}
      />
      <ConfirmDialog
        open={confirming}
        title={`Delete “${collection.name}”?`}
        message={`${plural(count, 'item')} will be kept.`}
        confirmLabel="Delete collection"
        danger
        busy={busy}
        onConfirm={() => void remove()}
        onClose={() => setConfirming(false)}
      />
    </>
  )
}

export function TagPage() {
  const params = useParams()
  const name = params.name ?? ''
  const navigate = useNavigate()
  const refresh = useRefreshLibrary()
  const { toast } = useToast()
  const { data: tags } = useTags()
  const { data: items = [] } = useItems()
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)

  const tag = tags?.find((t) => t.name === name)
  const count = items.filter((i) => i.tags.some((t) => t.name === name)).length

  const remove = async () => {
    if (!tag) return
    setBusy(true)
    try {
      await deleteTag(tag.id)
      setConfirming(false)
      navigate('/bookmarks', { replace: true })
      await refresh()
      toast({ message: `Deleted tag “${tag.name}”` })
    } catch (e) {
      toast({ message: `Couldn't delete: ${(e as Error).message}` })
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <ItemsView
        eyebrow="Tag"
        title={`#${name}`}
        filter={(i) => i.tags.some((t) => t.name === name)}
        actions={
          <>
            <NewButtons />
            {tag && (
              <Menu
                label="Tag actions"
                items={[{ label: 'Delete tag', danger: true, onSelect: () => setConfirming(true) }]}
              />
            )}
          </>
        }
        empty={<p>Nothing is tagged #{name}.</p>}
      />
      <ConfirmDialog
        open={confirming}
        title={`Delete tag “${name}”?`}
        message={`It will be removed from ${plural(count, 'item')}. The items themselves are kept.`}
        confirmLabel="Delete tag"
        danger
        busy={busy}
        onConfirm={() => void remove()}
        onClose={() => setConfirming(false)}
      />
    </>
  )
}

function Missing({ what }: { what: string }) {
  return (
    <div className="mx-auto max-w-md px-6 py-24 text-center">
      <h1 className="font-serif text-2xl font-medium">This {what} doesn't exist</h1>
      <p className="mt-2 text-ink-soft">It may have been deleted.</p>
      <Link to="/bookmarks" className="mt-5 inline-block font-medium text-accent underline underline-offset-2">
        Go to Bookmarks
      </Link>
    </div>
  )
}

export function NotFoundPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-6 text-center">
      <div>
        <h1 className="font-serif text-3xl font-medium">Page not found</h1>
        <Link to="/" className="mt-4 inline-block font-medium text-accent underline underline-offset-2">
          Go home
        </Link>
      </div>
    </main>
  )
}
