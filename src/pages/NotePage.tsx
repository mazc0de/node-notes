import { useQuery, useQueryClient } from '@tanstack/react-query'
import Placeholder from '@tiptap/extension-placeholder'
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { CollectionSelect } from '../components/CollectionSelect'
import { PinIcon } from '../components/icons'
import { TagInput } from '../components/TagInput'
import { Button, IconButton, Spinner, cx } from '../components/ui'
import { createNote, fetchNote, setItemTags, updateNote } from '../lib/api'
import { keys, useDeleteItem } from '../lib/queries'
import type { ItemSummary, NoteFull } from '../lib/types'

const AUTOSAVE_MS = 1000

/**
 * `/notes/new` and `/notes/:id` share one editor. When a new note is first saved the URL is
 * replaced with its id; `sessionKey` (passed in location state) keeps the editor mounted.
 */
export default function NotePage() {
  const { id = 'new' } = useParams()
  const location = useLocation()
  const sessionKey = (location.state as { sessionKey?: string } | null)?.sessionKey ?? `${id}:${location.key}`
  return <NoteLoader key={sessionKey} id={id} sessionKey={sessionKey} />
}

function NoteLoader({ id, sessionKey }: { id: string; sessionKey: string }) {
  const [initialId] = useState(id)
  const [params] = useSearchParams()
  const isNew = initialId === 'new'

  const note = useQuery({
    queryKey: keys.note(initialId),
    queryFn: () => fetchNote(initialId),
    enabled: !isNew,
    gcTime: 0,
    refetchOnWindowFocus: false,
  })

  if (isNew) {
    return (
      <NoteEditor
        initial={null}
        sessionKey={sessionKey}
        prefill={{
          text: params.get('text'),
          title: params.get('title'),
          collectionId: params.get('collection'),
        }}
      />
    )
  }
  if (note.isPending) return <Spinner />
  if (note.isError) {
    return (
      <div className="px-6 py-24 text-center">
        <p className="text-ink-soft">Couldn't load this note.</p>
        <Button className="mt-3" onClick={() => void note.refetch()}>
          Try again
        </Button>
      </div>
    )
  }
  if (!note.data) {
    return (
      <div className="px-6 py-24 text-center">
        <h1 className="font-serif text-2xl font-medium">This note doesn't exist</h1>
        <Link to="/notes" className="mt-4 inline-block font-medium text-accent underline underline-offset-2">
          Back to Notes
        </Link>
      </div>
    )
  }
  return <NoteEditor initial={note.data} sessionKey={sessionKey} />
}

function textToDoc(text: string): JSONContent {
  return {
    type: 'doc',
    content: text
      .split('\n')
      .map((line) => (line ? { type: 'paragraph', content: [{ type: 'text', text: line }] } : { type: 'paragraph' })),
  }
}

type SaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

const STATUS_LABEL: Record<SaveStatus, string> = {
  idle: '',
  pending: 'Editing…',
  saving: 'Saving…',
  saved: 'Saved',
  error: "Couldn't save — retrying",
}

const tagsKey = (tags: string[]) => JSON.stringify([...tags].sort())

