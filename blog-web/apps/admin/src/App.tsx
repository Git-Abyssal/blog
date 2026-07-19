import React, { Suspense } from 'react'
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { ErrorBoundary } from '@shared/components/ErrorBoundary'
import { AuthProvider } from '@shared/hooks/useAuth'
import { DarkModeProvider } from '@shared/hooks/useDarkMode'
import { ToastProvider } from '@shared/hooks/useToast'
import { ApiProvider } from '@shared/lib/api'
import AdminHeader from './components/AdminHeader'
import PasswordChangeGate from './components/PasswordChangeGate'
import RequireAuth from './components/RequireAuth'
import Login from './pages/Login'

const AdminArticles = React.lazy(() => import('./pages/AdminArticles'))
const AdminCategories = React.lazy(() => import('./pages/AdminCategories'))
const AdminComments = React.lazy(() => import('./pages/AdminComments'))
const AdminLayout = React.lazy(() => import('./pages/AdminLayout'))
const AdminTags = React.lazy(() => import('./pages/AdminTags'))
const ChangePassword = React.lazy(() => import('./pages/ChangePassword'))
const Write = React.lazy(() => import('./pages/Write'))

const PageLoader = () => (
  <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-slate-600 dark:text-slate-400" role="status">
    <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-brand-blue dark:border-slate-700 dark:border-t-blue-300" aria-hidden />
    <span>正在加载页面…</span>
  </div>
)

const AdminShell = () => (
  <div className="admin-shell page-bg-pattern flex min-h-screen flex-col bg-[var(--page-bg)] transition-colors">
    <a
      href="#main-content"
      className="fixed left-4 top-2 z-[200] inline-flex min-h-11 -translate-y-16 items-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 dark:bg-white dark:text-slate-950"
    >
      跳到主要内容
    </a>
    <AdminHeader />
    <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6">
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </ErrorBoundary>
    </main>
  </div>
)

function App() {
  return (
    <ApiProvider>
      <AuthProvider>
        <ToastProvider>
          <DarkModeProvider>
            <BrowserRouter basename="/admin" future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <PasswordChangeGate>
                <Routes>
                  <Route path="/login" element={<Login />} />
                  <Route path="/password" element={<RequireAuth><AdminShell /></RequireAuth>}>
                    <Route index element={<ChangePassword />} />
                  </Route>
                  <Route path="/" element={<RequireAuth><AdminShell /></RequireAuth>}>
                    <Route index element={<Navigate to="/articles" replace />} />
                    <Route path="write" element={<Write />} />
                    <Route element={<AdminLayout />}>
                      <Route path="articles" element={<AdminArticles />} />
                      <Route path="comments" element={<AdminComments />} />
                      <Route path="categories" element={<AdminCategories />} />
                      <Route path="tags" element={<AdminTags />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/articles" replace />} />
                  </Route>
                </Routes>
              </PasswordChangeGate>
            </BrowserRouter>
          </DarkModeProvider>
        </ToastProvider>
      </AuthProvider>
    </ApiProvider>
  )
}

export default App
