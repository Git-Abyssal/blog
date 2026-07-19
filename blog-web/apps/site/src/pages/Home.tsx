import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { AlertCircle, Loader2, RefreshCw, SearchX } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import ArticleCard from '../components/ArticleCard'
import Pagination from '../components/Pagination'
import { useArticles } from '@shared/hooks/useApi'
import { useRefreshOnWindowFocus } from '@shared/hooks/useRefreshOnWindowFocus'
import type { Category } from '@shared/types'

type TabType = 'latest' | 'hot'
const PAGE_SIZE = 10
const INITIAL_LOADING_DELAY_MS = 300

const Home: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const keyword = searchParams.get('keyword')
  const tabFromUrl: TabType = searchParams.get('tab') === 'hot' ? 'hot' : 'latest'
  const pageFromUrl = Number.parseInt(searchParams.get('page') || '1', 10)
  const currentPage = Number.isFinite(pageFromUrl) && pageFromUrl > 0 ? pageFromUrl - 1 : 0
  const categoryFromUrl = Number.parseInt(searchParams.get('category') || '', 10)
  const selectedCategoryId = tabFromUrl !== 'hot' && Number.isFinite(categoryFromUrl) && categoryFromUrl > 0
    ? categoryFromUrl
    : null

  const [serverCategories, setServerCategories] = useState<Category[]>([])
  const categoryRequestIdRef = useRef(0)

  const fetchCategories = useCallback(async () => {
    const requestId = ++categoryRequestIdRef.current
    try {
      const response = await axios.get<Category[]>('/api/categories')
      if (requestId === categoryRequestIdRef.current) {
        setServerCategories(response.data || [])
      }
    } catch {
      if (requestId === categoryRequestIdRef.current) setServerCategories([])
    }
  }, [])

  useEffect(() => {
    fetchCategories()
    return () => {
      categoryRequestIdRef.current += 1
    }
  }, [fetchCategories])

  useRefreshOnWindowFocus(fetchCategories)

  const { data, isLoading: loading, isFetching, isError, refetch } = useArticles({
    keyword: keyword || undefined,
    tab: tabFromUrl === 'hot' ? 'hot' : undefined,
    categoryId: selectedCategoryId || undefined,
    page: currentPage,
    size: PAGE_SIZE,
  })

  const articles = data?.content ?? []
  const totalPages = data?.totalPages ?? 0
  const fetchError = isError ? '文章暂时没有加载成功' : null
  const [showInitialLoading, setShowInitialLoading] = useState(false)

  useEffect(() => {
    if (!loading) {
      setShowInitialLoading(false)
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShowInitialLoading(true)
    }, INITIAL_LOADING_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [loading])

  useEffect(() => {
    if (!loading && totalPages > 0 && currentPage >= totalPages) {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous)
        next.delete('page')
        return next
      }, { replace: true })
    }
  }, [currentPage, loading, setSearchParams, totalPages])

  const handleTab = (nextTab: TabType) => {
    if (nextTab === tabFromUrl) {
      void refetch()
      return
    }
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      next.set('tab', nextTab)
      if (nextTab === 'hot') next.delete('category')
      next.delete('page')
      return next
    })
  }

  const selectCategory = (categoryId: number | null) => {
    const alreadySelected = tabFromUrl === 'latest' && selectedCategoryId === categoryId
    if (alreadySelected) {
      void refetch()
    } else {
      setSearchParams((previous) => {
        const next = new URLSearchParams(previous)
        next.set('tab', 'latest')
        if (categoryId !== null) {
          next.set('category', String(categoryId))
        } else {
          next.delete('category')
        }
        next.delete('page')
        return next
      })
    }
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    document.getElementById('articles')?.scrollIntoView?.({ behavior, block: 'start' })
  }

  const changePage = (page: number) => {
    if (page < 0 || page >= totalPages || page === currentPage) return
    setSearchParams((previous) => {
      const next = new URLSearchParams(previous)
      if (page === 0) next.delete('page')
      else next.set('page', String(page + 1))
      return next
    })
    document.getElementById('article-list-heading')?.focus()
  }

  const categoryButtonClass = (active: boolean) =>
    `relative flex min-h-11 shrink-0 items-center rounded-xl px-3 text-sm font-semibold transition-colors first:-ml-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 ${
      active
        ? 'bg-blue-50 text-brand-blue dark:bg-blue-500/10 dark:text-blue-300'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
    }`

  return (
    <div className="pb-8">
      <div id="articles" className="mx-auto max-w-[69rem] scroll-mt-24">
          <nav className="category-scroll flex gap-1.5 overflow-x-auto border-b border-slate-200/90 py-1 dark:border-slate-800" aria-label="文章分类">
            <button
              type="button"
              onClick={() => selectCategory(null)}
              className={categoryButtonClass(selectedCategoryId === null)}
              aria-pressed={selectedCategoryId === null}
            >
              全部文章
            </button>
            {serverCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => selectCategory(category.id)}
                className={categoryButtonClass(selectedCategoryId === category.id)}
                aria-pressed={selectedCategoryId === category.id}
              >
                {category.name}
              </button>
            ))}
          </nav>

          <section className="min-w-0" aria-labelledby="article-list-heading">
            <div className="flex items-center gap-1.5 border-b border-slate-200/90 dark:border-slate-800">
              {(['latest', 'hot'] as const).map((item) => {
                const active = tabFromUrl === item
                return (
                  <button
                    key={item}
                    type="button"
                    onClick={() => handleTab(item)}
                    className={`relative px-3 py-2.5 text-sm font-semibold transition-colors first:-ml-3 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 ${
                      active ? 'text-slate-950 dark:text-white' : 'text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                    aria-pressed={active}
                    aria-label={item === 'latest' ? '最新文章' : '热榜'}
                  >
                    {item === 'latest' ? '最新文章' : '本周热榜'}
                    {active && (
                      <span
                        className={`absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-blue ${
                          isFetching && !loading ? 'motion-safe:animate-pulse' : ''
                        }`}
                        aria-hidden
                      />
                    )}
                  </button>
                )
              })}
            </div>
            <h2 id="article-list-heading" tabIndex={-1} className="sr-only">文章列表</h2>

            <div className="relative min-h-32 pb-4">
              {loading ? (
                <div className="flex min-h-[24rem] items-center justify-center sm:min-h-[30rem]" aria-busy="true">
                  {showInitialLoading && (
                    <div
                      role="status"
                      aria-label="正在加载文章"
                      className="flex items-center gap-2.5 text-sm text-slate-500 dark:text-slate-400"
                    >
                      <Loader2 className="h-4 w-4 motion-safe:animate-spin text-brand-blue" aria-hidden />
                      <span>正在加载文章…</span>
                    </div>
                  )}
                </div>
              ) : fetchError ? (
                <div className="flex animate-fade-in-up flex-col items-center justify-center py-20 text-center">
                  <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400">
                    <AlertCircle className="h-6 w-6" aria-hidden />
                  </span>
                  <p className="font-semibold text-slate-950 dark:text-white">{fetchError}</p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-blue px-4 py-2 text-sm font-semibold text-brand-blue transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:border-blue-400 dark:text-blue-300 dark:hover:bg-blue-500/10"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden /> 重新加载
                  </button>
                </div>
              ) : articles.length > 0 ? (
                <div aria-busy={isFetching}>
                  <div className="divide-y divide-slate-200/80 border-b border-slate-200/80 dark:divide-slate-800 dark:border-slate-800">
                    {articles.map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                  <div className="pb-4">
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={changePage} disabled={isFetching} />
                  </div>
                </div>
              ) : (
                <div className="flex animate-fade-in-up flex-col items-center justify-center py-20 text-center">
                  <span className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                    <SearchX className="h-6 w-6" aria-hidden />
                  </span>
                  <p className="font-semibold text-slate-950 dark:text-white">{keyword ? '没有找到相关文章' : '暂无文章'}</p>
                </div>
              )}
            </div>
          </section>
      </div>
    </div>
  )
}

export default Home
