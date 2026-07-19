import { Edit, Lock, LogOut } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ThemeToggle from '@shared/components/ThemeToggle'
import { useAuth } from '@shared/hooks/useAuth'

const AdminHeader = () => {
  const { owner, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const passwordChangeRequired = owner?.mustChangePassword === true

  const handleLogout = async () => {
    await logout()
    navigate('/login', { replace: true })
  }

  if (location.pathname === '/write') {
    return null
  }

  return (
    <header className="admin-topbar sticky top-0 z-50 w-full border-b border-slate-200/70 bg-[rgba(243,246,250,0.88)] backdrop-blur-xl dark:border-slate-800/80 dark:bg-[rgba(11,17,27,0.9)]">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="mx-auto flex h-[4.5rem] max-w-[72rem] items-center justify-between gap-4">
          <Link to="/" className="inline-flex min-h-11 items-center gap-2.5 rounded-lg pr-3 text-slate-800 outline-none transition-colors hover:text-brand-blue focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-slate-100" aria-label="后台管理首页">
            <span className="h-5 w-0.5 bg-brand-blue" aria-hidden />
            <span className="utility-type text-[11px] font-bold tracking-[0.2em]">LOG / CONTROL</span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!passwordChangeRequired && (
              <>
                {location.pathname !== '/write' && (
                  <Link to="/write" className="hidden min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white/70 px-3 text-sm font-semibold text-slate-700 transition-colors hover:border-brand-blue hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue sm:inline-flex dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                    <Edit className="h-4 w-4" aria-hidden />
                    写文章
                  </Link>
                )}
                <Link to="/password" className="flex h-11 w-11 items-center justify-center rounded-xl border border-transparent text-slate-500 hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-slate-400" aria-label="修改密码">
                  <Lock className="h-4 w-4" aria-hidden />
                </Link>
                <button type="button" onClick={handleLogout} className="flex h-11 w-11 items-center justify-center rounded-xl border border-transparent text-slate-500 hover:text-red-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 dark:text-slate-400" aria-label="退出登录">
                  <LogOut className="h-4 w-4" aria-hidden />
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

export default AdminHeader
