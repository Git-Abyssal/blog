import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import {
  AlertTriangle,
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  Loader2,
  RefreshCw,
  Reply,
  Send,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react'
import type { Comment } from '@shared/types'
import { useToast } from '@shared/hooks/useToast'
import { useDialogFocus } from '@shared/hooks/useDialogFocus'
import { useRefreshOnWindowFocus } from '@shared/hooks/useRefreshOnWindowFocus'

type CommentFilter = 'pending' | 'approved'

interface PageResponse {
  content: Comment[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

const PAGE_SIZE = 10

const filters: Array<{ value: CommentFilter; label: string }> = [
  { value: 'pending', label: '待审核' },
  { value: 'approved', label: '已公开' },
]

const AdminComments: React.FC = () => {
  const [comments, setComments] = useState<Comment[]>([])
  const [filter, setFilter] = useState<CommentFilter>('pending')
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [refreshVersion, setRefreshVersion] = useState(0)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Comment | null>(null)
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [replying, setReplying] = useState(false)
  const requestIdRef = useRef(0)
  const { success, error } = useToast()
  const deleteDialogRef = useDialogFocus<HTMLDivElement>(!!confirmDelete)
  const replyDialogRef = useDialogFocus<HTMLDivElement>(!!replyingTo)

  const fetchComments = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setLoadError(false)
    try {
      const params: Record<string, string | number> = {
        page,
        size: PAGE_SIZE,
        status: filter,
      }
      const response = await axios.get<PageResponse>('/api/admin/comments', {
        params,
      })
      if (requestId !== requestIdRef.current) return
      const nextTotalPages = response.data.totalPages ?? 0
      if (page > 0 && page >= nextTotalPages) {
        setPage(Math.max(0, nextTotalPages - 1))
        return
      }
      setComments(response.data.content ?? [])
      setTotalElements(response.data.totalElements ?? 0)
      setTotalPages(nextTotalPages)
    } catch {
      if (requestId !== requestIdRef.current) return
      setLoadError(true)
      error('评论列表加载失败')
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [error, filter, page])

  useEffect(() => {
    fetchComments()
  }, [fetchComments, refreshVersion])

  useRefreshOnWindowFocus(fetchComments)

  useEffect(() => {
    if (!confirmDelete) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !deletingId) setConfirmDelete(null)
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [confirmDelete, deletingId])

  useEffect(() => {
    if (!replyingTo) return
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !replying) setReplyingTo(null)
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [replying, replyingTo])

  const changeFilter = (nextFilter: CommentFilter) => {
    if (nextFilter === filter) {
      void fetchComments()
      return
    }
    setFilter(nextFilter)
    setPage(0)
  }

  const approveComment = async (commentId: number) => {
    setApprovingId(commentId)
    try {
      await axios.post(`/api/admin/comments/${commentId}/approve`)
      success('评论已公开')
      setRefreshVersion((version) => version + 1)
    } catch {
      error('审核失败，请稍后重试')
    } finally {
      setApprovingId(null)
    }
  }

  const deleteComment = async (commentId: number) => {
    setDeletingId(commentId)
    try {
      await axios.delete(`/api/admin/comments/${commentId}`)
      setConfirmDelete(null)
      success('评论已删除')
      setRefreshVersion((version) => version + 1)
    } catch {
      error('删除失败，请稍后重试')
    } finally {
      setDeletingId(null)
    }
  }

  const submitReply = async (event: React.FormEvent) => {
    event.preventDefault()
    const content = replyContent.trim()
    if (!replyingTo?.articleId || !content) return
    setReplying(true)
    try {
      await axios.post(
        `/api/comments/article/${replyingTo.articleId}`,
        { content, parentId: replyingTo.id },
      )
      setReplyingTo(null)
      setReplyContent('')
      success('回复已发布')
      setRefreshVersion((version) => version + 1)
    } catch {
      error('回复失败，请稍后重试')
    } finally {
      setReplying(false)
    }
  }

  const formatDate = (value?: string | null) => {
    if (!value) return '-'
    return new Date(value).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  return (
    <>
      {confirmDelete && (
        <div
          ref={deleteDialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/55 p-4"
          onClick={() => !deletingId && setConfirmDelete(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-comment-title"
        >
          <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900" onClick={(event) => event.stopPropagation()}>
            <div className="flex items-start gap-4 p-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                <AlertTriangle className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="delete-comment-title" className="font-bold text-slate-950 dark:text-white">删除这条评论？</h2>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-slate-400">删除后无法恢复，公开页面也会立即移除。</p>
              </div>
              <button type="button" onClick={() => setConfirmDelete(null)} disabled={!!deletingId} aria-label="关闭" className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-slate-400 dark:hover:bg-slate-800">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-700">
              <button type="button" data-dialog-autofocus onClick={() => setConfirmDelete(null)} disabled={!!deletingId} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:border-slate-700 dark:text-slate-200">取消</button>
              <button type="button" onClick={() => deleteComment(confirmDelete.id)} disabled={!!deletingId} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-red-700 px-4 py-2 text-sm font-semibold text-white hover:bg-red-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-50">
                {deletingId === confirmDelete.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Trash2 className="h-4 w-4" aria-hidden />}
                删除评论
              </button>
            </div>
          </div>
        </div>
      )}

      {replyingTo && (
        <div
          ref={replyDialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-slate-950/55 p-4"
          onClick={() => !replying && setReplyingTo(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reply-comment-title"
        >
          <form className="w-full max-w-lg overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900" onClick={(event) => event.stopPropagation()} onSubmit={submitReply}>
            <div className="flex items-start gap-4 p-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-brand-blue dark:bg-blue-500/10 dark:text-blue-300">
                <Reply className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="reply-comment-title" className="font-bold text-slate-950 dark:text-white">
                  回复 {replyingTo.ownerComment ? '站长' : (replyingTo.guestName || '访客')}
                </h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500 dark:text-slate-400">{replyingTo.content}</p>
              </div>
              <button type="button" onClick={() => setReplyingTo(null)} disabled={replying} aria-label="关闭" className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-slate-400 dark:hover:bg-slate-800">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <div className="border-t border-slate-100 px-6 py-5 dark:border-slate-700">
              <label htmlFor="admin-comment-reply" className="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-200">回复内容</label>
              <textarea
                id="admin-comment-reply"
                data-dialog-autofocus
                required
                maxLength={10000}
                rows={5}
                value={replyContent}
                onChange={(event) => setReplyContent(event.target.value)}
                className="control-field w-full resize-y rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/15 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:focus:border-blue-400"
              />
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-700">
              <button type="button" onClick={() => setReplyingTo(null)} disabled={replying} className="min-h-11 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:border-slate-700 dark:text-slate-200">取消</button>
              <button type="submit" disabled={replying || !replyContent.trim()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-50">
                {replying ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Send className="h-4 w-4" aria-hidden />}
                发布回复
              </button>
            </div>
          </form>
        </div>
      )}

      <section aria-busy={loading} className="admin-list-page flex min-h-0 flex-1 flex-col">
        <header>
          <div className="flex min-h-16 flex-wrap items-center gap-x-3 gap-y-1 border-b border-slate-200/90 dark:border-slate-800">
            <h1 className="admin-page-title text-xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">评论管理</h1>
            {!loading && !loadError && (
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400" aria-live="polite">
                共 {totalElements} 条评论
              </span>
            )}
          </div>

          <div className="admin-tabs category-scroll mt-2 flex items-center gap-1.5 overflow-x-auto border-b border-slate-200/90 dark:border-slate-800" role="group" aria-label="评论筛选">
            {filters.map((item) => {
              const active = filter === item.value
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => changeFilter(item.value)}
                  disabled={loading}
                  aria-pressed={active}
                  className={`relative min-h-11 shrink-0 rounded-xl px-3 py-2 text-center text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:cursor-wait disabled:opacity-60 ${
                    active
                      ? 'text-slate-950 dark:text-white'
                      : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                  {active && <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-brand-blue" aria-hidden />}
                </button>
              )
            })}
          </div>
        </header>

        <div className="flex-1 pb-8">
          {loading ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3 text-slate-600 dark:text-slate-400" role="status">
              <Loader2 className="h-8 w-8 animate-spin text-brand-blue" aria-hidden />
              <p className="text-sm">加载中</p>
            </div>
          ) : loadError ? (
            <div className="flex min-h-48 flex-col items-center justify-center border-y border-red-200 px-4 text-center dark:border-red-900/60" role="alert">
              <AlertCircle className="h-10 w-10 text-red-500" aria-hidden />
              <h2 className="mt-4 font-bold text-slate-900 dark:text-white">评论列表暂时加载失败</h2>
              <button type="button" onClick={fetchComments} className="admin-action admin-action-primary mt-5 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue">
                <RefreshCw className="h-4 w-4" aria-hidden /> 重新加载
              </button>
            </div>
          ) : comments.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center border-y border-slate-200 px-4 text-center dark:border-slate-700">
              <ShieldCheck className="h-10 w-10 text-emerald-500" aria-hidden />
              <h2 className="mt-4 font-bold text-slate-900 dark:text-white">{filter === 'pending' ? '没有待审核评论' : '这里还没有评论'}</h2>
            </div>
          ) : (
            <ul className="admin-list divide-y divide-slate-200/90 border-b border-slate-200/90 dark:divide-slate-800 dark:border-slate-800">
              {comments.map((comment) => {
                const pending = comment.status === 'pending'
                const displayName = comment.ownerComment ? '站长' : (comment.guestName || '访客')
                return (
                  <li key={comment.id} className="overflow-hidden transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/55">
                    <div className="flex flex-col gap-2.5 py-2.5 pl-3 pr-[0.1875rem] lg:flex-row lg:items-center">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-bold text-slate-950 dark:text-white">{displayName}</span>
                          {!comment.ownerComment && <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-500 dark:bg-slate-800 dark:text-slate-300">访客</span>}
                          <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-bold ${pending ? 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'}`}>
                            {pending ? <Clock className="h-3 w-3" aria-hidden /> : <CheckCircle className="h-3 w-3" aria-hidden />}
                            {pending ? '待审核' : '已公开'}
                          </span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">{formatDate(comment.createdAt)}</span>
                        </div>
                        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700 dark:text-slate-200">{comment.content}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <span>文章：</span>
                          {comment.articleId ? (
                            <span className="max-w-xs truncate font-medium text-slate-600 dark:text-slate-300">
                              {comment.articleTitle || `文章 #${comment.articleId}`}
                            </span>
                          ) : (
                            <span>{comment.articleTitle || '未知文章'}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-0.5 border-t border-slate-200 pt-2 lg:border-t-0 lg:pt-0 dark:border-slate-800">
                        {pending && (
                          <button type="button" onClick={() => approveComment(comment.id)} disabled={approvingId === comment.id} className="admin-action admin-action-compact admin-action-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-50">
                            {approvingId === comment.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <CheckCircle className="h-4 w-4" aria-hidden />}
                            通过
                          </button>
                        )}
                        {!pending && comment.articleId && (
                          <button
                            type="button"
                            onClick={() => {
                              setReplyingTo(comment)
                              setReplyContent('')
                            }}
                            className="admin-action admin-action-compact text-brand-blue hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-blue-300 dark:hover:bg-blue-500/10"
                          >
                            <Reply className="h-4 w-4" aria-hidden /> 回复
                          </button>
                        )}
                        <button type="button" onClick={() => setConfirmDelete(comment)} disabled={!!deletingId} className="admin-action admin-action-compact admin-action-danger focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-50">
                          <Trash2 className="h-4 w-4" aria-hidden /> 删除
                        </button>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}

          {!loading && !loadError && totalPages > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2 sm:justify-end sm:gap-3 sm:px-3">
              <button type="button" onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={loading || page === 0} className="admin-action admin-action-compact admin-action-secondary min-w-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-40">
                <ChevronLeft className="h-4 w-4" aria-hidden />
                <span className="sr-only sm:not-sr-only">上一页</span>
              </button>
              <span className="text-sm text-slate-500 dark:text-slate-400">{page + 1} / {totalPages}</span>
              <button type="button" onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))} disabled={loading || page >= totalPages - 1} className="admin-action admin-action-compact admin-action-secondary min-w-10 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-40">
                <span className="sr-only sm:not-sr-only">下一页</span>
                <ChevronRight className="h-4 w-4" aria-hidden />
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  )
}

export default AdminComments
