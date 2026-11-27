import type { ReactNode } from 'react'
import { useSearchParams } from 'react-router'
import { plural, sortItems } from '../lib/display'
import { useItems } from '../lib/queries'
import type { ItemKind, ItemSummary, KindFilter, SortMode } from '../lib/types'
import { ItemRow } from './ItemRow'
import { Button, Spinner, cx } from './ui'

const KIND_TABS: { value: KindFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'bookmark', label: 'Bookmarks' },
  { value: 'note', label: 'Notes' },
]

/**
 * One list for every page: Bookmarks, Notes, a Collection or a Tag.
 * `filter` picks the Items; `fixedKind` hides the All / Bookmarks / Notes switch.
 */
export function ItemsView({
  title,
  eyebrow,
  filter,
  fixedKind,
  actions,
  empty,
}: {
  title: ReactNode
  eyebrow?: ReactNode
  filter: (item: ItemSummary) => boolean
  fixedKind?: ItemKind
  actions?: ReactNode
  empty: ReactNode
}) {
  const { data, isPending, isError, refetch } = useItems()
  const [params, setParams] = useSearchParams()
  const sort: SortMode = params.get('sort') === 'title' ? 'title' : 'recent'
  const kindParam = params.get('kind')
  const kind: KindFilter = fixedKind ?? (kindParam === 'bookmark' || kindParam === 'note' ? kindParam : 'all')

  const setParam = (key: string, value: string | null) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value) next.set(key, value)
        else next.delete(key)
        return next
      },
      { replace: true },
    )

  const scoped = (data ?? []).filter(filter)
  const visible = sortItems(
    scoped.filter((i) => kind === 'all' || i.kind === kind),
    sort,
  )

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 pb-28 md:px-8 md:pt-10">
      <header className="mb-5 flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="min-w-0 flex-1">
          {eyebrow && <p className="mb-1 text-sm text-muted">{eyebrow}</p>}
          <h1 className="font-serif text-3xl font-medium tracking-tight text-ink md:text-[2.15rem]">{title}</h1>
          {data && <p className="mt-1 text-sm text-muted">{plural(scoped.length, 'item')}</p>}
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>

      <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-line pb-3">
        {!fixedKind && (
          <div role="tablist" aria-label="Show" className="flex rounded-lg bg-ink/5 p-0.5">
            {KIND_TABS.map((tab) => (
              <button
                key={tab.value}
                type="button"
                role="tab"
                aria-selected={kind === tab.value}
                onClick={() => setParam('kind', tab.value === 'all' ? null : tab.value)}
                className={cx(
                  'rounded-md px-3 py-1 text-sm font-medium transition',
                  kind === tab.value ? 'bg-raised text-ink shadow-sm' : 'text-muted hover:text-ink',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        <span className="flex-1" />
        <label className="flex items-center gap-2 text-sm text-muted">
          <span className="sr-only md:not-sr-only">Sort</span>
          <select
            value={sort}
            onChange={(e) => setParam('sort', e.target.value === 'title' ? 'title' : null)}
            className="rounded-lg border border-line bg-transparent py-1 pr-1 pl-2 text-sm text-ink"
          >
            <option value="recent">Newest first</option>
            <option value="title">Title A–Z</option>
          </select>
        </label>
      </div>

      {isPending ? (
        <Spinner />
      ) : isError ? (
        <div className="py-12 text-center text-ink-soft">
          <p>Couldn't load your library.</p>
          <Button className="mt-3" onClick={() => void refetch()}>
            Try again
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <div className="py-16 text-center text-ink-soft">{empty}</div>
      ) : (
        <ul className="-mx-3 md:-mx-4">
          {visible.map((item) => (
            <ItemRow key={item.id} item={item} showKind={!fixedKind} />
          ))}
        </ul>
      )}
    </div>
  )
}
