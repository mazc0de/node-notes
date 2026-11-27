import type { Session, User } from '@supabase/supabase-js'
import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { isSupabaseConfigured, supabase } from '../lib/supabase'

interface AuthContextValue {
  session: Session | null
  user: User | null
  /** true until the stored session (if any) has been read */
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

const NEXT_KEY = 'node:next'

/** Remember where to go after signing in (e.g. back to /share with its params). */
export function rememberNext(path: string | null) {
  try {
    if (path && path.startsWith('/') && !path.startsWith('//')) localStorage.setItem(NEXT_KEY, path)
    else localStorage.removeItem(NEXT_KEY)
  } catch {
    /* storage unavailable */
  }
}

/** Non-destructive on purpose (StrictMode runs renders/effects twice); rememberNext() overwrites it on every sign-in. */
export function readNext(): string {
  try {
    const next = localStorage.getItem(NEXT_KEY)
    if (next && next.startsWith('/') && !next.startsWith('//')) return next
  } catch {
    /* storage unavailable */
  }
  return '/bookmarks'
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(isSupabaseConfigured)

  useEffect(() => {
    if (!isSupabaseConfigured) return
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next)
      setLoading(false)
      if (event === 'SIGNED_OUT') queryClient.clear()
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [queryClient])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      loading,
      signOut: async () => {
        await supabase.auth.signOut()
      },
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export function displayName(user: User | null): string {
  const meta = user?.user_metadata as { full_name?: string; name?: string } | undefined
  return meta?.full_name || meta?.name || user?.email?.split('@')[0] || ''
}
