import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

/** False when the env vars are missing — the app then shows setup instructions instead of crashing. */
export const isSupabaseConfigured = Boolean(url && key)

/** No Supabase Auth: every request runs as the `anon` role (access is gated by the access code in the UI). */
export const supabase = createClient(url ?? 'http://localhost:54321', key ?? 'missing-key', {
  auth: {
    detectSessionInUrl: false,
    persistSession: false,
    autoRefreshToken: false,
  },
})
