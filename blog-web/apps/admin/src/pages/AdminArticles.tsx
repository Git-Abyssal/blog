import React, { useState, useEffect, useCallback, useId, useRef } from 'react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import {
  FileText,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Pencil,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  Loader2,
  RotateCcw,
} from 'lucide-react'
import type { Article, Category, Tag } from '@shared/types'
import { useToast } from '@shared/hooks/useToast'
import { useDialogFocus } from '@shared/hooks/useDialogFocus'
import { useRefreshOnWindowFocus } from '@shared/hooks/useRefreshOnWindowFocus'

interface PageResponse {
  content: Article[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

interface OptionPage<T> {
  content: T[]
}

interface FilterOption {
  value: string
  label: string
}

interface FilterSelectProps {
  ariaLabel: string
  value: string
  options: FilterOption[]
  disabled?: boolean
  onChange: (value: string) => void
}

const FilterSelect: React.FC<FilterSelectProps> = ({
  ariaLabel,
  value,
  options,
  disabled = false,
  onChange,
}) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listboxId = useId()
  const selectedOption = options.find((option) => option.value === value) ?? options[0]

  useEffect(() => {
    if (!open) return
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsideClick)
    return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
  }, [open])

  useEffect(() => {
    if (!open) return
    const selected = containerRef.current?.querySelector<HTMLElement>('[role="option"][aria-selected="true"]')
    selected?.focus()
  }, [open])

  const closeAndFocusTrigger = () => {
    setOpen(false)
    requestAnimationFrame(() => buttonRef.current?.focus())
  }

  const handleOptionKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    const optionButtons = Array.from(
      containerRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? [],
    )
    const currentIndex = optionButtons.indexOf(event.currentTarget)
    let nextIndex = currentIndex

    if (event.key === 'ArrowDown') nextIndex = Math.min(optionButtons.length - 1, currentIndex + 1)
    else if (event.key === 'ArrowUp') nextIndex = Math.max(0, currentIndex - 1)
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = optionButtons.length - 1
    else if (event.key === 'Escape') {
      event.preventDefault()
      closeAndFocusTrigger()
      return
    } else {
      return
    }

