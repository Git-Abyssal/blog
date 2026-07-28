import React from 'react'
import { NavLink, Outlet } from 'react-router-dom'

const nav = [
  { to: '/articles', label: '文章管理' },
  { to: '/comments', label: '评论管理' },
  { to: '/categories', label: '分类管理' },
  { to: '/tags', label: '标签管理' },
]

const AdminLayout: React.FC = () => {
  return (
    <div className="admin-workspace min-h-[calc(100vh-7rem)] pb-3 sm:pb-4">
      <div className="mx-auto flex max-w-[72rem] flex-col">
        <nav
          className="category-scroll flex gap-1.5 overflow-x-auto border-b border-slate-200/90 py-1.5 sm:py-2 dark:border-slate-800"
          aria-label="管理导航"
        >
          {nav.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) => `relative flex min-h-11 shrink-0 items-center rounded-xl px-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 ${
                isActive
                  ? 'text-brand-blue dark:text-blue-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
              }`}
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <section className="flex min-h-0 min-w-0 flex-1 flex-col" aria-label="后台内容">
          <Outlet />
        </section>
      </div>
    </div>
  )
}

export default AdminLayout
