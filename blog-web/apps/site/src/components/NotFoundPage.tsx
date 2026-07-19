import React from 'react'
import { Link } from 'react-router-dom'
import { Home } from 'lucide-react'

const NotFoundPage: React.FC = () => {
  return (
    <section className="mx-auto flex min-h-[60vh] max-w-4xl items-center" aria-labelledby="not-found-heading">
      <div className="grid w-full rounded-3xl border border-slate-300 bg-white px-6 py-9 shadow-sm dark:border-slate-700 dark:bg-slate-900 sm:grid-cols-[11rem_1fr] sm:px-10 sm:py-12">
        <p className="font-mono text-6xl font-black tracking-[-0.06em] text-slate-300 sm:text-7xl dark:text-slate-700" aria-hidden>
          404
        </p>
        <div className="mt-7 border-t border-slate-200 pt-7 sm:mt-0 sm:border-l sm:border-t-0 sm:pl-10 sm:pt-1 dark:border-slate-700">
          <h1 id="not-found-heading" className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-white">页面不存在</h1>
          <Link
            to="/"
            className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-400 dark:ring-offset-slate-900"
          >
            <Home className="h-4 w-4" aria-hidden />
            返回首页
          </Link>
        </div>
      </div>
    </section>
  )
}

export default NotFoundPage
