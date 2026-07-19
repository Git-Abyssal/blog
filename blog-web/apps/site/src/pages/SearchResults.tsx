import React, { useCallback, useEffect, useRef } from 'react'
import { AlertCircle, RefreshCw, SearchX } from 'lucide-react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import ArticleCard from '../components/ArticleCard'
import InfiniteScrollLoader from '../components/InfiniteScrollLoader'
import SkeletonCard from '../components/SkeletonCard'
import { useInfiniteArticles } from '@shared/hooks/useApi'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'

const SearchResults: React.FC = () => {
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const keyword = searchParams.get('keyword') || ''
  const previousNavigationRef = useRef({ key: location.key, keyword })

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteArticles({ keyword: keyword || undefined })

  const articles = data?.pages.flatMap((page: any) => page.content || []) ?? []
  const totalCount = data?.pages?.[0]?.totalElements ?? 0

  useEffect(() => {
    const previous = previousNavigationRef.current
    if (previous.key !== location.key && previous.keyword === keyword) {
      void refetch()
    }
    previousNavigationRef.current = { key: location.key, keyword }
  }, [keyword, location.key, refetch])

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const sentinelRef = useInfiniteScroll(handleLoadMore)

  return (
    <div className="mx-auto max-w-[69rem] py-8 sm:py-10">
      <header className="mb-2 border-b border-slate-200 pb-6 dark:border-slate-800">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <h1 id="search-results-heading" className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-white">
            {keyword ? `“${keyword}”的搜索结果` : '搜索文章'}
          </h1>
          {!isLoading && !isError && articles.length > 0 && (
            <p className="shrink-0 text-sm text-slate-600 dark:text-slate-400">{totalCount} 篇文章</p>
          )}
        </div>
      </header>

      <section aria-labelledby="search-results-heading">
        {isLoading ? (
          <SkeletonCard count={5} />
        ) : isError ? (
          <div className="flex flex-col items-center border-b border-slate-300 py-14 text-center sm:py-16 dark:border-slate-700" role="alert">
            <AlertCircle className="h-6 w-6 text-red-500" aria-hidden />
            <p className="mt-4 font-semibold text-slate-950 dark:text-white">搜索结果暂时加载失败</p>
            <button
              type="button"
              onClick={() => refetch()}
              className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl border border-brand-blue px-4 py-2 text-sm font-semibold text-brand-blue transition-colors hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500/10 dark:ring-offset-slate-900"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              重新加载
            </button>
          </div>
        ) : articles.length > 0 ? (
          <>
            <div className="divide-y divide-slate-200 dark:divide-slate-800">
              {articles.map((article: any) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
            <InfiniteScrollLoader hasMore={!!hasNextPage} loading={isFetchingNextPage} sentinelRef={sentinelRef} />
          </>
        ) : (
          <div className="flex flex-col items-center border-b border-slate-300 py-14 text-center sm:py-16 dark:border-slate-700">
            <SearchX className="h-6 w-6 text-slate-400" aria-hidden />
            <p className="mt-4 font-semibold text-slate-950 dark:text-white">
              {keyword ? '没有找到相关文章' : '请输入搜索关键词'}
            </p>
            <Link
              to="/"
              className="mt-4 inline-flex min-h-11 items-center rounded-xl px-2 text-sm font-semibold text-brand-blue underline decoration-blue-200 underline-offset-4 transition-colors hover:text-blue-700 hover:decoration-blue-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:decoration-blue-800 dark:hover:text-blue-300"
            >
              返回文章
            </Link>
          </div>
        )}
      </section>
    </div>
  )
}

export default SearchResults
