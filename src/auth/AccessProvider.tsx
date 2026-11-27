import { useQueryClient } from '@tanstack/react-query'
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react'

/** Hardcoded on purpose: it only hides the UI — anyone with the publishable key can still reach the data. */
const ACCESS_CODE = '3105'
const UNLOCK_KEY = 'node:unlocked'

interface AccessContextValue {
  unlocked: boolean
  /** Returns false when the code is wrong. */
  unlock: (code: string) => boolean
  lock: () => void
}

const AccessContext = createContext<AccessContextValue | null>(null)

function readUnlocked(): boolean {
  try {
    return localStorage.getItem(UNLOCK_KEY) === '1'
  } catch {
    return false
  }
}

function writeUnlocked(value: boolean) {
  try {
    if (value) localStorage.setItem(UNLOCK_KEY, '1')
    else localStorage.removeItem(UNLOCK_KEY)
  } catch {
    /* storage unavailable — stays unlocked for this tab only */
  }
}

export function AccessProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [unlocked, setUnlocked] = useState(readUnlocked)

  const value = useMemo<AccessContextValue>(
    () => ({
      unlocked,
      unlock: (code) => {
        if (code.trim() !== ACCESS_CODE) return false
        writeUnlocked(true)
        setUnlocked(true)
        return true
      },
      lock: () => {
        writeUnlocked(false)
        setUnlocked(false)
        queryClient.clear()
      },
    }),
    [unlocked, queryClient],
  )

  return <AccessContext.Provider value={value}>{children}</AccessContext.Provider>
}

export function useAccess(): AccessContextValue {
  const ctx = useContext(AccessContext)
  if (!ctx) throw new Error('useAccess must be used inside <AccessProvider>')
  return ctx
}
