import React, { useCallback } from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { useParams } from 'react-router-dom'
import ArticleCard from '../components/ArticleCard'
import InfiniteScrollLoader from '../components/InfiniteScrollLoader'
import SkeletonCard from '../components/SkeletonCard'
import { useInfiniteArticles } from '@shared/hooks/useApi'
import { useInfiniteScroll } from '../hooks/useInfiniteScroll'

const CategoryDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const categoryId = Number(id)

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
    refetch,
  } = useInfiniteArticles({ categoryId })

  const articles = data?.pages.flatMap((page: any) => page.content || []) ?? []
  const totalCount = data?.pages?.[0]?.totalElements ?? 0
  const categoryName = articles.find((article: any) => Number(article.category?.id) === categoryId)?.category?.name

  const handleLoadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const sentinelRef = useInfiniteScroll(handleLoadMore)

  return (
    <div className="mx-auto max-w-[69rem] py-5 sm:py-6">
      <header className="mb-2 border-b border-slate-200 pb-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 id="category-heading" className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl dark:text-white">
            {categoryName || '分类文章'}
          </h1>
          {!isLoading && !isError && articles.length > 0 && (
            <p className="shrink-0 text-sm text-slate-600 dark:text-slate-400">{totalCount} 篇文章</p>
          )}
        </div>
      </header>

      <section aria-labelledby="category-heading">
        {isLoading ? (
          <SkeletonCard count={5} />
        ) : isError ? (
          <div className="flex flex-col items-center border-b border-slate-300 py-14 text-center sm:py-16 dark:border-slate-700" role="alert">
            <AlertCircle className="h-6 w-6 text-red-500" aria-hidden />
            <p className="mt-4 font-semibold text-slate-950 dark:text-white">分类文章暂时加载失败</p>
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
            <div className="divide-y divide-slate-200 border-b border-slate-200 dark:divide-slate-800 dark:border-slate-800">
              {articles.map((article: any) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
            <InfiniteScrollLoader hasMore={!!hasNextPage} loading={isFetchingNextPage} sentinelRef={sentinelRef} />
          </>
        ) : (
          <div className="border-b border-slate-300 py-14 text-center sm:py-16 dark:border-slate-700">
            <p className="font-semibold text-slate-950 dark:text-white">该分类下暂无文章</p>
          </div>
        )}
      </section>
    </div>
  )
}

export default CategoryDetail
