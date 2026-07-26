import React, { useEffect, useRef, useState } from 'react'
import { Menu, Search, X } from 'lucide-react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import ThemeToggle from '@shared/components/ThemeToggle'

const Header: React.FC = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [keyword, setKeyword] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const mobileButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname, location.search])

  useEffect(() => {
    if (!mobileOpen) return
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileOpen(false)
        window.requestAnimationFrame(() => mobileButtonRef.current?.focus())
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [mobileOpen])

  const handleSearch = (event: React.FormEvent) => {
    event.preventDefault()
    const normalizedKeyword = keyword.trim()
    const targetPath = normalizedKeyword ? '/search' : '/'
    const target = normalizedKeyword ? `${targetPath}?keyword=${encodeURIComponent(normalizedKeyword)}` : targetPath
    const staysOnCurrentPage = location.pathname === targetPath
    setMobileOpen(false)
    navigate(target)
    if (staysOnCurrentPage) {
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
      window.requestAnimationFrame(() => {
        document.getElementById('main-content')?.focus({ preventScroll: true })
      })
    }
  }

  if (/^\/article\/[^/]+\/?$/.test(location.pathname)) return null

  return (
    <header className="sticky top-0 z-50 w-full bg-[rgba(243,246,250,0.86)] backdrop-blur-xl dark:bg-[#0b111b]">
      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6">
        <div className="mx-auto flex h-16 max-w-[69rem] items-center justify-between gap-4 border-b border-slate-200/70 dark:border-slate-800/80">
          <Link
            to="/"
            aria-label="返回文章首页"
            title="返回文章首页"
            className="inline-flex min-h-11 min-w-11 items-center gap-2.5 rounded-lg pr-2 text-slate-800 outline-none transition-colors hover:text-brand-blue focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 dark:text-slate-100 dark:focus-visible:ring-offset-slate-950"
          >
            <span className="h-5 w-0.5 bg-brand-blue" aria-hidden />
            <span className="utility-type text-[11px] font-bold tracking-[0.2em]">首页</span>
          </Link>

          <div className="flex items-center gap-2.5">
            <form onSubmit={handleSearch} className="relative hidden lg:block">
              <label htmlFor="desktop-search" className="sr-only">搜索文章</label>
              <input
                id="desktop-search"
                type="search"
                placeholder="搜索文章"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
                className="h-11 w-52 rounded-xl border border-slate-300 bg-white/90 py-2 pl-3.5 pr-11 text-sm text-slate-900 shadow-sm outline-none transition-[width,border-color,box-shadow] placeholder:text-slate-500 hover:border-slate-400 focus:w-60 focus:border-brand-blue focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900/90 dark:text-white dark:placeholder:text-slate-400 dark:hover:border-slate-600 dark:focus:border-blue-400"
              />
              <button type="submit" className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue dark:text-slate-400 dark:hover:text-blue-300" aria-label="搜索">
                <Search className="h-4 w-4" aria-hidden />
              </button>
            </form>

            <ThemeToggle />

            <button
              ref={mobileButtonRef}
              type="button"
              onClick={() => setMobileOpen((open) => !open)}
              className="flex h-11 w-11 items-center justify-center rounded-xl border border-transparent text-slate-600 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue lg:hidden dark:text-slate-300 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-white"
              aria-label={mobileOpen ? '关闭导航' : '打开导航'}
              aria-expanded={mobileOpen}
              aria-controls="mobile-navigation"
            >
              {mobileOpen ? <X className="h-5 w-5" aria-hidden /> : <Menu className="h-5 w-5" aria-hidden />}
            </button>
          </div>
        </div>
      </div>

      {mobileOpen && (
        <div id="mobile-navigation" className="mx-4 mb-3 overflow-hidden rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.5)] lg:hidden dark:border-slate-800 dark:bg-[#0b111b]">
          <form onSubmit={handleSearch} className="relative">
            <label htmlFor="mobile-search" className="sr-only">搜索文章</label>
            <input
              id="mobile-search"
              type="search"
              placeholder="搜索文章"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              className="h-11 w-full rounded-xl border border-slate-300 bg-slate-50 py-2 pl-3 pr-11 text-sm text-slate-900 outline-none placeholder:text-slate-500 focus:border-brand-blue focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-900 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-400"
            />
            <button type="submit" className="absolute right-0 top-0 flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue dark:text-slate-400" aria-label="搜索">
              <Search className="h-4 w-4" aria-hidden />
            </button>
          </form>
        </div>
      )}
    </header>
  )
}

export default Header
