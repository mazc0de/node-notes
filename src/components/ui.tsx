import {
  useEffect,
  useId,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react'
import { MoreIcon } from './icons'

export function cx(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

// ─── Button ─────────────────────────────────────────────────────────────────

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const variants: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:brightness-105 active:brightness-95 shadow-sm',
  secondary: 'border border-line-strong bg-raised text-ink hover:bg-surface',
  ghost: 'text-ink-soft hover:bg-ink/5 hover:text-ink',
  danger: 'bg-danger text-paper hover:brightness-110',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  return (
    <button
      type="button"
      className={cx(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition disabled:pointer-events-none disabled:opacity-50',
        size === 'sm' ? 'h-8 px-2.5 text-sm' : 'h-10 px-4 text-[15px]',
        variants[variant],
        className,
      )}
      {...props}
    />
  )
}

export function IconButton({
  label,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cx(
        'inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-muted transition hover:bg-ink/5 hover:text-ink',
        className,
      )}
      {...props}
    />
  )
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-5 items-center justify-center rounded border border-line-strong bg-raised px-1 font-sans text-[11px] font-medium text-muted">
      {children}
    </kbd>
  )
}

// ─── Modal (native <dialog>: focus trap + Esc for free) ────────────────────

type ModalVariant = 'center' | 'sheet' | 'drawer' | 'palette'

const modalVariants: Record<ModalVariant, string> = {
  center: 'm-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl',
  palette: 'mx-auto mt-[12vh] mb-auto w-[min(36rem,calc(100vw-1.5rem))] rounded-2xl',
  sheet:
    'mt-auto mb-0 h-[92dvh] max-h-none w-full max-w-none rounded-t-2xl md:my-0 md:mr-0 md:ml-auto md:h-dvh md:w-[30rem] md:rounded-none md:rounded-l-2xl',
  drawer: 'my-0 mr-auto ml-0 h-dvh max-h-none w-[min(18rem,85vw)] rounded-r-2xl',
}

export function Modal({
  open,
  onClose,
  label,
  variant = 'center',
  children,
}: {
  open: boolean
  onClose: () => void
  label: string
  variant?: ModalVariant
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog) return
    if (open && !dialog.open) {
      dialog.showModal()
      // React's autoFocus runs before the dialog is shown, so focus the marked element now.
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-label={label}
      className={cx(
        'modal overflow-hidden border border-line bg-surface p-0 text-ink shadow-2xl',
        `modal-${variant}`,
        modalVariants[variant],
      )}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      onClick={(e) => {
        if (e.target === ref.current) onClose()
      }}
    >
      {open && children}
    </dialog>
  )
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  danger,
  busy,
  onConfirm,
  onClose,
  children,
}: {
  open: boolean
  title: string
  message: ReactNode
  confirmLabel: string
  danger?: boolean
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
  children?: ReactNode
}) {
  return (
    <Modal open={open} onClose={onClose} label={title}>
      <form
        className="p-6"
        onSubmit={(e) => {
          e.preventDefault()
          onConfirm()
        }}
      >
        <h2 className="font-serif text-xl font-medium">{title}</h2>
        <div className="mt-2 text-[15px] text-ink-soft">{message}</div>
        {children}
        <div className="mt-6 flex justify-end gap-2">
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant={danger ? 'danger' : 'primary'} disabled={busy} data-autofocus={!children || undefined}>
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  )
}

// ─── Dropdown menu ──────────────────────────────────────────────────────────

export interface MenuItem {
  label: string
  onSelect: () => void
  danger?: boolean
}

export function Menu({ label, items, className }: { label: string; items: MenuItem[]; className?: string }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const id = useId()

  useEffect(() => {
    if (!open) return
    listRef.current?.querySelector<HTMLButtonElement>('button')?.focus()
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open])

  return (
    <div ref={rootRef} className={cx('relative', className)}>
      <IconButton
        label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        onClick={(e) => {
          e.stopPropagation()
          setOpen((o) => !o)
        }}
      >
        <MoreIcon />
      </IconButton>
      {open && (
        <div
          ref={listRef}
          id={id}
          role="menu"
          className="absolute top-full right-0 z-30 mt-1 min-w-40 rounded-xl border border-line bg-raised p-1 shadow-lg"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])]
            const index = buttons.indexOf(document.activeElement as HTMLButtonElement)
            if (e.key === 'Escape') {
              e.preventDefault()
              e.stopPropagation()
              setOpen(false)
              rootRef.current?.querySelector('button')?.focus()
            } else if (e.key === 'ArrowDown') {
              e.preventDefault()
              buttons[(index + 1) % buttons.length]?.focus()
            } else if (e.key === 'ArrowUp') {
              e.preventDefault()
              buttons[(index - 1 + buttons.length) % buttons.length]?.focus()
            } else if (e.key === 'Tab') {
              setOpen(false)
            }
          }}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={cx(
                'flex w-full items-center rounded-lg px-3 py-2 text-left text-sm hover:bg-ink/5 focus-visible:bg-ink/5',
                item.danger ? 'text-danger' : 'text-ink',
              )}
              onClick={() => {
                setOpen(false)
                item.onSelect()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Form bits ──────────────────────────────────────────────────────────────

export const inputClass =
  'w-full rounded-lg border border-line-strong bg-raised px-3 py-2 text-[15px] text-ink placeholder:text-muted/80 focus:border-accent focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-accent/25'

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor?: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-ink-soft">
        {label}
      </label>
      {children}
      {hint}
    </div>
  )
}

export function Spinner({ label = 'Loading' }: { label?: string }) {
  return (
    <div role="status" className="flex items-center justify-center p-10 text-muted">
      <span className="size-5 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
      <span className="sr-only">{label}</span>
    </div>
  )
}
