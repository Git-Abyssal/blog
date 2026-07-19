import React from 'react'
import { Moon, Sun } from 'lucide-react'
import { useDarkMode } from '../hooks/useDarkMode'

const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useDarkMode()

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-600 shadow-sm transition-colors hover:border-slate-400 hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:ring-offset-slate-900"
      aria-label={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
      aria-pressed={theme === 'dark'}
      title={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
    >
      {theme === 'light' ? (
        <Moon className="h-[18px] w-[18px]" aria-hidden />
      ) : (
        <Sun className="h-[18px] w-[18px] text-blue-300" aria-hidden />
      )}
    </button>
  )
}

export default ThemeToggle
