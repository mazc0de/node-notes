import { Navigate, useSearchParams } from 'react-router'
import { findUrlInText, normalizeUrlInput } from '../lib/url'

/**
 * PWA share target (GET /share?title=&text=&url=).
 * A link → new Bookmark form; only text → new Note. Sign-in is handled by RequireAuth,
 * which returns here with the same params.
 */
export function SharePage() {
  const [params] = useSearchParams()
  const title = params.get('title')?.trim() || null
  const text = params.get('text')?.trim() || null
  const rawUrl = params.get('url')?.trim() || findUrlInText(text)
  const url = rawUrl ? normalizeUrlInput(rawUrl) : null

  if (url) {
    const next = new URLSearchParams({ b: 'new', bu: url })
    if (title) next.set('bt', title)
    return <Navigate to={`/bookmarks?${next}`} replace />
  }

  if (text || title) {
    const next = new URLSearchParams()
    if (text) next.set('text', text)
    if (title) next.set('title', title)
    return <Navigate to={`/notes/new?${next}`} replace />
  }

  return <Navigate to="/bookmarks" replace />
}
