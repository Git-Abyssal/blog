import React, { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { FolderTree, Plus, Trash2, AlertTriangle, X, CheckCircle, Pencil, RefreshCw, GripVertical } from 'lucide-react'
import type { Category } from '@shared/types'
import { useToast } from '@shared/hooks/useToast'
import { useDialogFocus } from '@shared/hooks/useDialogFocus'
import { useRefreshOnWindowFocus } from '@shared/hooks/useRefreshOnWindowFocus'
import Pagination from '@shared/components/Pagination'

interface PageResponse {
  content: Category[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}

const PAGE_SIZE = 10

const AdminCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [newName, setNewName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<Category | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [editName, setEditName] = useState('')
  const [editError, setEditError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [sorting, setSorting] = useState(false)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const newNameRef = useRef<HTMLInputElement>(null)
  const requestIdRef = useRef(0)
  const currentOrderRef = useRef<Category[]>([])
  const dragStartOrderRef = useRef<Category[]>([])
  const draggedIdRef = useRef<number | null>(null)
  const { error: showError } = useToast()
  const deleteDialogRef = useDialogFocus<HTMLDivElement>(!!confirmDelete)
  const editDialogRef = useDialogFocus<HTMLDivElement>(!!editingCategory)

  const fetchCategories = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setLoadError(false)
    try {
      const res = await axios.get<PageResponse>('/api/admin/categories', {
        params: { page, size: PAGE_SIZE },
      })
      if (requestId !== requestIdRef.current) return
      const nextTotalPages = res.data.totalPages ?? 0
      if (page > 0 && page >= nextTotalPages) {
        setPage(Math.max(0, nextTotalPages - 1))
        return
      }
      setCategories(res.data.content ?? [])
      currentOrderRef.current = res.data.content ?? []
      setTotalPages(nextTotalPages)
      setTotalElements(res.data.totalElements ?? 0)
    } catch {
      if (requestId !== requestIdRef.current) return
      setLoadError(true)
      showError('加载分类列表失败')
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [page, showError])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useRefreshOnWindowFocus(fetchCategories)

  useEffect(() => {
    if (!confirmDelete) return
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !deletingId) setConfirmDelete(null)
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [confirmDelete, deletingId])

  useEffect(() => {
    if (!editingCategory) return
    const onEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !updatingId) closeEdit()
    }
    window.addEventListener('keydown', onEscape)
    return () => window.removeEventListener('keydown', onEscape)
  }, [editingCategory, updatingId])

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
    if (!createError) return
    const t = setTimeout(() => setCreateError(null), 2500)
    return () => clearTimeout(t)
  }, [createError])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newName.trim()
    if (!name) {
      setCreateError('请输入分类名称')
      window.requestAnimationFrame(() => newNameRef.current?.focus())
      return
    }
    setCreateError(null)
    setSubmitting(true)
    try {
      await axios.post('/api/categories', { name })
      setNewName('')
      if (page === 0) {
        await fetchCategories()
      } else {
        setPage(0)
      }
      setSuccessMessage('分类已添加')
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object') {
        const data = err.response.data as Record<string, unknown>
        const msg = typeof data.message === 'string' ? data.message : undefined
        if (msg) {
          showError(msg)
        } else if (err.response?.status === 403) {
          showError('无权限，请使用站长账号')
        } else {
          showError('添加失败，请稍后重试')
        }
      } else {
        showError('添加失败，请稍后重试')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const doDelete = useCallback(async (id: number) => {
    setDeletingId(id)
    try {
      await axios.delete(`/api/categories/${id}`)
      await fetchCategories()
      setConfirmDelete(null)
      setSuccessMessage('分类已删除')
    } catch {
      showError('删除失败，请稍后重试')
    } finally {
      setDeletingId(null)
    }
  }, [fetchCategories, showError])

  const openDeleteConfirm = (cat: Category) => setConfirmDelete(cat)
  const closeDeleteConfirm = () => {
    if (!deletingId) setConfirmDelete(null)
  }

  const openEdit = (cat: Category) => {
    setEditingCategory(cat)
    setEditName(cat.name)
    setEditError(null)
  }
  const closeEdit = () => {
    if (!updatingId) {
      setEditingCategory(null)
      setEditName('')
      setEditError(null)
    }
  }
  const doUpdate = async () => {
    if (!editingCategory) return
    const name = editName.trim()
    if (!name) {
      setEditError('请输入分类名称')
      return
    }
    setEditError(null)
    setUpdatingId(editingCategory.id)
    try {
      await axios.put(`/api/categories/${editingCategory.id}`, { name })
      await fetchCategories()
      setEditingCategory(null)
      setEditName('')
      setSuccessMessage('分类已更新')
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object') {
        const data = err.response.data as Record<string, unknown>
        const msg = typeof data.message === 'string' ? data.message : undefined
        setEditError(msg || (err.response?.status === 404 ? '分类不存在' : '更新失败，请稍后重试'))
      } else {
        setEditError('更新失败，请稍后重试')
      }
    } finally {
      setUpdatingId(null)
    }
  }

  const persistCategoryOrder = async (nextOrder: Category[], previousOrder: Category[]) => {
    if (nextOrder.map(({ id }) => id).join(',') === previousOrder.map(({ id }) => id).join(',')) return
    setSorting(true)
    try {
      await axios.put(
        '/api/admin/categories/reorder',
        { orderedIds: nextOrder.map(({ id }) => id) },
      )
      setSuccessMessage('分类排序已保存')
    } catch {
      currentOrderRef.current = previousOrder
      setCategories(previousOrder)
      showError('分类排序保存失败，已恢复原顺序')
    } finally {
      setSorting(false)
    }
  }

  const moveDraggedCategory = (targetId: number) => {
    const draggedId = draggedIdRef.current
    if (draggedId === null || draggedId === targetId) return
    setCategories((current) => {
      const fromIndex = current.findIndex(({ id }) => id === draggedId)
      const toIndex = current.findIndex(({ id }) => id === targetId)
      if (fromIndex < 0 || toIndex < 0) return current
      const next = [...current]
      const [dragged] = next.splice(fromIndex, 1)
      next.splice(toIndex, 0, dragged)
      currentOrderRef.current = next
      return next
    })
  }

  const handleCategoryDragStart = (event: React.DragEvent, id: number) => {
    if (sorting) {
      event.preventDefault()
      return
    }
    draggedIdRef.current = id
    dragStartOrderRef.current = currentOrderRef.current
    setDraggingId(id)
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(id))
  }

  const handleCategoryDragEnd = () => {
    const nextOrder = currentOrderRef.current
    const previousOrder = dragStartOrderRef.current
    draggedIdRef.current = null
    setDraggingId(null)
    void persistCategoryOrder(nextOrder, previousOrder)
  }

  const handleCategorySortKey = (event: React.KeyboardEvent, id: number) => {
    if (sorting || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
    const previousOrder = currentOrderRef.current
    const fromIndex = previousOrder.findIndex((category) => category.id === id)
    const toIndex = event.key === 'ArrowUp' ? fromIndex - 1 : fromIndex + 1
    if (fromIndex < 0 || toIndex < 0 || toIndex >= previousOrder.length) return
    event.preventDefault()
    const nextOrder = [...previousOrder]
    const [moved] = nextOrder.splice(fromIndex, 1)
    nextOrder.splice(toIndex, 0, moved)
    currentOrderRef.current = nextOrder
    setCategories(nextOrder)
    void persistCategoryOrder(nextOrder, previousOrder)
  }

  return (
    <div className="flex h-full flex-col">
      {/* 删除确认弹窗 */}
      {confirmDelete && (
        <div
          ref={deleteDialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-delete-title"
        >
          <div
            className="absolute inset-0 bg-slate-950/55"
            onClick={closeDeleteConfirm}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-start gap-4 p-6">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
                <AlertTriangle className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 id="confirm-delete-title" className="text-lg font-bold text-slate-950 dark:text-white">
                  删除分类
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-400">
                  确定要删除「<span className="font-semibold text-slate-950 dark:text-white">{confirmDelete.name}</span>」吗？该分类下的文章将变为未分类。
                </p>
              </div>
              <button
                type="button"
                data-dialog-autofocus
                onClick={closeDeleteConfirm}
                disabled={!!deletingId}
                className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white disabled:opacity-50"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
              <button
                type="button"
                onClick={closeDeleteConfirm}
                disabled={!!deletingId}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:opacity-50"
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
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-slate-950 dark:border-t-transparent" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}{' '}
                确定删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 编辑分类弹窗 */}
      {editingCategory && (
        <div
          ref={editDialogRef}
          tabIndex={-1}
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-category-title"
        >
          <div
            className="absolute inset-0 bg-slate-950/55"
            onClick={closeEdit}
            aria-hidden="true"
          />
          <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-300 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
            <div className="p-6">
              <div className="flex items-center justify-between gap-4">
                <h3 id="edit-category-title" className="text-lg font-bold text-slate-950 dark:text-white">
                  编辑分类
                </h3>
                <button
                  type="button"
                  onClick={closeEdit}
                  disabled={!!updatingId}
                  className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white disabled:opacity-50"
                  aria-label="关闭"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <label htmlFor="edit-category-name" className="mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-300">
                分类名称
              </label>
              <input
                id="edit-category-name"
                data-dialog-autofocus
                type="text"
                value={editName}
                onChange={(e) => {
                  setEditName(e.target.value)
                  setEditError(null)
                }}
                maxLength={50}
                aria-invalid={!!editError}
                aria-describedby={editError ? 'edit-category-error' : undefined}
                className="control-field mt-2 h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none transition-colors placeholder:text-slate-500 hover:border-slate-400 focus:border-brand-blue focus:ring-1 focus:ring-brand-blue dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-400 dark:focus:ring-blue-400"
              />
              {editError && (
                <p id="edit-category-error" className="mt-2 text-sm text-amber-700 dark:text-amber-400" role="alert">{editError}</p>
              )}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-200 px-6 py-4 dark:border-slate-700">
              <button
                type="button"
                onClick={closeEdit}
                disabled={!!updatingId}
                className="min-h-11 rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition-colors hover:border-slate-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 disabled:opacity-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={doUpdate}
                disabled={!!updatingId}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-blue focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:opacity-50 dark:bg-white dark:text-slate-950 dark:hover:bg-blue-300"
              >
                {updatingId === editingCategory.id ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : null}{' '}
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 操作成功弱提示 - 顶部居中 */}
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

      {/* 请输入分类名称等提示 - 顶部居中，样式与成功提示一致 */}
      {createError && (
        <div
          className="fixed left-1/2 right-auto top-20 z-[300] flex w-[calc(100%-2rem)] max-w-xs -translate-x-1/2 items-center gap-3 rounded-2xl border border-amber-200 bg-white px-4 py-3 shadow-[0_12px_32px_-20px_rgba(15,23,42,0.45)] dark:border-amber-900 dark:bg-slate-900"
          role="alert"
          aria-live="assertive"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-500/10 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <span className="text-sm text-slate-700 dark:text-slate-200">{createError}</span>
        </div>
      )}

      <section aria-busy={loading} className="admin-list-page flex min-h-0 flex-1 flex-col">
        <header className="flex min-h-16 shrink-0 items-center border-b border-slate-200/90 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="admin-page-title text-xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">分类管理</h1>
            {!loading && !loadError && (
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400" aria-live="polite">
                共 {totalElements} 个分类
              </span>
            )}
          </div>
        </header>

      <div className="flex-1 overflow-auto pb-8 pt-4">
        {loading ? (
          <div className="flex min-h-48 flex-col items-center justify-center gap-3" role="status">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" aria-hidden />
            <span className="text-sm text-slate-500 dark:text-slate-400">加载中</span>
          </div>
        ) : loadError ? (
          <div className="flex min-h-48 flex-col items-center justify-center border-y border-red-200 text-center dark:border-red-900/60" role="alert">
            <AlertTriangle className="h-9 w-9 text-red-500" aria-hidden />
            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">分类列表加载失败</p>
            <button
              type="button"
              onClick={() => {
                setLoading(true)
                fetchCategories()
              }}
              className="admin-action admin-action-secondary mt-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
            >
              <RefreshCw className="h-4 w-4" aria-hidden />
              重新加载
            </button>
          </div>
        ) : (
          <>
            <form onSubmit={handleCreate} className="w-full border-b border-slate-200/90 px-3 pb-4 dark:border-slate-800">
              <div className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5">
                <input
                  ref={newNameRef}
                  id="admin-category-name"
                  type="text"
                  aria-label="新增分类"
                  placeholder="输入分类名称"
                  value={newName}
                  onChange={(e) => {
                    setNewName(e.target.value)
                    setCreateError(null)
                    setSuccessMessage(null)
                  }}
                  maxLength={50}
                  aria-invalid={!!createError}
                  aria-describedby={createError ? 'create-category-error' : undefined}
                  className={`control-field h-11 w-full min-w-0 rounded-xl border bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-slate-500 focus:ring-4 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400 ${
                    createError
                      ? 'border-amber-400 focus:border-amber-500 focus:ring-amber-500/10 dark:border-amber-600'
                      : 'border-slate-300 hover:border-slate-400 focus:border-brand-blue focus:ring-blue-500/10 dark:border-slate-700 dark:focus:border-blue-400'
                  }`}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  className="admin-action admin-action-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:pointer-events-none disabled:opacity-50"
                >
                  {submitting ? (
                    <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent dark:border-slate-950 dark:border-t-transparent" />
                  ) : (
                    <Plus className="h-4 w-4" />
                  )}{' '}
                  添加
                </button>
              </div>
              {createError && <span id="create-category-error" className="sr-only">{createError}</span>}
            </form>

        <div>
          {categories.length === 0 ? (
            <div className="flex flex-col items-center justify-center border-y border-slate-200 py-10 text-center dark:border-slate-700">
              <FolderTree className="mb-3 h-9 w-9 text-slate-300 dark:text-slate-600" aria-hidden />
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">暂无分类</p>
            </div>
          ) : (
            <ul className="admin-list divide-y divide-slate-200/90 border-b border-slate-200/90 dark:divide-slate-800 dark:border-slate-800">
              {categories.map((cat) => (
                <li
                  key={cat.id}
                  onDragEnter={() => moveDraggedCategory(cat.id)}
                  onDragOver={(event) => {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'move'
                  }}
                  onDrop={(event) => event.preventDefault()}
                  className={`flex items-center justify-between gap-3 py-2.5 pl-1.5 pr-[0.1875rem] transition-[background-color,opacity,box-shadow] hover:bg-slate-50/80 dark:hover:bg-slate-800/60 ${
                    draggingId === cat.id ? 'opacity-50' : ''
                  }`}
                >
                  <span className="flex min-w-0 items-center gap-1.5 break-all font-semibold text-slate-950 dark:text-white">
                    <button
                      type="button"
                      draggable={!sorting}
                      onDragStart={(event) => handleCategoryDragStart(event, cat.id)}
                      onDragEnd={handleCategoryDragEnd}
                      onKeyDown={(event) => handleCategorySortKey(event, cat.id)}
                      disabled={sorting}
                      className="flex h-9 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue active:cursor-grabbing disabled:cursor-wait disabled:opacity-50 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                      aria-label={`拖动排序：${cat.name}`}
                      title="拖动排序，或使用上下方向键"
                    >
                      <GripVertical className="h-4 w-4" aria-hidden />
                    </button>
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-brand-blue dark:border-blue-900 dark:bg-blue-500/10 dark:text-blue-400">
                      <FolderTree className="h-3.5 w-3.5" />
                    </span>
                    {cat.name}
                  </span>
                  <div className="flex shrink-0 items-center justify-end gap-0.5">
                    <button
                      type="button"
                      onClick={() => openEdit(cat)}
                      disabled={deletingId === cat.id || updatingId === cat.id}
                      className="admin-action admin-action-compact font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white disabled:opacity-50"
                    >
                      <Pencil className="h-4 w-4" /> 编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => openDeleteConfirm(cat)}
                      disabled={deletingId === cat.id}
                      className="admin-action admin-action-compact admin-action-danger font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600 disabled:opacity-50"
                    >
                      {deletingId === cat.id ? (
                        <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-red-500 border-t-transparent" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}{' '}
                      删除
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {!loading && !loadError && totalPages > 1 && (
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} disabled={loading} />
          )}
        </div>
          </>
        )}
      </div>
      </section>
    </div>
  )
}

export default AdminCategories
