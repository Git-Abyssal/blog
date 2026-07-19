import React, { Suspense } from 'react'
import { BrowserRouter as Router, Route, Routes, useLocation, useNavigationType } from 'react-router-dom'
import { HelmetProvider } from 'react-helmet-async'
import { ErrorBoundary } from '@shared/components/ErrorBoundary'
import { DarkModeProvider } from '@shared/hooks/useDarkMode'
import { ToastProvider } from '@shared/hooks/useToast'
import { ApiProvider } from '@shared/lib/api'
import Header from './components/Header'
import SEO from './components/SEO'
import Home from './pages/Home'

const ArticleDetail = React.lazy(() => import('./pages/ArticleDetail'))
const TagDetail = React.lazy(() => import('./pages/TagDetail'))
const CategoryDetail = React.lazy(() => import('./pages/CategoryDetail'))
const SearchResults = React.lazy(() => import('./pages/SearchResults'))
const NotFoundPage = React.lazy(() => import('./components/NotFoundPage'))

const PageLoader = () => (
  <div className="flex h-64 flex-col items-center justify-center gap-3 text-sm text-slate-600 dark:text-slate-400" role="status">
    <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-brand-blue dark:border-slate-700 dark:border-t-blue-300" aria-hidden />
    <span>正在加载页面…</span>
  </div>
)

export const RouteFocusManager = () => {
  const location = useLocation()
  const navigationType = useNavigationType()
  const previousPathname = React.useRef(location.pathname)

  React.useEffect(() => {
    if (location.pathname === previousPathname.current) return
    previousPathname.current = location.pathname
    if (navigationType !== 'POP') window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    const frame = window.requestAnimationFrame(() => {
      document.getElementById('main-content')?.focus({ preventScroll: true })
    })
    return () => window.cancelAnimationFrame(frame)
  }, [location.pathname, navigationType])

  return null
}

function App() {
  return (
    <ApiProvider>
      <HelmetProvider>
        <ToastProvider>
          <DarkModeProvider>
            <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
              <RouteFocusManager />
              <div className="page-bg-pattern flex min-h-screen flex-col bg-[var(--page-bg)] transition-colors">
                <SEO />
                <a
                  href="#main-content"
                  className="fixed left-4 top-2 z-[200] inline-flex min-h-11 -translate-y-16 items-center rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white shadow-lg transition-transform focus:translate-y-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 dark:bg-white dark:text-slate-950"
                >
                  跳到主要内容
                </a>
                <Header />
                <main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-7xl flex-1 px-4 sm:px-6">
                  <ErrorBoundary>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/article/:id" element={<ArticleDetail />} />
                        <Route path="/tag/:id" element={<TagDetail />} />
                        <Route path="/category/:id" element={<CategoryDetail />} />
                        <Route path="/search" element={<SearchResults />} />
                        <Route path="*" element={<NotFoundPage />} />
                      </Routes>
                    </Suspense>
                  </ErrorBoundary>
                </main>
              </div>
            </Router>
          </DarkModeProvider>
        </ToastProvider>
      </HelmetProvider>
    </ApiProvider>
  )
}

export default App
