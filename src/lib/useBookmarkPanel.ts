import { useCallback } from 'react'
import { useSearchParams } from 'react-router'

/**
 * The Bookmark panel lives in the URL (`?b=new` or `?b=<id>`) so it opens over any page,
 * survives a reload, and the share target can deep-link into it (`bu` = url, `bt` = title).
 */
export function useBookmarkPanel() {
  const [params, setParams] = useSearchParams()

  const update = useCallback(
    (fn: (p: URLSearchParams) => void) =>
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete('b')
          next.delete('bu')
          next.delete('bt')
          fn(next)
          return next
        },
        { replace: true },
      ),
    [setParams],
  )

  const openNew = useCallback(
    (prefill?: { url?: string | null; title?: string | null }) =>
      update((p) => {
        p.set('b', 'new')
        if (prefill?.url) p.set('bu', prefill.url)
        if (prefill?.title) p.set('bt', prefill.title)
      }),
    [update],
  )

  const openItem = useCallback((id: string) => update((p) => p.set('b', id)), [update])
  const close = useCallback(() => update(() => {}), [update])

  return {
    target: params.get('b'),
    prefill: { url: params.get('bu'), title: params.get('bt') },
    openNew,
    openItem,
    close,
  }
}
