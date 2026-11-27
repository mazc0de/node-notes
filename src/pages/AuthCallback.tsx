import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { readNext, rememberNext, useAuth } from '../auth/AuthProvider'
import { Spinner } from '../components/ui'

/** supabase-js exchanges the OAuth / magic-link code by itself (detectSessionInUrl); we just wait for it. */
export function AuthCallback() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const [error] = useState(() => {
    const search = new URLSearchParams(window.location.search)
    const hash = new URLSearchParams(window.location.hash.slice(1))
    return search.get('error_description') ?? hash.get('error_description')
  })
  const [timedOut, setTimedOut] = useState(false)
  // Read once, then clear so a later visit can't replay an old destination (e.g. a past share).
  const [next] = useState(readNext)
  useEffect(() => rememberNext(null), [])

  useEffect(() => {
    if (session) navigate(next, { replace: true })
  }, [session, navigate, next])

  useEffect(() => {
    const t = window.setTimeout(() => setTimedOut(true), 10_000)
    return () => window.clearTimeout(t)
  }, [])

  if (error || (timedOut && !session && !loading)) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-5">
        <div className="max-w-sm text-center">
          <h1 className="font-serif text-2xl font-medium">Couldn't sign you in</h1>
          <p className="mt-2 text-ink-soft">
            {error ?? 'The sign-in link may have expired or was opened in a different browser.'}
          </p>
          <Link to="/" className="mt-5 inline-block font-medium text-accent underline underline-offset-2">
            Back to sign in
          </Link>
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-h-dvh items-center justify-center">
      <Spinner label="Signing you in" />
    </main>
  )
}