function NoteEditor({
  initial,
  sessionKey,
  prefill,
}: {
  initial: NoteFull | null
  sessionKey: string
  prefill?: { text: string | null; title: string | null; collectionId: string | null }
}) {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const deleteItem = useDeleteItem()

  const [title, setTitle] = useState(initial?.title ?? prefill?.title ?? '')
  const [collectionId, setCollectionId] = useState<string | null>(initial?.collection_id ?? prefill?.collectionId ?? null)
  const [tags, setTags] = useState<string[]>(initial?.tags.map((t) => t.name) ?? [])
  const [pinned, setPinned] = useState(initial?.pinned ?? false)
  const [status, setStatus] = useState<SaveStatus>(initial ? 'saved' : 'idle')

  const idRef = useRef<string | null>(initial?.id ?? null)
  const savedTagsRef = useRef(tagsKey(initial?.tags.map((t) => t.name) ?? []))
  const dirtyRef = useRef(false)
  const inflightRef = useRef(false)
  const againRef = useRef(false)
  const deletedRef = useRef(false)
  const mountedRef = useRef(true)
  const timerRef = useRef<number | undefined>(undefined)

  // The latest field values, read by the (async) save function.
  const fieldsRef = useRef({ title, collectionId, tags, pinned })
  useLayoutEffect(() => {
    fieldsRef.current = { title, collectionId, tags, pinned }
  })

  const flushRef = useRef<() => Promise<void>>(async () => {})
  const scheduleSave = useCallback(() => {
    dirtyRef.current = true
    setStatus('pending')
    window.clearTimeout(timerRef.current)
    timerRef.current = window.setTimeout(() => void flushRef.current(), AUTOSAVE_MS)
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: '_blank' } },
      }),
      Placeholder.configure({ placeholder: 'Start writing…' }),
    ],
    content: initial?.body ?? (prefill?.text ? textToDoc(prefill.text) : ''),
    autofocus: initial ? false : prefill?.title || !prefill?.text ? false : 'end',
    immediatelyRender: true,
    shouldRerenderOnTransaction: false,
    editorProps: { attributes: { 'aria-label': 'Note body', class: 'focus:outline-none' } },
    onUpdate: () => scheduleSave(),
  })

  const flush = async () => {
    window.clearTimeout(timerRef.current)
    if (!editor || deletedRef.current) return
    if (inflightRef.current) {
      againRef.current = true
      return
    }
    if (!dirtyRef.current) return

    inflightRef.current = true
    dirtyRef.current = false
    if (mountedRef.current) setStatus('saving')

    const fields = fieldsRef.current
    const body = editor.getJSON()
    const body_text = editor.getText({ blockSeparator: '\n' }).trim()
    const input = {
      title: fields.title.trim() || null,
      body,
      body_text,
      collection_id: fields.collectionId,
      pinned: fields.pinned,
    }
    const nextTagsKey = tagsKey(fields.tags)
    const tagsChanged = nextTagsKey !== savedTagsRef.current

    try {
      let id = idRef.current
      if (!id) {
        // Don't create empty notes.
        if (!input.title && !body_text && fields.tags.length === 0) {
          if (mountedRef.current) setStatus('idle')
          return
        }
        id = await createNote(input)
        idRef.current = id
      } else {
        await updateNote(id, input)
      }
      if (tagsChanged) {
        await setItemTags(id, fields.tags)
        savedTagsRef.current = nextTagsKey
      }

      // Keep the list cache in step without refetching the whole library on every keystroke.
      const createdNow = !initial && !qc.getQueryData<ItemSummary[]>(keys.items)?.some((i) => i.id === id)
      if (createdNow || tagsChanged) {
        void qc.invalidateQueries({ queryKey: keys.items })
        if (tagsChanged) void qc.invalidateQueries({ queryKey: keys.tags })
      } else {
        qc.setQueryData<ItemSummary[]>(keys.items, (list) =>
          list?.map((i) =>
            i.id === id
              ? {
                  ...i,
                  title: input.title,
                  excerpt: body_text.slice(0, 280),
                  collection_id: input.collection_id,
                  pinned: input.pinned,
                  updated_at: new Date().toISOString(),
                }
              : i,
          ),
        )
      }
      if (mountedRef.current) {
        if (window.location.pathname === '/notes/new') {
          navigate(`/notes/${id}`, { replace: true, state: { sessionKey } })
        }
        setStatus(dirtyRef.current ? 'pending' : 'saved')
      }
    } catch {
      dirtyRef.current = true
      if (mountedRef.current) {
        setStatus('error')
        timerRef.current = window.setTimeout(() => void flushRef.current(), 3000)
      }
    } finally {
      inflightRef.current = false
      if (againRef.current) {
        againRef.current = false
        void flushRef.current()
      }
    }
  }

  useLayoutEffect(() => {
    flushRef.current = flush
  })

  // New note from share text: save right away so it isn't lost.
  useEffect(() => {
    if (!initial && (prefill?.text || prefill?.title)) scheduleSave()
  }, [])

  // Save on leave; warn if the tab is closed with unsaved changes.
  useEffect(() => {
    mountedRef.current = true
    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current || inflightRef.current) {
        void flushRef.current()
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => {
      window.removeEventListener('beforeunload', beforeUnload)
      mountedRef.current = false
      if (dirtyRef.current) void flushRef.current()
    }
  }, [])

  const update = <T,>(setter: (v: T) => void) => (value: T) => {
    setter(value)
    scheduleSave()
  }

  const remove = async () => {
    const id = idRef.current
    deletedRef.current = true
    dirtyRef.current = false
    window.clearTimeout(timerRef.current)
    if (!id) return navigate('/notes')
    const ok = await deleteItem({
      id,
      kind: 'note',
      title: title.trim() || null,
      url: null,
      excerpt: editor?.getText({ blockSeparator: '\n' }).slice(0, 280) ?? null,
    })
    if (ok) navigate('/notes', { replace: true })
    else deletedRef.current = false
  }

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-4 pb-32 md:px-8 md:pt-8">
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Link to="/notes" className="text-sm text-muted hover:text-ink">
          ← Notes
        </Link>
        <span className="flex-1" />
        <span aria-live="polite" className={cx('text-sm', status === 'error' ? 'text-danger' : 'text-muted')}>
          {STATUS_LABEL[status]}
        </span>
        <IconButton
          label={pinned ? 'Unpin' : 'Pin'}
          aria-pressed={pinned}
          className={cx(pinned && 'text-accent')}
          onClick={() => update(setPinned)(!pinned)}
        >
          <PinIcon fill={pinned ? 'currentColor' : 'none'} />
        </IconButton>
        <Button variant="ghost" size="sm" className="text-danger hover:text-danger" onClick={() => void remove()}>
          Delete
        </Button>
      </div>

      <textarea
        rows={1}
        value={title}
        maxLength={500}
        aria-label="Title"
        placeholder={initial || title ? 'Untitled' : 'Title (optional)'}
        autoFocus={!initial && !prefill?.text}
        onChange={(e) => update(setTitle)(e.target.value.replace(/\n/g, ' '))}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || (e.key === 'ArrowDown' && !e.shiftKey)) {
            e.preventDefault()
            editor?.commands.focus('start')
          }
        }}
        className="field-sizing-content w-full resize-none bg-transparent font-serif text-3xl leading-tight font-medium tracking-tight text-ink outline-none placeholder:text-muted/60 focus-visible:outline-none md:text-4xl"
      />

      <div className="mt-3 mb-6 grid gap-3 border-y border-line py-3 sm:grid-cols-[minmax(0,14rem)_1fr]">
        <CollectionSelect value={collectionId} onChange={update(setCollectionId)} className="h-10 py-1.5 text-sm" />
        <TagInput value={tags} onChange={update(setTags)} />
      </div>

      <EditorContent editor={editor} className="note-body" />
    </div>
  )
}
