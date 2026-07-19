import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@shared/hooks/useAuth'

const PasswordChangeGate = ({ children }: { children: ReactNode }) => {
  const { owner, loading } = useAuth()
  const location = useLocation()

  if (!loading && owner?.mustChangePassword && location.pathname !== '/password') {
    return <Navigate to="/password" replace />
  }

  return <>{children}</>
}

export default PasswordChangeGate
