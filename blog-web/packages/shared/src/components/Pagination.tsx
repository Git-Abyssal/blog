import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  disabled?: boolean
}

type PageItem = number | 'ellipsis-start' | 'ellipsis-end'

const getPageItems = (currentPage: number, totalPages: number): PageItem[] => {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index)

  const pages = new Set([0, totalPages - 1, currentPage - 1, currentPage, currentPage + 1])
  const visiblePages = [...pages].filter((page) => page >= 0 && page < totalPages).sort((a, b) => a - b)
  const items: PageItem[] = []

  visiblePages.forEach((page, index) => {
    const previous = visiblePages[index - 1]
    if (index > 0 && page - previous > 1) {
      items.push(previous === 0 ? 'ellipsis-start' : 'ellipsis-end')
    }
    items.push(page)
  })

  return items
}

const Pagination = ({ currentPage, totalPages, onPageChange, disabled = false }: PaginationProps) => {
  if (totalPages <= 1) return null

  const pageItems = getPageItems(currentPage, totalPages)
  const controlClass =
    'inline-flex h-11 min-w-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-600 transition-colors hover:border-brand-blue hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-35 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300 dark:focus-visible:ring-offset-slate-950'

  return (
    <nav className="mt-4 flex items-center justify-center px-1 sm:justify-end sm:px-3" aria-label="分页导航">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          className={controlClass}
          onClick={() => onPageChange(currentPage - 1)}
          disabled={disabled || currentPage === 0}
          aria-label="上一页"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
        </button>

        {pageItems.map((item) =>
          typeof item === 'number' ? (
            <button
              key={item}
              type="button"
              className={`${controlClass} ${currentPage === item ? 'inline-flex' : 'hidden sm:inline-flex'} ${
                currentPage === item ? '!border-brand-blue !bg-brand-blue !text-white' : ''
              }`}
              onClick={() => onPageChange(item)}
              disabled={disabled}
              aria-label={`第 ${item + 1} 页`}
              aria-current={currentPage === item ? 'page' : undefined}
            >
              {item + 1}
            </button>
          ) : (
            <span key={item} className="hidden h-11 w-8 items-center justify-center text-slate-500 sm:inline-flex dark:text-slate-400" aria-hidden>
              <MoreHorizontal className="h-4 w-4" />
            </span>
          ),
        )}

        <button
          type="button"
          className={controlClass}
          onClick={() => onPageChange(currentPage + 1)}
          disabled={disabled || currentPage === totalPages - 1}
          aria-label="下一页"
        >
          <ChevronRight className="h-4 w-4" aria-hidden />
        </button>
      </div>
    </nav>
  )
}

export default Pagination
