import React, { useEffect, useState, useRef } from 'react'
import { useLocation, useParams, Link } from 'react-router-dom'
import axios from 'axios'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash'
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css'
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java'
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript'
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json'
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx'
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown'
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup'
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python'
import shellSession from 'react-syntax-highlighter/dist/esm/languages/prism/shell-session'
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql'
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx'
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript'
import type { Article, Comment } from '@shared/types'
import { useToast } from '@shared/hooks/useToast'
import { useThreadedComments } from '@shared/hooks/useApi'
import { useRefreshOnWindowFocus } from '@shared/hooks/useRefreshOnWindowFocus'
import SEO from '../components/SEO'
import TableOfContents from '../components/TableOfContents'
import ArticleLoadingState from '../components/ArticleLoadingState'
import Avatar from '@shared/components/Avatar'
import { remarkHeadingIds } from '../lib/headings'
import {
  MessageSquare, ChevronLeft, ChevronRight, Calendar, Send,
  ChevronDown, ChevronUp, CheckCircle, AlertTriangle,
  Share2, RefreshCw,
} from 'lucide-react'

SyntaxHighlighter.registerLanguage('bash', bash)
SyntaxHighlighter.registerLanguage('sh', bash)
SyntaxHighlighter.registerLanguage('shell', bash)
SyntaxHighlighter.registerLanguage('css', css)
SyntaxHighlighter.registerLanguage('java', java)
SyntaxHighlighter.registerLanguage('javascript', javascript)
SyntaxHighlighter.registerLanguage('js', javascript)
SyntaxHighlighter.registerLanguage('json', json)
SyntaxHighlighter.registerLanguage('jsx', jsx)
SyntaxHighlighter.registerLanguage('markdown', markdown)
SyntaxHighlighter.registerLanguage('md', markdown)
SyntaxHighlighter.registerLanguage('markup', markup)
SyntaxHighlighter.registerLanguage('html', markup)
SyntaxHighlighter.registerLanguage('xml', markup)
SyntaxHighlighter.registerLanguage('python', python)
SyntaxHighlighter.registerLanguage('py', python)
SyntaxHighlighter.registerLanguage('shell-session', shellSession)
SyntaxHighlighter.registerLanguage('sql', sql)
SyntaxHighlighter.registerLanguage('tsx', tsx)
SyntaxHighlighter.registerLanguage('typescript', typescript)
SyntaxHighlighter.registerLanguage('ts', typescript)

const extractArticle = (payload: unknown): Article | null => {
  let data = payload
  if (
    data
    && typeof data === 'object'
    && 'data' in data
    && data.data
    && typeof data.data === 'object'
  ) {
    data = data.data
  }
  return data && typeof data === 'object' && 'id' in data ? data as Article : null
}

