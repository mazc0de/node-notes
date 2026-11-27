import { useAccess } from '../auth/AccessProvider'
import { Button, cx } from '../components/ui'
import { useTheme, type Theme } from '../theme/ThemeProvider'

const THEMES: { value: Theme; label: string }[] = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
  { value: 'system', label: 'System' },
]

export function SettingsPage() {
  const { lock } = useAccess()
  const { theme, setTheme } = useTheme()

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-6 pb-24 md:px-8 md:pt-10">
      <h1 className="font-serif text-3xl font-medium tracking-tight md:text-[2.15rem]">Settings</h1>

      <section className="mt-8 rounded-2xl border border-line bg-surface p-5">
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
          <p className="text-sm text-muted">Lock the app on this device. You'll need the access code again.</p>
        </div>
        <Button onClick={lock}>Lock</Button>
      </section>
    </div>
  )
}
