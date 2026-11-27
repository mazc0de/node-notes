import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router'
import { Spinner } from '../components/ui'
import { useAuth } from './AuthProvider'

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!session) {
    // keep the full path + query so e.g. /share?url=… resumes after sign-in
    const next = `${location.pathname}${location.search}`
    return <Navigate to={`/?next=${encodeURIComponent(next)}`} replace />
  }
  return children
}
