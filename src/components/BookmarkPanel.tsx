import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useMatch } from 'react-router'
import { createBookmark, updateBookmark } from '../lib/api'
import { itemTitle } from '../lib/display'
import { keys, useDeleteItem, useItems, useRefreshLibrary, useTogglePin } from '../lib/queries'
import type { ItemSummary } from '../lib/types'
import { useBookmarkPanel } from '../lib/useBookmarkPanel'
import { domainOf, normalizeUrlInput, urlKey } from '../lib/url'
import { CollectionSelect } from './CollectionSelect'
import { CloseIcon, OpenIcon, PinIcon } from './icons'
import { TagInput } from './TagInput'
import { useToast } from './Toast'
import { Button, Field, IconButton, Kbd, Modal, Spinner, cx, inputClass } from './ui'

export function BookmarkPanel() {
  const { target, prefill, close } = useBookmarkPanel()
  const { data: items, isPending } = useItems()
  const open = target !== null
  const item = target && target !== 'new' ? items?.find((i) => i.id === target && i.kind === 'bookmark') : undefined

  let content
  if (target === 'new') content = <BookmarkForm key="new" prefill={prefill} onDone={close} />
  else if (item) content = <BookmarkForm key={item.id} item={item} onDone={close} />
  else if (isPending) content = <Spinner />
  else
    content = (
      <div className="p-6">
        <p className="text-ink-soft">This Bookmark doesn't exist anymore.</p>
        <Button className="mt-4" onClick={close}>
          Close
        </Button>
      </div>
    )

  return (
    <Modal open={open} onClose={close} variant="sheet" label={target === 'new' ? 'New bookmark' : 'Edit bookmark'}>
      {content}
    </Modal>
  )
}

