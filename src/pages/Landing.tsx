import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { rememberNext, useAuth } from '../auth/AuthProvider'
import { Button, Spinner, inputClass } from '../components/ui'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

function callbackUrl() {
  return `${window.location.origin}/auth/callback`
}

export function Landing() {
  const { session, loading } = useAuth()
  const [params] = useSearchParams()
  const next = params.get('next')

  if (loading) return <Spinner />
  if (session) return <Navigate to={next?.startsWith('/') && !next.startsWith('//') ? next : '/bookmarks'} replace />

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <img src="/favicon.svg" alt="" className="mx-auto mb-6 size-14 rounded-2xl shadow-sm" />
          <h1 className="font-serif text-5xl font-medium tracking-tight">Node</h1>
          <p className="mt-3 font-serif text-xl text-ink-soft italic">Your links and notes, kept in one quiet place.</p>
        </div>
        {isSupabaseConfigured ? <SignIn next={next} /> : <SetupNotice />}
      </div>
    </main>
  )
}

function SignIn({ next }: { next: string | null }) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle')
  const [error, setError] = useState<string | null>(null)

  const google = async () => {
    setError(null)
    rememberNext(next)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callbackUrl() },
    })
    if (error) setError(error.message)
  }

  const magicLink = async () => {
    setError(null)
    setStatus('sending')
    rememberNext(next)
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: callbackUrl() },
    })
    if (error) {
      setError(error.message)
      setStatus('idle')
    } else setStatus('sent')
  }

  if (status === 'sent') {
    return (
      <div className="rounded-2xl border border-line bg-surface p-6 text-center">
        <h2 className="font-serif text-xl font-medium">Check your inbox</h2>
        <p className="mt-2 text-[15px] text-ink-soft">
          We sent a sign-in link to <strong className="font-semibold text-ink">{email.trim()}</strong>. Open it in
          this browser to continue.
        </p>
        <Button variant="ghost" className="mt-4" onClick={() => setStatus('idle')}>
          Use a different email
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <Button variant="primary" className="h-11 w-full" onClick={() => void google()}>
        <GoogleMark /> Continue with Google
      </Button>

      <div className="flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault()
          void magicLink()
        }}
      >
        <label htmlFor="email" className="sr-only">
          Email
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={`${inputClass} h-11`}
        />
        <Button type="submit" className="h-11 w-full" disabled={status === 'sending'}>
          {status === 'sending' ? 'Sending…' : 'Email me a sign-in link'}
        </Button>
      </form>

      {error && (
        <p role="alert" className="text-center text-sm text-danger">
          {error}
        </p>
      )}
      <p className="text-center text-xs text-muted">No password needed. Your library is private to you.</p>
    </div>
  )
}

function SetupNotice() {
  return (
    <div className="rounded-2xl border border-line bg-surface p-5 text-[15px] text-ink-soft">
      <p className="font-medium text-ink">Supabase isn't configured yet.</p>
      <p className="mt-2">
        Copy <code className="rounded bg-ink/5 px-1">.env.example</code> to{' '}
        <code className="rounded bg-ink/5 px-1">.env.local</code>, fill in your project URL and publishable key, then
        restart the dev server.
      </p>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.1 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.2-.1-2.4-.4-3.5z" />
    </svg>
  )
}
