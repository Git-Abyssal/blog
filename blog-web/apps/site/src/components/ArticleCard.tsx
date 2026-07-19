import React from 'react'
import { Eye, MessageSquare } from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import type { Article } from '@shared/types'

interface ArticleCardProps {
  article: Article
}

const formatDate = (value?: string) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

const compactNumber = (value?: number) => {
  const normalized = value || 0
  return normalized >= 1000 ? `${(normalized / 1000).toFixed(1)}k` : normalized
}

const ArticleCard: React.FC<ArticleCardProps> = ({ article }) => {
  const location = useLocation()
  const publishedAt = formatDate(article.createdAt)
  const returnTo = `${location.pathname}${location.search}${location.hash}`
  const articleLinkState = { returnTo }

  return (
    <article className="py-2.5 first:pt-2.5">
      <div className="flex items-center gap-5 sm:gap-8">
        <div className="-translate-y-1 min-w-0 flex-1">
          <div className="mb-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] leading-5 text-slate-600 dark:text-slate-400">
            {publishedAt && <time className="utility-type text-[11px] tracking-[0.04em]" dateTime={article.createdAt}>{publishedAt}</time>}
            {article.category?.name && (
              <Link
                to={`/category/${article.category.id}`}
                className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg font-medium text-brand-blue transition-colors hover:text-blue-800 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-blue-400 dark:hover:text-blue-300"
              >
                {article.category.name}
              </Link>
            )}
            {article.tags?.map((tag) => (
              <Link
                key={tag.id}
                to={`/tag/${tag.id}`}
                className="inline-flex min-h-8 min-w-8 items-center justify-center rounded-lg transition-colors hover:text-brand-blue hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:hover:text-blue-400"
              >
                #{tag.name}
              </Link>
            ))}
          </div>

          <Link
            to={`/article/${article.id}`}
            state={articleLinkState}
            className="group/article block rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-4 dark:focus-visible:ring-offset-slate-900"
          >
            <h2 className="display-type line-clamp-2 text-[1.16rem] font-bold leading-snug tracking-[-0.02em] text-slate-950 transition-colors group-hover/article:text-brand-blue sm:text-[1.32rem] dark:text-white dark:group-hover/article:text-blue-300">
              {article.title}
            </h2>
            <p className="mt-1 line-clamp-2 text-[15px] leading-6 text-slate-600 dark:text-slate-400">
              {article.summary}
            </p>
          </Link>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5" aria-label={`${article.views || 0} 次阅读`}>
              <Eye className="h-3.5 w-3.5" aria-hidden />
              {compactNumber(article.views)}
            </span>
            <span className="inline-flex items-center gap-1.5" aria-label={`${article.commentCount || 0} 条评论`}>
              <MessageSquare className="h-3.5 w-3.5" aria-hidden />
              {compactNumber(article.commentCount)}
            </span>
          </div>
        </div>

        {article.coverImage && (
          <Link
            to={`/article/${article.id}`}
            state={articleLinkState}
            className="hidden h-24 w-32 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-sm transition-[transform,box-shadow] hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue sm:block lg:w-36 dark:border-slate-700 dark:bg-slate-800"
            aria-label={`阅读《${article.title}》`}
          >
            <img src={article.coverImage} alt="" className="h-full w-full object-cover" />
          </Link>
        )}
      </div>
    </article>
  )
}

export default ArticleCard