function BookmarkForm({
  item,
  prefill,
  onDone,
}: {
  item?: ItemSummary
  prefill?: { url: string | null; title: string | null }
  onDone: () => void
}) {
  const qc = useQueryClient()
  const { toast } = useToast()
  const refresh = useRefreshLibrary()
  const togglePin = useTogglePin()
  const deleteItem = useDeleteItem()
  const { data: items = [] } = useItems()
  const { openItem } = useBookmarkPanel()

  // New bookmarks start in the Collection / Tag page you're looking at.
  const collectionMatch = useMatch('/collections/:id')
  const tagMatch = useMatch('/tags/:name')

  const [url, setUrl] = useState(item?.url ?? prefill?.url ?? '')
  const [title, setTitle] = useState(item?.title ?? prefill?.title ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [collectionId, setCollectionId] = useState<string | null>(
    item ? item.collection_id : (collectionMatch?.params.id ?? null),
  )
  const [tags, setTags] = useState<string[]>(
    item ? item.tags.map((t) => t.name) : tagMatch?.params.name ? [decodeURIComponent(tagMatch.params.name)] : [],
  )
  const [touched, setTouched] = useState(false)
  const [saving, setSaving] = useState(false)

  const normalized = normalizeUrlInput(url)
  const urlError = touched && !normalized ? 'Enter a valid URL, like example.com/page' : null
  const duplicate = normalized
    ? items.find((i) => i.kind === 'bookmark' && i.id !== item?.id && i.url_key === urlKey(normalized))
    : undefined

  const submit = async () => {
    setTouched(true)
    if (!normalized || saving) return
    setSaving(true)
    const input = { url: normalized, title, description, collection_id: collectionId, tags }
    try {
      if (item) await updateBookmark(item.id, input)
      else await createBookmark(input)
      await refresh()
      toast({ message: item ? 'Bookmark updated' : 'Bookmark saved', duration: 2500 })
      onDone()
    } catch (e) {
      toast({ message: `Couldn't save: ${(e as Error).message}` })
      void qc.invalidateQueries({ queryKey: keys.items })
    } finally {
      setSaving(false)
    }
  }

  const livePinned = items.find((i) => i.id === item?.id)?.pinned ?? item?.pinned ?? false

  return (
    <form
      className="flex h-full flex-col"
      onSubmit={(e) => {
        e.preventDefault()
        void submit()
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
          e.preventDefault()
          void submit()
        }
      }}
    >
      <header className="flex items-center gap-2 border-b border-line px-5 py-3">
        <h2 className="min-w-0 flex-1 truncate font-serif text-xl font-medium">
          {item ? itemTitle(item) : 'New bookmark'}
        </h2>
        {item && (
          <>
            <IconButton
              label={livePinned ? 'Unpin' : 'Pin'}
              aria-pressed={livePinned}
              className={cx(livePinned && 'text-accent')}
              onClick={() => void togglePin({ id: item.id, pinned: livePinned })}
            >
              <PinIcon fill={livePinned ? 'currentColor' : 'none'} />
            </IconButton>
            <a
              href={item.url ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Open link in new tab"
              title="Open"
              className="inline-flex size-9 items-center justify-center rounded-lg text-muted hover:bg-ink/5 hover:text-ink"
            >
              <OpenIcon />
            </a>
          </>
        )}
        <IconButton label="Close" onClick={onDone}>
          <CloseIcon />
        </IconButton>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto px-5 pt-5 pb-48">
        <Field
          label="URL"
          htmlFor="bm-url"
          hint={
            <>
              {urlError && (
                <p className="text-sm text-danger" role="alert">
                  {urlError}
                </p>
              )}
              {duplicate && (
                <p className="rounded-lg bg-accent-soft/50 px-3 py-2 text-sm text-ink dark:bg-ink/10" role="status">
                  <strong className="font-semibold">Already saved</strong> as{' '}
                  <button
                    type="button"
                    className="font-medium text-accent underline underline-offset-2"
                    onClick={() => openItem(duplicate.id)}
                  >
                    {itemTitle(duplicate)}
                  </button>
                  . You can still save it again.
                </p>
              )}
            </>
          }
        >
          <input
            id="bm-url"
            type="text"
            inputMode="url"
            autoComplete="off"
            autoCapitalize="off"
            spellCheck={false}
            data-autofocus={(!item && !prefill?.url) || undefined}
            required
            placeholder="https://"
            value={url}
            aria-invalid={Boolean(urlError)}
            onChange={(e) => setUrl(e.target.value)}
            onBlur={() => url && setTouched(true)}
            className={inputClass}
          />
        </Field>

        <Field label="Title" htmlFor="bm-title">
          <input
            id="bm-title"
            value={title}
            maxLength={500}
            data-autofocus={(!item && Boolean(prefill?.url)) || undefined}
            placeholder={normalized ? domainOf(normalized) : 'Optional'}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Description" htmlFor="bm-desc">
          <textarea
            id="bm-desc"
            value={description}
            maxLength={1000}
            rows={3}
            placeholder="Why is this worth keeping? (optional)"
            onChange={(e) => setDescription(e.target.value)}
            className={cx(inputClass, 'resize-y')}
          />
        </Field>

        <Field label="Collection" htmlFor="bm-collection">
          <CollectionSelect id="bm-collection" value={collectionId} onChange={setCollectionId} />
        </Field>

        <Field label="Tags" htmlFor="bm-tags">
          <TagInput id="bm-tags" value={tags} onChange={setTags} />
        </Field>
      </div>

      <footer className="flex items-center gap-2 border-t border-line px-5 py-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
        {item && (
          <Button
            variant="ghost"
            className="text-danger hover:text-danger"
            onClick={async () => {
              onDone()
              await deleteItem(item)
            }}
          >
            Delete
          </Button>
        )}
        <span className="flex-1" />
        <span className="hidden items-center gap-1 text-xs text-muted md:flex">
          <Kbd>⌘</Kbd>
          <Kbd>↵</Kbd>
        </span>
        <Button onClick={onDone}>Cancel</Button>
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </Button>
      </footer>
    </form>
  )
}
