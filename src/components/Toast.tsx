import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react'

interface ToastOptions {
  message: string
  actionLabel?: string
  onAction?: () => void
  /** ms; defaults to 5000 */
  duration?: number
}

interface ToastEntry extends ToastOptions {
  id: number
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastEntry[]>([])
  const nextId = useRef(1)

  const dismiss = useCallback((id: number) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback(
    (options: ToastOptions) => {
      const id = nextId.current++
      // keep at most three on screen
      setToasts((list) => [...list.slice(-2), { ...options, id }])
      window.setTimeout(() => dismiss(id), options.duration ?? 5000)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toast }), [toast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className="toast-in pointer-events-auto flex max-w-md items-center gap-4 rounded-xl bg-ink px-4 py-3 text-sm text-paper shadow-lg"
          >
            <span className="min-w-0 flex-1">{t.message}</span>
            {t.actionLabel && t.onAction && (
              <button
                type="button"
                className="shrink-0 rounded-md px-2 py-1 font-semibold text-accent-soft underline-offset-2 hover:underline"
                onClick={() => {
                  dismiss(t.id)
                  t.onAction?.()
                }}
              >
                {t.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
