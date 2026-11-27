import { useEffect, useId, useMemo, useRef, useState } from 'react'
import { normalizeTag } from '../lib/display'
import { useTags } from '../lib/queries'
import { cx } from './ui'
import { CloseIcon } from './icons'

/** Tags are created as you type: Enter or comma adds one, Backspace on empty removes the last. */
export function TagInput({ value, onChange, id }: { value: string[]; onChange: (tags: string[]) => void; id?: string }) {
  const { data: allTags = [] } = useTags()
  const [draft, setDraft] = useState('')
  const [active, setActive] = useState(0)
  const [focused, setFocused] = useState(false)
  const listId = useId()

  const query = normalizeTag(draft)
  const suggestions = useMemo(() => {
    if (!query) return []
    return allTags
      .map((t) => t.name)
      .filter((name) => name.includes(query) && !value.includes(name))
      .sort((a, b) => Number(!a.startsWith(query)) - Number(!b.startsWith(query)) || a.localeCompare(b))
      .slice(0, 6)
  }, [allTags, query, value])

  const add = (raw: string) => {
    const tag = normalizeTag(raw)
    if (tag && !value.includes(tag)) onChange([...value, tag])
    setDraft('')
    setActive(0)
  }

  const showList = focused && suggestions.length > 0
  const listRef = useRef<HTMLUListElement>(null)
  useEffect(() => {
    if (showList) listRef.current?.scrollIntoView({ block: 'nearest' })
  }, [showList])

  return (
    <div className="relative">
      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-line-strong bg-raised px-2 py-1.5 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/25">
        {value.map((tag) => (
          <span key={tag} className="inline-flex items-center gap-1 rounded-md bg-accent-soft/60 py-0.5 pr-1 pl-2 text-sm text-ink dark:bg-ink/10">
            {tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              className="rounded p-0.5 text-muted hover:text-ink"
              onClick={() => onChange(value.filter((t) => t !== tag))}
            >
              <CloseIcon size={12} />
            </button>
          </span>
        ))}
        <input
          id={id}
          value={draft}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder={value.length ? '' : 'Add tags…'}
          className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-[15px] outline-none placeholder:text-muted/80 focus-visible:outline-none"
          onFocus={() => setFocused(true)}
          onBlur={() => {
            setFocused(false)
            if (draft.trim()) add(draft)
          }}
          onChange={(e) => {
            const next = e.target.value
            if (next.endsWith(',')) add(next.slice(0, -1))
            else {
              setDraft(next)
              setActive(0)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              if (!draft.trim()) return
              e.preventDefault()
              add(showList ? suggestions[active] : draft)
            } else if (e.key === 'Backspace' && !draft && value.length) {
              onChange(value.slice(0, -1))
            } else if (e.key === 'ArrowDown' && showList) {
              e.preventDefault()
              setActive((a) => (a + 1) % suggestions.length)
            } else if (e.key === 'ArrowUp' && showList) {
              e.preventDefault()
              setActive((a) => (a - 1 + suggestions.length) % suggestions.length)
            } else if (e.key === 'Tab' && showList && draft.trim()) {
              e.preventDefault()
              add(suggestions[active])
            }
          }}
        />
      </div>
      {showList && (
        <ul ref={listRef} id={listId} role="listbox" className="absolute top-full right-0 left-0 z-20 mt-1 rounded-xl border border-line bg-raised p-1 shadow-lg">
          {suggestions.map((name, i) => (
            <li
              key={name}
              role="option"
              aria-selected={i === active}
              className={cx('cursor-pointer rounded-lg px-3 py-1.5 text-sm', i === active && 'bg-ink/5')}
              onPointerDown={(e) => {
                e.preventDefault()
                add(name)
              }}
            >
              {name}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
