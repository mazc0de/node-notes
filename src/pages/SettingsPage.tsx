import { useState } from 'react'
import { displayName, useAuth } from '../auth/AuthProvider'
import { useToast } from '../components/Toast'
import { Button, ConfirmDialog, Field, cx, inputClass } from '../components/ui'
import { deleteMyAccount } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useTheme, type Theme } from '../theme/ThemeProvider'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

export function SettingsPage() {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const { toast } = useToast()
  const [name, setName] = useState(() => displayName(user))
  const [savingName, setSavingName] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const saveName = async () => {
    setSavingName(true)
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } })
    setSavingName(false)
    toast({ message: error ? `Couldn't save: ${error.message}` : 'Name saved', duration: 2500 })
  }

  const deleteAccount = async () => {
    if (confirmText.trim().toLowerCase() !== 'delete') return
    setDeleting(true)
    try {
      await deleteMyAccount()
      await supabase.auth.signOut({ scope: 'local' })
    } catch (e) {
      setDeleting(false)
      toast({ message: `Couldn't delete account: ${(e as Error).message}` })
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-24 md:px-8 md:pt-10">
      <h1 className="font-serif text-3xl font-medium tracking-tight md:text-[2.15rem]">Settings</h1>

      <section className="mt-8 space-y-4 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-serif text-xl font-medium">Profile</h2>
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            void saveName()
          }}
        >
          <div className="min-w-56 flex-1">
            <Field label="Name" htmlFor="name">
              <input id="name" value={name} maxLength={100} onChange={(e) => setName(e.target.value)} className={inputClass} />
            </Field>
          </div>
          <Button type="submit" disabled={savingName || name.trim() === displayName(user)}>
            {savingName ? 'Saving…' : 'Save'}
          </Button>
        </form>
        <p className="text-sm text-muted">
          Signed in as <span className="text-ink-soft">{user?.email}</span>
        </p>
      </section>

      <section className="mt-5 rounded-2xl border border-line bg-surface p-5">
        <h2 className="font-serif text-xl font-medium">Appearance</h2>
        <div role="radiogroup" aria-label="Theme" className="mt-4 flex rounded-lg bg-ink/5 p-0.5 sm:w-fit">
          {THEMES.map((t) => (
            <button
              key={t.value}
              type="button"
              role="radio"
              aria-checked={theme === t.value}
              onClick={() => setTheme(t.value)}
              className={cx(
                'flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition',
                theme === t.value ? 'bg-raised text-ink shadow-sm' : 'text-muted hover:text-ink',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-5">
        <div>
          <h2 className="font-serif text-xl font-medium">Session</h2>
          <p className="text-sm text-muted">Sign out on this device.</p>
        </div>
        <Button onClick={() => void signOut()}>Log out</Button>
      </section>

      <section className="mt-5 rounded-2xl border border-danger/40 p-5">
        <h2 className="font-serif text-xl font-medium text-danger">Delete account</h2>
        <p className="mt-1 text-[15px] text-ink-soft">
          Permanently deletes your account and every Bookmark, Note, Collection and Tag. This can't be undone.
        </p>
        <Button variant="danger" className="mt-4" onClick={() => setConfirming(true)}>
          Delete account…
        </Button>
      </section>

      <ConfirmDialog
        open={confirming}
        title="Delete your account?"
        message="All of your data will be deleted immediately and permanently."
        confirmLabel={deleting ? 'Deleting…' : 'Delete everything'}
        danger
        busy={deleting || confirmText.trim().toLowerCase() !== 'delete'}
        onConfirm={() => void deleteAccount()}
        onClose={() => {
          setConfirming(false)
          setConfirmText('')
        }}
      >
        <div className="mt-4">
          <Field label='Type "delete" to confirm' htmlFor="confirm-delete">
            <input
              id="confirm-delete"
              data-autofocus
              autoComplete="off"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>
      </ConfirmDialog>
    </div>
  )
}
