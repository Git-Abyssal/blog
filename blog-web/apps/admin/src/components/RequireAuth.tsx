import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@shared/hooks/useAuth'

interface RequireAuthProps {
  children: React.ReactNode
}

/**
 * Wraps protected admin routes. Redirects to /login when not authenticated.
 * Passes current path in state so Login can redirect back after sign-in.
 */
const RequireAuth: React.FC<RequireAuthProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center" role="status" aria-busy="true">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" aria-hidden />
        <span className="sr-only">正在验证登录状态</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: `${location.pathname}${location.search}` }} replace />
  }

  return <>{children}</>
}

export default RequireAuth