    event.preventDefault()
    optionButtons[nextIndex]?.focus()
  }

  return (
    <div ref={containerRef} className="relative min-w-0">
      <button
        ref={buttonRef}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listboxId}
        aria-haspopup="listbox"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
          }
        }}
        className="control-field flex h-11 w-full min-w-0 items-center justify-between gap-3 rounded-xl border border-slate-300 bg-white pl-3 pr-[0.8125rem] text-left text-sm text-slate-700 shadow-sm outline-none transition-[border-color,box-shadow,background-color] hover:border-slate-400 focus:border-brand-blue focus:ring-4 focus:ring-blue-500/10 disabled:cursor-wait disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
      >
        <span className="truncate">{selectedOption.label}</span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          aria-hidden
        />
      </button>

      {open && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute inset-x-0 top-[calc(100%+0.375rem)] z-40 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_16px_36px_-18px_rgba(15,23,42,0.45)] dark:border-slate-700 dark:bg-slate-800"
        >
          {options.map((option) => {
            const selected = option.value === value
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={selected}
                tabIndex={selected ? 0 : -1}
                onKeyDown={handleOptionKeyDown}
                onClick={() => {
                  onChange(option.value)
                  closeAndFocusTrigger()
                }}
                className={`flex min-h-10 w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue ${
                  selected
                    ? 'bg-blue-50 font-semibold text-brand-blue dark:bg-blue-500/15 dark:text-blue-300'
                    : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span className="truncate">{option.label}</span>
                {selected && <Check className="h-4 w-4 shrink-0" aria-hidden />}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

const PAGE_SIZE = 10

const AdminArticles: React.FC = () => {
  const [articles, setArticles] = useState<Article[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [keyword, setKeyword] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')
  const [categories, setCategories] = useState<Category[]>([])
  const [tags, setTags] = useState<Tag[]>([])
  const [filtersLoading, setFiltersLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Article | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const requestIdRef = useRef(0)
  const filterRequestIdRef = useRef(0)
  const { error: showError } = useToast()
  const deleteDialogRef = useDialogFocus<HTMLDivElement>(!!confirmDelete)

  const fetchArticles = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setLoadError(false)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('size', String(PAGE_SIZE))
      params.set('sort', 'createdAt,desc')
      if (keyword) params.set('keyword', keyword)
      if (statusFilter) params.set('status', statusFilter)
      if (categoryFilter) params.set('categoryId', categoryFilter)
      if (tagFilter) params.set('tagId', tagFilter)
      const res = await axios.get<PageResponse>(`/api/admin/articles?${params.toString()}`)
      if (requestId !== requestIdRef.current) return
      const nextTotalPages = res.data.totalPages ?? 0
      if (page > 0 && page >= nextTotalPages) {
        setPage(Math.max(0, nextTotalPages - 1))
        return
      }
      setArticles(res.data.content ?? [])
      setTotalPages(nextTotalPages)
      setTotalElements(res.data.totalElements ?? 0)
    } catch {
      if (requestId !== requestIdRef.current) return
      showError('加载文章列表失败')
      setLoadError(true)
      setArticles([])
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [page, keyword, statusFilter, categoryFilter, tagFilter, showError])

  useEffect(() => {
    fetchArticles()
  }, [fetchArticles, refreshVersion])

  const fetchFilterOptions = useCallback(async () => {
    const requestId = ++filterRequestIdRef.current
    setFiltersLoading(true)
    try {
      const [categoryRes, tagRes] = await Promise.all([
        axios.get<OptionPage<Category>>('/api/admin/categories', {
          params: { page: 0, size: 100 },
        }),
        axios.get<OptionPage<Tag>>('/api/admin/tags', {
          params: { page: 0, size: 100 },
        }),
      ])
      if (requestId !== filterRequestIdRef.current) return
      setCategories(categoryRes.data.content ?? [])
      setTags(tagRes.data.content ?? [])
    } catch {
      if (requestId === filterRequestIdRef.current) showError('加载筛选条件失败')
    } finally {
      if (requestId === filterRequestIdRef.current) setFiltersLoading(false)
    }
  }, [showError])

  useEffect(() => {
    fetchFilterOptions()
    return () => {
      filterRequestIdRef.current += 1
    }
  }, [fetchFilterOptions])

  useRefreshOnWindowFocus(() => {
    void fetchArticles()
    void fetchFilterOptions()
  })

  useEffect(() => {
    if (!confirmDelete) return
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deletingId) setConfirmDelete(null)
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [confirmDelete, deletingId])

  useEffect(() => {
    if (!successMessage) return
    const t = setTimeout(() => setSuccessMessage(null), 2500)
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSuccessMessage(null)
    }
    window.addEventListener('keydown', onEscape)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onEscape)
    }
  }, [successMessage])

  useEffect(() => {
    if (!errorMessage) return
    const t = setTimeout(() => setErrorMessage(null), 2500)
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setErrorMessage(null)
    }
    window.addEventListener('keydown', onEscape)
    return () => {
      clearTimeout(t)
      window.removeEventListener('keydown', onEscape)
    }
  }, [errorMessage])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const nextKeyword = searchInput.trim()
    if (nextKeyword === keyword && page === 0) {
      void fetchArticles()
      return
    }
    setKeyword(nextKeyword)
    setPage(0)
  }

  const resetFilters = () => {
    setSearchInput('')
    setKeyword('')
    setStatusFilter('')
    setCategoryFilter('')
    setTagFilter('')
    setPage(0)
  }

  const hasActiveFilters = Boolean(keyword || statusFilter || categoryFilter || tagFilter)

  const doDelete = async (id: number) => {
    setDeletingId(id)
    try {
      await axios.delete(`/api/articles/${id}`)
      setConfirmDelete(null)
      setRefreshVersion((version) => version + 1)
      setSuccessMessage('文章已删除')
    } catch {
      setErrorMessage('删除失败，请稍后重试')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (d: string | undefined) => {
    if (!d) return '-'
    try {
      const date = new Date(d)
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return d
    }
  }

  return (
    <>
      {/* 删除确认弹窗 */}
      {confirmDelete && (
        <div
          ref={deleteDialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/55 p-4"
          onClick={() => !deletingId && setConfirmDelete(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-article-title"
        >
          <div
            className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 p-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" aria-hidden />
              </span>
              <div>
                <h3 id="delete-article-title" className="font-bold text-slate-950 dark:text-white">确认删除</h3>
                <p className="mt-1 text-sm leading-6 text-slate-500 dark:text-slate-400">
                  确定要删除这篇文章吗？此操作不可恢复。
                </p>
                <p className="mt-3 border-l-2 border-red-300 pl-3 text-sm text-slate-700 dark:border-red-800 dark:text-slate-200">
                  即将删除：<span className="font-semibold">{confirmDelete.title}</span>
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
              <button
                type="button"
                data-dialog-autofocus
                onClick={() => setConfirmDelete(null)}
                disabled={!!deletingId}
                className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:border-slate-700 dark:text-slate-200 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={() => doDelete(confirmDelete.id)}
                disabled={!!deletingId}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-50"
              >
                {deletingId === confirmDelete.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 操作成功/失败提示 - 统一样式 */}
      {successMessage && (
        <div
          className="fixed left-1/2 right-auto top-20 z-[300] flex w-[calc(100%-2rem)] max-w-xs -translate-x-1/2 items-center gap-3 rounded-2xl border border-emerald-200 bg-white px-4 py-3 shadow-[0_12px_32px_-20px_rgba(15,23,42,0.45)] dark:border-emerald-900 dark:bg-slate-900"
          role="status"
          aria-live="polite"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4" />
          </span>
          <span className="text-sm text-slate-700 dark:text-slate-200">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div
          className="fixed left-1/2 right-auto top-20 z-[300] flex w-[calc(100%-2rem)] max-w-xs -translate-x-1/2 items-center gap-3 rounded-2xl border border-red-200 bg-white px-4 py-3 shadow-[0_12px_32px_-20px_rgba(15,23,42,0.45)] dark:border-red-900 dark:bg-slate-900"
          role="alert"
          aria-live="assertive"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <span className="text-sm text-slate-700 dark:text-slate-200">{errorMessage}</span>
        </div>
      )}

      <section aria-busy={loading} className="admin-list-page flex min-h-0 flex-1 flex-col">
        <header className="shrink-0 border-b border-slate-200/90 pb-4 pt-4 dark:border-slate-800 sm:pt-5">
          <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-200/90 pb-3 dark:border-slate-800">
            <h1 className="admin-page-title text-xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">文章管理</h1>
            {!loading && !loadError && (
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400" aria-live="polite">
                共 {totalElements} 篇文章
              </span>
            )}
          </div>

          <form onSubmit={handleSearch} className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5">
            <div className="min-w-0">
              <input
                aria-label="搜索文章"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="搜索文章标题或内容…"
                className="control-field h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-slate-500 hover:border-slate-400 focus:border-brand-blue focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-400"
              />
            </div>
            <button
              type="submit"
              className="admin-action admin-action-primary admin-search-action min-w-[5.5rem] focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-50"
            >
              <Search className="h-4 w-4" aria-hidden />
              搜索
            </button>
          </form>

          <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-3">
              <FilterSelect
                ariaLabel="文章状态"
                value={statusFilter}
                options={[
                  { value: '', label: '全部状态' },
                  { value: 'draft', label: '草稿' },
                  { value: 'published', label: '已发布' },
                ]}
                onChange={(nextValue) => {
                  setStatusFilter(nextValue)
                  setPage(0)
                }}
              />
              <FilterSelect
                ariaLabel="文章分类"
                value={categoryFilter}
                disabled={filtersLoading}
                options={[
                  { value: '', label: '全部分类' },
                  ...categories.map((category) => ({ value: String(category.id), label: category.name })),
                ]}
                onChange={(nextValue) => {
                  setCategoryFilter(nextValue)
                  setPage(0)
                }}
              />
              <FilterSelect
                ariaLabel="文章标签"
                value={tagFilter}
                disabled={filtersLoading}
                options={[
                  { value: '', label: '全部标签' },
                  ...tags.map((tag) => ({ value: String(tag.id), label: tag.name })),
                ]}
                onChange={(nextValue) => {
                  setTagFilter(nextValue)
                  setPage(0)
                }}
              />
            </div>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="admin-action admin-action-secondary shrink-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
              >
                <RotateCcw className="h-4 w-4" aria-hidden />
                重置
              </button>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto pb-8">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12" role="status">
              <Loader2 className="mb-4 h-8 w-8 animate-spin text-brand-blue" aria-hidden />
              <p className="text-sm text-slate-500 dark:text-slate-400">加载中</p>
            </div>
          ) : loadError ? (
            <div className="flex flex-col items-center justify-center border-y border-red-200 py-10 text-center dark:border-red-900/60" role="alert">
              <AlertTriangle className="h-9 w-9 text-red-500" aria-hidden />
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">文章列表加载失败</p>
              <button type="button" onClick={fetchArticles} className="admin-action admin-action-secondary mt-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue">
                重新加载
              </button>
            </div>
          ) : articles.length === 0 ? (
            <div className="flex flex-col items-center justify-center border-y border-slate-200 py-10 text-center dark:border-slate-700">
              <FileText className="mb-3 h-9 w-9 text-slate-300 dark:text-slate-600" aria-hidden />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {hasActiveFilters ? '没有符合筛选条件的文章' : '暂无文章'}
              </p>
            </div>
          ) : (
            <>
              <ul className="admin-list divide-y divide-slate-200/90 border-b border-slate-200/90 dark:divide-slate-800 dark:border-slate-800">
                {articles.map((article) => (
                  <li
                    key={article.id}
                    className="flex flex-col gap-2.5 py-2.5 pl-3 pr-[0.1875rem] transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/60 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex min-h-11 max-w-full items-center font-semibold text-slate-950 dark:text-white">
                          <span className="line-clamp-1">{article.title || '未命名'}</span>
                        </span>
                        {article.status === 'draft' && (
                          <span className="rounded-xl border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
                            草稿
                          </span>
                        )}
                        {article.status === 'published' && (
                          <span className="rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-400">
                            已发布
                          </span>
                        )}
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                        {article.category?.name && (
                          <span>
                            {article.category.name}
                          </span>
                        )}
                        <span>{formatDate(article.createdAt)}</span>
                        <span>
                          {article.views ?? 0} 浏览
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-0.5 border-t border-slate-200 pt-2 dark:border-slate-700 sm:border-t-0 sm:pt-0">
                      <Link
                        to={`/write?edit=${article.id}`}
                        className="admin-action admin-action-compact font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white"
                      >
                        <Pencil className="h-4 w-4" /> 编辑
                      </Link>
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(article)}
                        disabled={!!deletingId}
                        className="admin-action admin-action-compact admin-action-danger font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-50"
                      >
                        {deletingId === article.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}{' '}
                        删除
                      </button>
                    </div>
                  </li>
                ))}
              </ul>

              {totalPages > 1 && (
                <div className="mt-4 flex items-center justify-center gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="admin-action admin-action-compact admin-action-secondary min-w-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only">上一页</span>
                  </button>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
                    第 {page + 1} / {totalPages} 页
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="admin-action admin-action-compact admin-action-secondary min-w-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <span className="sr-only sm:not-sr-only">下一页</span>
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  )
}

export default AdminArticles
