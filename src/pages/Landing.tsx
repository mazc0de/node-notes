import { useState } from 'react'
import { Navigate, useSearchParams } from 'react-router'
import { useAccess } from '../auth/AccessProvider'
import { Button, inputClass } from '../components/ui'
import { isSupabaseConfigured } from '../lib/supabase'

function safeNext(next: string | null): string {
  return next?.startsWith('/') && !next.startsWith('//') ? next : '/bookmarks'
}

export function Landing() {
  const { unlocked } = useAccess()
  const [params] = useSearchParams()
  const next = safeNext(params.get('next'))

  if (unlocked) return <Navigate to={next} replace />

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-10 text-center">
          <img src="/favicon.svg" alt="" className="mx-auto mb-6 size-14 rounded-2xl shadow-sm" />
          <h1 className="font-serif text-5xl font-medium tracking-tight">Node</h1>
          <p className="mt-3 font-serif text-xl text-ink-soft italic">Your links and notes, kept in one quiet place.</p>
        </div>
        {isSupabaseConfigured ? <AccessCodeForm /> : <SetupNotice />}
      </div>
    </main>
  )
}

function AccessCodeForm() {
  const { unlock } = useAccess()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault()
        if (!unlock(code)) {
          setError('Wrong access code.')
          setCode('')
        }
      }}
    >
      <label htmlFor="access-code" className="sr-only">
        Access code
      </label>
      <input
        id="access-code"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        autoFocus
        required
        placeholder="Access code"
        value={code}
        onChange={(e) => {
          setCode(e.target.value)
          setError(null)
        }}
        className={`${inputClass} h-11 text-center tracking-[0.3em]`}
      />
      <Button type="submit" variant="primary" className="h-11 w-full">
        Enter
      </Button>
      {error && (
        <p role="alert" className="text-center text-sm text-danger">
          {error}
        </p>
      )}
    </form>
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
