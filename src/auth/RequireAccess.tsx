import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAccess } from './AccessProvider'

export function RequireAccess({ children }: { children: ReactNode }) {
  const { unlocked } = useAccess()
  const location = useLocation()

  if (!unlocked) {
    // keep the full path + query so e.g. /share?url=… resumes after unlocking
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/?next=${encodeURIComponent(next)}`} replace />
  }
  return children
}