const formatCommentDate = (value: string) => {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

const ArticleDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const location = useLocation()
  const { success, error: showError } = useToast()
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'))
  const [article, setArticle] = useState<Article | null>(null)
  const [loading, setLoading] = useState(true)
  const [articleLoadError, setArticleLoadError] = useState<'not-found' | 'load-failed' | null>(null)
  const [articleLoadAttempt, setArticleLoadAttempt] = useState(0)
  const [guestName, setGuestName] = useState('')
  const [commentContent, setCommentContent] = useState('')
  const [commentSubmitting, setCommentSubmitting] = useState(false)
  const [commentError, setCommentError] = useState('')
  const [relatedArticles, setRelatedArticles] = useState<Article[]>([])
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [commentsPage, setCommentsPage] = useState(0)
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false)
  const commentSectionRef = useRef<HTMLDivElement>(null)
  const focusedRefreshRequestRef = useRef(0)

  const articleId = id ? Number(id) : 0
  const requestedReturnTo = (location.state as { returnTo?: unknown } | null)?.returnTo
  const returnTo = typeof requestedReturnTo === 'string'
    && requestedReturnTo.startsWith('/')
    && !requestedReturnTo.startsWith('//')
    ? requestedReturnTo
    : '/?tab=latest#articles'
  const articleLinkState = { returnTo }

  // Threaded comments hook
  const {
    data: threadedData,
    refetch: refetchComments,
    isLoading: commentsLoading,
    isError: commentsLoadError,
  } = useThreadedComments(articleId, commentsPage)
  const threadedComments: Comment[] = threadedData?.content ?? []
  const commentsTotalPages = threadedData?.totalPages ?? 0
  const commentsTotalElements = threadedData?.totalElements ?? 0

  useRefreshOnWindowFocus(async () => {
    const focusedArticleId = id ? Number(id) : 0
    if (!Number.isInteger(focusedArticleId) || focusedArticleId < 1) return

    const requestId = ++focusedRefreshRequestRef.current
    const [articleResult, relatedResult] = await Promise.allSettled([
      axios.get(`/api/articles/${focusedArticleId}`, {
        params: { trackView: false },
      }),
      axios.get(`/api/articles/${focusedArticleId}/related`),
    ])
    if (requestId !== focusedRefreshRequestRef.current) return

    if (articleResult.status === 'fulfilled') {
      const refreshedArticle = extractArticle(articleResult.value?.data)
      if (refreshedArticle) {
        setArticle(refreshedArticle)
        setArticleLoadError(null)
      }
    } else if (
      axios.isAxiosError(articleResult.reason)
      && articleResult.reason.response?.status === 404
    ) {
      setArticle(null)
      setArticleLoadError('not-found')
    }

    if (relatedResult.status === 'fulfilled') {
      setRelatedArticles(
        Array.isArray(relatedResult.value.data) ? relatedResult.value.data : [],
      )
    }
  })

  useEffect(() => () => {
    focusedRefreshRequestRef.current += 1
  }, [id])

  useEffect(() => {
    const root = document.documentElement
    const syncTheme = () => setIsDark(root.classList.contains('dark'))
    const observer = new MutationObserver(syncTheme)
    observer.observe(root, { attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [])

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
    const numId = id != null ? Number(id) : NaN
    if (!id || Number.isNaN(numId) || numId < 1) {
      setArticle(null)
      setArticleLoadError('not-found')
      setLoading(false)
      return
    }
    const abortController = new AbortController()
    setLoading(true)
    setArticle(null)
    setArticleLoadError(null)
    const fetchArticle = async () => {
      try {
        const response = await axios.get(`/api/articles/${id}`, { signal: abortController.signal })
        const data = extractArticle(response?.data)
        if (!data) {
          setArticle(null)
          setArticleLoadError('load-failed')
          return
        }
        setArticle(data)
      } catch (err) {
        if (!axios.isCancel(err)) {
          setArticle(null)
          setArticleLoadError(axios.isAxiosError(err) && err.response?.status === 404 ? 'not-found' : 'load-failed')
        }
      } finally {
        if (!abortController.signal.aborted) setLoading(false)
      }
    }

    fetchArticle()
    return () => abortController.abort()
  }, [id, articleLoadAttempt])

  useEffect(() => {
    if (!id || !article) return
    const abortController = new AbortController()
    const fetchRelated = async () => {
      try {
        const res = await axios.get(`/api/articles/${id}/related`, { signal: abortController.signal })
        const list = Array.isArray(res.data) ? res.data : []
        setRelatedArticles(list)
      } catch (err) {
        if (!axios.isCancel(err)) setRelatedArticles([])
      }
    }
    fetchRelated()
    return () => abortController.abort()
  }, [id, article?.id])

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault()
    const normalizedContent = commentContent.trim()
    const normalizedGuestName = guestName.trim()
    if (!normalizedContent) return
    if (!normalizedGuestName) {
      setCommentError('请填写昵称')
      return
    }
    setCommentSubmitting(true)
    setCommentError('')
    try {
      await axios.post(`/api/comments/article/${id}`, {
        content: normalizedContent,
        guestName: normalizedGuestName,
      })
      setGuestName('')
      setCommentContent('')
      setSuccessMessage('评论已提交，审核通过后显示')
    } catch (err: unknown) {
      const data = err && typeof err === 'object' && 'response' in err ? (err as { response: { data?: { message?: string; error?: string } } }).response?.data : undefined
      setCommentError(data?.message ?? data?.error ?? '评论失败')
    } finally {
      setCommentSubmitting(false)
    }
  }

  const copyToClipboard = async (text: string, successText = '代码已复制到剪贴板') => {
    try {
      await navigator.clipboard.writeText(text)
      success(successText)
    } catch {
      const textArea = document.createElement('textarea')
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      try { document.execCommand('copy'); success(successText) } catch { showError('复制失败，请手动复制') }
      document.body.removeChild(textArea)
    }
  }

  const scrollToComments = () => {
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    commentSectionRef.current?.scrollIntoView({ behavior })
    commentSectionRef.current?.focus({ preventScroll: true })
    setMobileActionsOpen(false)
  }

  const copyArticleLink = async () => {
    await copyToClipboard(window.location.href, '链接已复制')
    setMobileActionsOpen(false)
  }

  // ========== Comment rendering ==========
  const renderComment = (comment: Comment, isReply = false) => {
    const isGuest = !comment.ownerComment
    const displayName = isGuest ? (comment.guestName || '访客') : '站长'
    return (
      <div key={comment.id} className={`${isReply ? 'ml-4 mt-3 sm:ml-10' : 'pt-3.5'}`}>
        <div className="flex items-start gap-3">
          <Avatar size="sm" fallbackName={displayName} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-medium text-slate-900 dark:text-slate-100">{displayName}</span>
              {isGuest && (
                <span className="rounded-lg bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 dark:bg-slate-800 dark:text-slate-300">访客</span>
              )}
              <span className="text-xs text-slate-600 dark:text-slate-400">
                {formatCommentDate(comment.createdAt)}
              </span>
            </div>
            <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-slate-700 dark:text-slate-300">
              {comment.content ?? ''}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ========== Loading / Not Found ==========
  if (loading) {
    return <ArticleLoadingState />
  }

  if (!article && articleLoadError === 'not-found') {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <p className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">文章不存在或已被删除</p>
        <Link to="/" className="inline-flex min-h-11 items-center gap-1 rounded-xl px-2 text-brand-blue hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue">
          <ChevronLeft className="h-4 w-4" />
          返回首页
        </Link>
      </div>
    )
  }

  if (!article) {
    return (
      <div className="flex h-96 flex-col items-center justify-center px-4 text-center">
        <AlertTriangle className="h-10 w-10 text-amber-500" aria-hidden />
        <p className="mt-4 text-xl font-semibold text-slate-900 dark:text-white">文章暂时加载失败</p>
        <button
          type="button"
          onClick={() => setArticleLoadAttempt((attempt) => attempt + 1)}
          className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-5 py-2 text-sm font-semibold text-white transition hover:bg-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:bg-white dark:text-slate-950 dark:hover:bg-blue-300"
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          重新加载
        </button>
      </div>
    )
  }

  return (
    <>
      {successMessage && (
        <div className="fixed left-1/2 right-auto top-20 z-[100] flex w-[calc(100%-2rem)] max-w-xs -translate-x-1/2 items-center gap-3 rounded-2xl border border-emerald-200 bg-white/95 px-4 py-3 shadow-[0_12px_32px_-20px_rgba(15,23,42,0.45)] backdrop-blur-sm dark:border-emerald-900 dark:bg-slate-900/95" role="status" aria-live="polite">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400">
            <CheckCircle className="h-4 w-4" />
          </span>
          <span className="text-sm text-slate-700 dark:text-slate-300">{successMessage}</span>
        </div>
      )}

      {/* Mobile collapsible action rail */}
      <div className="fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom))] right-[calc(0.75rem+env(safe-area-inset-right))] z-40 flex min-h-12 overflow-hidden rounded-full border border-slate-200 bg-white/95 shadow-lg backdrop-blur-sm dark:border-slate-700 dark:bg-slate-900/95 lg:hidden">
        {mobileActionsOpen && (
          <div id="mobile-article-actions" className="flex items-stretch" aria-label="文章快捷操作">
            <button type="button" onClick={scrollToComments} className="flex min-h-12 items-center gap-2 px-3 text-slate-500 transition hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue dark:text-slate-400" aria-label="查看评论">
              <MessageSquare className="h-5 w-5" aria-hidden />
              <span className="text-xs">评论 {commentsLoadError ? '—' : commentsTotalElements || 0}</span>
            </button>
            <button type="button" onClick={copyArticleLink} className="flex min-h-12 items-center gap-2 border-l border-slate-200 px-3 text-slate-500 transition hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue dark:border-slate-700 dark:text-slate-400" aria-label="复制文章链接">
              <Share2 className="h-5 w-5" aria-hidden />
              <span className="text-xs">复制链接</span>
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => setMobileActionsOpen((open) => !open)}
          className={`flex min-h-12 min-w-12 items-center justify-center text-slate-500 transition hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue dark:text-slate-400 ${mobileActionsOpen ? 'border-l border-slate-200 dark:border-slate-700' : ''}`}
          aria-controls="mobile-article-actions"
          aria-expanded={mobileActionsOpen}
          aria-label={mobileActionsOpen ? '收起文章操作' : '展开文章操作'}
        >
          {mobileActionsOpen
            ? <ChevronRight className="h-5 w-5" aria-hidden />
            : <ChevronLeft className="h-5 w-5" aria-hidden />}
        </button>
      </div>

      <SEO article={article} />
      <div className="mx-auto max-w-[76rem] pb-[calc(1rem+env(safe-area-inset-bottom))] pt-4 sm:pb-4 lg:pb-8 lg:pt-6">
        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-8 xl:justify-center min-[1400px]:left-[5rem] min-[1400px]:gap-24">
          <div className="min-w-0 flex-1 xl:w-[50rem] xl:flex-none">
            <article className="pb-2.5 pt-0 sm:pb-5 lg:pb-0">
              <div className="relative">
                <div className="min-[1400px]:fixed min-[1400px]:left-[calc(50%_-_42.25rem)] min-[1400px]:right-auto min-[1400px]:top-7 min-[1400px]:z-40">
                  <Link to={returnTo} className="relative inline-flex min-h-11 items-start whitespace-nowrap rounded-lg pt-2 text-sm font-medium leading-[1.1] text-slate-500 transition hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-slate-400">
                    <ChevronLeft className="absolute right-full top-2 h-5 w-5" aria-hidden />
                    <span>返回文章列表</span>
                  </Link>
                </div>
                <div className="flex flex-col items-start gap-3 border-t border-slate-200 pt-2 sm:flex-row sm:justify-between lg:border-t-0 dark:border-slate-700">
                  <div className="w-full min-w-0 flex-1">
                    <h1 className="display-type break-words whitespace-normal text-3xl font-bold leading-[1.1] tracking-[-0.035em] text-slate-950 sm:text-4xl sm:leading-[1.1] lg:text-[2.7rem] lg:leading-[1.1] dark:text-white">
                      {article.title}
                    </h1>
                  </div>
                </div>
              </div>

              {/* Article metadata */}
              <div className="mb-2.5 flex min-h-10 flex-wrap items-center gap-x-4 gap-y-1 border-b border-slate-200 text-sm text-slate-500 sm:min-h-11 sm:gap-x-5 sm:gap-y-2 dark:border-slate-700 dark:text-slate-400">
                <span className="flex items-center gap-1.5"><Calendar className="h-3.5 w-3.5" aria-hidden />{new Date(article.createdAt).toLocaleDateString()}</span>
                {(article.category?.name || article.tags?.length) && (
                  <div className="flex flex-wrap items-center gap-2">
                    {article.category?.name && <Link to={`/category/${article.category.id}`} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue sm:min-h-11 sm:min-w-11">{article.category.name}</Link>}
                    {article.tags?.map((tag) => <Link key={tag.id} to={`/tag/${tag.id}`} className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue sm:min-h-11 sm:min-w-11">#{tag.name}</Link>)}
                  </div>
                )}
              </div>

              <div className="mb-[9px] lg:hidden">
                <TableOfContents content={article.content ?? ''} collapsible />
              </div>

              {/* Article content with heading IDs for TOC */}
              <div className="article-prose prose w-full !max-w-none prose-slate prose-headings:scroll-mt-0 prose-pre:bg-transparent prose-pre:p-0 dark:prose-invert">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm, remarkHeadingIds]}
                  components={{
                    h1: ({ node, children, ...props }) => {
                      void node
                      return <h2 {...props}>{children}</h2>
                    },
                    table: ({ node, children, ...props }) => {
                      void node
                      return (
                        <div className="max-w-full overflow-x-auto pb-2" tabIndex={0} role="region" aria-label="文章表格，可横向滚动">
                          <table {...props}>{children}</table>
                        </div>
                      )
                    },
                    code({ inline, className, children, ...props }: { inline?: boolean; className?: string; children?: any; [key: string]: any }) {
                      const match = /language-(\w+)/.exec(className || '')
                      const codeString = String(children ?? '').replace(/\n$/, '')
                      const lang = match?.[1] ?? 'text'
                      return !inline && match ? (
                        <div className="my-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950">
                          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-2 font-mono text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
                            <span>{lang.toUpperCase()}</span>
                            <button type="button" onClick={() => copyToClipboard(codeString)} className="min-h-11 rounded-xl px-2 transition-colors hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue">
                              复制代码
                            </button>
                          </div>
                          <SyntaxHighlighter {...props} style={isDark ? oneDark : oneLight} language={lang} PreTag="div" customStyle={{ margin: 0, padding: '1.5rem', fontSize: '0.9rem', lineHeight: '1.65', backgroundColor: 'transparent' }}>
                            {codeString}
                          </SyntaxHighlighter>
                        </div>
                      ) : (
                        <code {...props} className="px-1.5 py-0.5 font-mono text-sm">{children}</code>
                      )
                    }
                  }}
                >
                  {article.content ?? ''}
                </ReactMarkdown>
              </div>

            </article>

            {/* ========== Comment Section ========== */}
            <section ref={commentSectionRef} tabIndex={-1} aria-labelledby="comments-title" className="mt-0 border-t border-slate-200 sm:mt-2 dark:border-slate-700">
              <div className="flex min-h-12 items-center justify-between gap-4">
                <h2 id="comments-title" className="text-xl font-bold text-slate-950 dark:text-white">评论 <span className="font-normal text-slate-500 dark:text-slate-400">{commentsTotalElements}</span></h2>
                <div className="hidden items-center text-sm lg:flex">
                  <button type="button" onClick={() => copyToClipboard(window.location.href, '链接已复制')} className="flex min-h-11 items-center gap-2 rounded-xl text-slate-500 transition-colors hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-slate-400">
                    <Share2 className="h-4 w-4" aria-hidden />
                    <span>复制链接</span>
                  </button>
                </div>
              </div>

              {/* Comment form */}
              <form onSubmit={handleSubmitComment} className="border-y border-slate-200 py-3 dark:border-slate-700">
                <div>
                  <div className="mb-1.5 flex items-center justify-between gap-3">
                    <label htmlFor="comment-content" className="text-xs font-semibold text-slate-700 dark:text-slate-200">评论内容</label>
                    <span className="utility-type text-[11px] text-slate-500 dark:text-slate-400" aria-hidden>
                      {commentContent.length} / 1000
                    </span>
                  </div>
                  <textarea
                    id="comment-content"
                    required
                    value={commentContent}
                    onChange={(e) => {
                      setCommentContent(e.target.value)
                      setCommentError('')
                    }}
                    maxLength={1000}
                    placeholder="写下你的想法或问题"
                    rows={4}
                    aria-invalid={!!commentError && commentError !== '请填写昵称'}
                    aria-describedby={commentError && commentError !== '请填写昵称' ? 'comment-error' : undefined}
                    className="control-field block w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
                  />
                </div>
                <div className="mt-3 flex flex-col gap-2.5 sm:flex-row sm:items-end">
                  <div className="min-w-0 flex-1">
                    <label htmlFor="comment-guest-name" className="mb-1.5 block text-xs font-semibold text-slate-700 dark:text-slate-200">你的昵称</label>
                    <input
                      id="comment-guest-name"
                      required
                      value={guestName}
                      onChange={(e) => {
                        setGuestName(e.target.value)
                        setCommentError('')
                      }}
                      maxLength={30}
                      autoComplete="name"
                      placeholder="怎么称呼你"
                      aria-invalid={commentError === '请填写昵称'}
                      aria-describedby={commentError === '请填写昵称' ? 'comment-error' : undefined}
                      className="control-field h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-500 focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-400 dark:focus:ring-blue-400/20"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!guestName.trim() || !commentContent.trim() || commentSubmitting}
                    className="flex min-h-11 w-full shrink-0 items-center justify-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto dark:bg-white dark:text-slate-950 dark:hover:bg-blue-300 dark:focus-visible:ring-offset-slate-900"
                  >
                    <Send className="h-4 w-4" />
                    {commentSubmitting ? '提交中…' : '提交审核'}
                  </button>
                </div>
                {commentError && <p id="comment-error" className="mt-2 text-sm text-red-600 dark:text-red-400" role="alert">{commentError}</p>}
              </form>

              {/* Threaded comment list */}
              {commentsLoading ? (
                <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500 dark:text-slate-400" role="status">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" aria-hidden />
                  正在加载评论…
                </div>
              ) : commentsLoadError ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <AlertTriangle className="h-8 w-8 text-amber-500" aria-hidden />
                  <p className="mt-3 text-sm font-medium text-slate-700 dark:text-slate-200">评论暂时加载失败</p>
                  <button
                    type="button"
                    onClick={() => refetchComments()}
                    className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-brand-blue transition hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:border-slate-600 dark:hover:bg-blue-500/10"
                  >
                    <RefreshCw className="h-4 w-4" aria-hidden />
                    重新加载评论
                  </button>
                </div>
              ) : threadedComments.length > 0 ? (
                <div className="space-y-0">
                  {threadedComments.map((comment) => (
                    <div key={comment.id} className="border-b border-slate-200 pb-2 dark:border-slate-700">
                      {renderComment(comment)}
                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="space-y-0">
                          {comment.replies.slice(0, 3).map((reply) => renderComment(reply, true))}
                          {comment.replies.length > 3 && (
                            <ReplyExpander replies={comment.replies.slice(3)} renderComment={renderComment} />
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Pagination */}
                  {commentsTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 pt-4">
                      <button type="button" onClick={() => setCommentsPage(p => p - 1)} disabled={commentsPage === 0} className="flex min-h-11 items-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-brand-blue hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300">
                        <ChevronUp className="h-4 w-4" /> 上一页
                      </button>
                      <span className="text-sm text-slate-500 dark:text-slate-400">{commentsPage + 1} / {commentsTotalPages}</span>
                      <button type="button" onClick={() => setCommentsPage(p => p + 1)} disabled={commentsPage >= commentsTotalPages - 1} className="flex min-h-11 items-center gap-1 rounded-xl border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:border-brand-blue hover:text-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-600 dark:text-slate-300">
                        下一页 <ChevronDown className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="pb-4 pt-3 text-center text-slate-500 dark:text-slate-400 lg:pb-0">还没有评论</div>
              )}
            </section>
          </div>

          {/* ========== Sidebar ========== */}
          <aside className="sticky top-0 hidden max-h-[calc(100vh-2rem)] w-72 shrink-0 self-start space-y-2 overflow-y-auto pr-1 lg:block">
            {/* Dynamic Table of Contents */}
            <TableOfContents content={article.content ?? ''} />

            {/* Related articles */}
            {relatedArticles.length > 0 && (
              <section className="border-y border-slate-200 pt-2 dark:border-slate-700">
                <h2 className="mb-1.5 text-sm font-bold text-slate-950 dark:text-white">继续阅读</h2>
                <div className="border-l border-slate-200 pl-2 divide-y divide-slate-200 dark:border-slate-700 dark:divide-slate-700">
                  {relatedArticles.map((related) => (
                    <Link key={related.id} to={`/article/${related.id}`} state={articleLinkState} className="group block py-1 first:pt-0">
                      <p className="line-clamp-2 text-sm font-medium leading-4 text-slate-700 transition-colors group-hover:text-brand-blue dark:text-slate-300">{related.title}</p>
                      <div className="mt-0.5 flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                        <span>{new Date(related.createdAt).toLocaleDateString()}</span>
                        <span>·</span>
                        <span>{related.views ?? 0} 阅读</span>
                      </div>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </aside>
        </div>
      </div>
    </>
  )
}

// Sub-component: expandable replies (> 3)
const ReplyExpander: React.FC<{
  replies: Comment[]
  renderComment: (c: Comment, isReply: boolean) => React.ReactNode
}> = ({ replies, renderComment }) => {
  const [expanded, setExpanded] = useState(false)

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="ml-4 mt-2 flex min-h-11 items-center gap-1 rounded-xl px-1 text-xs text-brand-blue hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue sm:ml-10"
      >
        <ChevronDown className="h-3.5 w-3.5" />
        展开其余 {replies.length} 条回复
      </button>
    )
  }

  return (
    <>
      {replies.map((reply) => renderComment(reply, true))}
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="ml-4 mt-2 flex min-h-11 items-center gap-1 rounded-xl px-1 text-xs text-brand-blue hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue sm:ml-10"
      >
        <ChevronUp className="h-3.5 w-3.5" />
        收起回复
      </button>
    </>
  )
}

export default ArticleDetail
