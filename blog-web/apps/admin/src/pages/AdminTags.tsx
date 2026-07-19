import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import {
  AlertTriangle,
  GripVertical,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Tag as TagIcon,
  Trash2,
  X,
} from 'lucide-react'
import type { Tag } from '@shared/types'
import { useDialogFocus } from '@shared/hooks/useDialogFocus'
import { useRefreshOnWindowFocus } from '@shared/hooks/useRefreshOnWindowFocus'
import { useToast } from '@shared/hooks/useToast'
import Pagination from '@shared/components/Pagination'

interface PageResponse {
  content: Tag[]
  totalElements: number
  totalPages: number
}

const PAGE_SIZE = 10

const AdminTags: React.FC = () => {
  const [tags, setTags] = useState<Tag[]>([])
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [totalElements, setTotalElements] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [newName, setNewName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [editingTag, setEditingTag] = useState<Tag | null>(null)
  const [editName, setEditName] = useState('')
  const [updating, setUpdating] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<Tag | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [sorting, setSorting] = useState(false)
  const [draggingId, setDraggingId] = useState<number | null>(null)
  const requestIdRef = useRef(0)
  const currentOrderRef = useRef<Tag[]>([])
  const dragStartOrderRef = useRef<Tag[]>([])
  const draggedIdRef = useRef<number | null>(null)
  const editDialogRef = useDialogFocus<HTMLFormElement>(!!editingTag)
  const deleteDialogRef = useDialogFocus<HTMLDivElement>(!!confirmDelete)
  const { success, error: showError } = useToast()

  const fetchTags = useCallback(async () => {
    const requestId = ++requestIdRef.current
    setLoading(true)
    setLoadError(false)
    try {
      const res = await axios.get<PageResponse>('/api/admin/tags', {
        params: { page, size: PAGE_SIZE },
      })
      if (requestId !== requestIdRef.current) return
      const nextTotalPages = res.data.totalPages ?? 0
      if (page > 0 && page >= nextTotalPages) {
        setPage(Math.max(0, nextTotalPages - 1))
        return
      }
      setTags(res.data.content ?? [])
      currentOrderRef.current = res.data.content ?? []
      setTotalPages(nextTotalPages)
      setTotalElements(res.data.totalElements ?? 0)
    } catch {
      if (requestId !== requestIdRef.current) return
      setLoadError(true)
      showError('加载标签列表失败')
    } finally {
      if (requestId === requestIdRef.current) setLoading(false)
    }
  }, [page, showError])

  useEffect(() => {
    fetchTags()
  }, [fetchTags])

  useRefreshOnWindowFocus(fetchTags)

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    const name = newName.trim()
    if (!name) {
      showError('请输入标签名称')
      return
    }
    setSubmitting(true)
    try {
      await axios.post('/api/tags', { name })
      setNewName('')
      if (page === 0) await fetchTags()
      else setPage(0)
      success('标签已添加')
    } catch {
      showError('添加标签失败，名称可能已存在')
    } finally {
      setSubmitting(false)
    }
  }

  const openEdit = (tag: Tag) => {
    setEditingTag(tag)
    setEditName(tag.name)
  }

  const handleUpdate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editingTag) return
    const name = editName.trim()
    if (!name) {
      showError('请输入标签名称')
      return
    }
    setUpdating(true)
    try {
      await axios.put(`/api/tags/${editingTag.id}`, { name })
      setEditingTag(null)
      await fetchTags()
      success('标签已更新')
    } catch {
      showError('更新标签失败，名称可能已存在')
    } finally {
      setUpdating(false)
    }
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await axios.delete(`/api/tags/${confirmDelete.id}`)
      setConfirmDelete(null)
      await fetchTags()
      success('标签已删除')
    } catch {
      showError('删除标签失败')
    } finally {
      setDeleting(false)
    }
  }

  const persistTagOrder = async (nextOrder: Tag[], previousOrder: Tag[]) => {
    if (nextOrder.map(({ id }) => id).join(',') === previousOrder.map(({ id }) => id).join(',')) return
    setSorting(true)
    try {
      await axios.put(
        '/api/admin/tags/reorder',
        { orderedIds: nextOrder.map(({ id }) => id) },
      )
      success('标签排序已保存')
    } catch {
      currentOrderRef.current = previousOrder
      setTags(previousOrder)
      showError('标签排序保存失败，已恢复原顺序')
    } finally {
      setSorting(false)
    }
  }

  const moveDraggedTag = (targetId: number) => {
    const draggedId = draggedIdRef.current
    if (draggedId === null || draggedId === targetId) return
    setTags((current) => {
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

  const handleTagDragStart = (event: React.DragEvent, id: number) => {
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

  const handleTagDragEnd = () => {
    const nextOrder = currentOrderRef.current
    const previousOrder = dragStartOrderRef.current
    draggedIdRef.current = null
    setDraggingId(null)
    void persistTagOrder(nextOrder, previousOrder)
  }

  const handleTagSortKey = (event: React.KeyboardEvent, id: number) => {
    if (sorting || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return
    const previousOrder = currentOrderRef.current
    const fromIndex = previousOrder.findIndex((tag) => tag.id === id)
    const toIndex = event.key === 'ArrowUp' ? fromIndex - 1 : fromIndex + 1
    if (fromIndex < 0 || toIndex < 0 || toIndex >= previousOrder.length) return
    event.preventDefault()
    const nextOrder = [...previousOrder]
    const [moved] = nextOrder.splice(fromIndex, 1)
    nextOrder.splice(toIndex, 0, moved)
    currentOrderRef.current = nextOrder
    setTags(nextOrder)
    void persistTagOrder(nextOrder, previousOrder)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <section aria-busy={loading} className="admin-list-page flex min-h-0 flex-1 flex-col">
        <header className="flex min-h-16 shrink-0 items-center border-b border-slate-200/90 dark:border-slate-800">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <h1 className="admin-page-title text-xl font-black tracking-[-0.03em] text-slate-950 dark:text-white">标签管理</h1>
            {!loading && !loadError && (
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400" aria-live="polite">
                共 {totalElements} 个标签
              </span>
            )}
          </div>
        </header>

        <div className="flex-1 overflow-auto pb-8 pt-4">
          {loading ? (
            <div className="flex min-h-48 flex-col items-center justify-center gap-3" role="status">
              <span className="h-8 w-8 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" aria-hidden />
              <span className="text-sm text-slate-500 dark:text-slate-400">加载中</span>
            </div>
          ) : loadError ? (
            <div className="flex min-h-48 flex-col items-center justify-center border-y border-red-200 text-center dark:border-red-900/60" role="alert">
              <AlertTriangle className="h-9 w-9 text-red-500" aria-hidden />
              <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">标签列表加载失败</p>
              <button type="button" onClick={fetchTags} className="admin-action admin-action-secondary mt-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue">
                <RefreshCw className="h-4 w-4" aria-hidden />
                重新加载
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleCreate} className="w-full border-b border-slate-200/90 px-3 pb-4 dark:border-slate-800">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2.5">
                  <input
                    id="admin-tag-name"
                    aria-label="新增标签"
                    value={newName}
                    onChange={(event) => setNewName(event.target.value)}
                    maxLength={30}
                    className="control-field h-11 w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition-[border-color,box-shadow] placeholder:text-slate-500 hover:border-slate-400 focus:border-brand-blue focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-400 dark:focus:border-blue-400"
                    placeholder="输入标签名称"
                  />
                  <button type="submit" disabled={submitting} className="admin-action admin-action-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue disabled:pointer-events-none disabled:opacity-50">
                    <Plus className="h-4 w-4" aria-hidden />
                    {submitting ? '添加中' : '添加'}
                  </button>
                </div>
              </form>

              <div>
                {tags.length === 0 ? (
                  <div className="flex flex-col items-center justify-center border-y border-slate-200 py-10 text-center dark:border-slate-700">
                    <TagIcon className="mb-3 h-9 w-9 text-slate-300 dark:text-slate-600" aria-hidden />
                    <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">暂无标签</p>
                  </div>
                ) : (
                  <ul className="admin-list divide-y divide-slate-200/90 border-b border-slate-200/90 dark:divide-slate-800 dark:border-slate-800">
                    {tags.map((tag) => (
                      <li
                        key={tag.id}
                        onDragEnter={() => moveDraggedTag(tag.id)}
                        onDragOver={(event) => {
                          event.preventDefault()
                          event.dataTransfer.dropEffect = 'move'
                        }}
                        onDrop={(event) => event.preventDefault()}
                        className={`flex items-center justify-between gap-3 py-2.5 pl-1.5 pr-[0.1875rem] transition-[background-color,opacity,box-shadow] hover:bg-slate-50/80 dark:hover:bg-slate-800/60 ${
                          draggingId === tag.id ? 'opacity-50' : ''
                        }`}
                      >
                        <span className="flex min-w-0 items-center gap-1.5 break-all font-semibold text-slate-950 dark:text-white">
                          <button
                            type="button"
                            draggable={!sorting}
                            onDragStart={(event) => handleTagDragStart(event, tag.id)}
                            onDragEnd={handleTagDragEnd}
                            onKeyDown={(event) => handleTagSortKey(event, tag.id)}
                            disabled={sorting}
                            className="flex h-9 w-7 shrink-0 cursor-grab items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue active:cursor-grabbing disabled:cursor-wait disabled:opacity-50 dark:text-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-200"
                            aria-label={`拖动排序：${tag.name}`}
                            title="拖动排序，或使用上下方向键"
                          >
                            <GripVertical className="h-4 w-4" aria-hidden />
                          </button>
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-brand-blue dark:border-blue-900 dark:bg-blue-500/10 dark:text-blue-400">
                            <TagIcon className="h-3.5 w-3.5" aria-hidden />
                          </span>
                          {tag.name}
                        </span>
                        <div className="flex shrink-0 items-center justify-end gap-0.5">
                          <button type="button" onClick={() => openEdit(tag)} className="admin-action admin-action-compact font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-950 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:text-slate-400 dark:hover:bg-slate-700 dark:hover:text-white">
                            <Pencil className="h-4 w-4" aria-hidden />
                            编辑
                          </button>
                          <button type="button" onClick={() => setConfirmDelete(tag)} className="admin-action admin-action-compact admin-action-danger font-medium focus:outline-none focus-visible:ring-2 focus-visible:ring-red-600">
                            <Trash2 className="h-4 w-4" aria-hidden />
                            删除
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {totalPages > 1 && (
                  <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} disabled={loading} />
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {editingTag && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="presentation">
          <form ref={editDialogRef} onSubmit={handleUpdate} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900" role="dialog" aria-modal="true" aria-labelledby="edit-tag-title">
            <div className="flex items-center justify-between gap-4">
              <h2 id="edit-tag-title" className="text-lg font-bold text-slate-950 dark:text-white">编辑标签</h2>
              <button type="button" onClick={() => setEditingTag(null)} disabled={updating} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue dark:hover:bg-slate-800" aria-label="关闭编辑">
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>
            <label htmlFor="edit-tag-name" className="mb-1.5 mt-4 block text-sm font-semibold text-slate-700 dark:text-slate-300">标签名称</label>
            <input id="edit-tag-name" autoFocus value={editName} onChange={(event) => setEditName(event.target.value)} maxLength={30} className="control-field h-11 w-full rounded-xl border border-slate-300 bg-white px-4 text-slate-950 outline-none focus:border-brand-blue focus:ring-4 focus:ring-blue-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white" />
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditingTag(null)} disabled={updating} className="admin-action admin-action-secondary">取消</button>
              <button type="submit" disabled={updating} className="admin-action admin-action-primary disabled:opacity-50">
                <Save className="h-4 w-4" aria-hidden />
                {updating ? '保存中' : '保存'}
              </button>
            </div>
          </form>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="presentation">
          <div ref={deleteDialogRef} tabIndex={-1} className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl outline-none dark:border-slate-700 dark:bg-slate-900" role="alertdialog" aria-modal="true" aria-labelledby="delete-tag-title" aria-describedby="delete-tag-description">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" aria-hidden />
            </div>
            <h2 id="delete-tag-title" className="mt-4 text-lg font-bold text-slate-950 dark:text-white">删除标签</h2>
            <p id="delete-tag-description" className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              确定删除“{confirmDelete.name}”吗？文章中的这个标签也会被移除。
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setConfirmDelete(null)} disabled={deleting} className="admin-action admin-action-secondary">取消</button>
              <button type="button" onClick={handleDelete} disabled={deleting} className="admin-action admin-action-danger border border-red-200 bg-red-50 disabled:opacity-50 dark:border-red-900 dark:bg-red-500/10">
                <Trash2 className="h-4 w-4" aria-hidden />
                {deleting ? '删除中' : '删除'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminTags
