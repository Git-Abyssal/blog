import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminComments from '@admin/pages/AdminComments'
import { useToast } from '@shared/hooks/useToast'
import type { Comment } from '@shared/types'

vi.mock('axios')
vi.mock('@shared/hooks/useToast')

const pendingComment = {
  id: 12,
  content: '等待审核的评论',
  guestName: '访客甲',
  status: 'pending' as const,
  articleId: 3,
  articleTitle: '部署记录',
  createdAt: '2026-07-16T12:00:00',
}

const pageResponse = (
  content: Comment[],
  number = 0,
  totalPages = content.length > 0 ? 1 : 0,
) => ({
  data: {
    content,
    totalElements: content.length,
    totalPages,
    number,
    size: 20,
  },
})

const renderPage = () => render(
  <MemoryRouter>
    <AdminComments />
  </MemoryRouter>,
)

describe('AdminComments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useToast).mockReturnValue({
      showToast: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    })
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        content: [pendingComment],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20,
      },
    })
    vi.mocked(axios.post).mockResolvedValue({ data: {} })
    vi.mocked(axios.delete).mockResolvedValue({ data: {} })
  })

  it('uses the shared loading copy', () => {
    vi.mocked(axios.get).mockImplementation(() => new Promise<never>(() => undefined))

    renderPage()

    expect(screen.getByRole('status')).toHaveTextContent(/^加载中$/)
  })

  it('loads pending comments and sends an explicit status for every filter', async () => {
    renderPage()

    const commentContent = await screen.findByText('等待审核的评论')
    expect(commentContent).toBeInTheDocument()
    const commentList = commentContent.closest('ul')
    const pageHeading = screen.getByRole('heading', { name: '评论管理' })
    expect(pageHeading.parentElement).toHaveTextContent('评论管理共 1 条评论')
    expect(pageHeading.parentElement).toHaveClass('border-b', 'pb-3')
    expect(commentList).toHaveClass('border-b')
    expect(commentList).not.toHaveClass('border-y', 'rounded-2xl', 'bg-white/70')
    expect(commentContent.closest('li')?.firstElementChild).toHaveClass('pl-3', 'pr-[0.1875rem]', 'py-2.5', 'lg:items-center')
    const activeFilter = screen.getByRole('button', { name: /待审核/ })
    expect(activeFilter.querySelector('[aria-hidden="true"]')).toHaveClass('bg-brand-blue')
    expect(axios.get).toHaveBeenCalledWith('/api/admin/comments', {
      params: { page: 0, size: 20, status: 'pending' },
    })

    fireEvent.click(screen.getByRole('button', { name: /已公开/ }))

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/admin/comments', {
        params: { page: 0, size: 20, status: 'approved' },
      })
    })
    expect(screen.queryByRole('button', { name: /全部/ })).not.toBeInTheDocument()
  })

  it('refreshes the current comment list when the browser regains focus', async () => {
    renderPage()
    expect(await screen.findByText('等待审核的评论')).toBeInTheDocument()
    expect(axios.get).toHaveBeenCalledTimes(1)

    act(() => {
      window.dispatchEvent(new Event('focus'))
    })

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2)
      expect(axios.get).toHaveBeenLastCalledWith('/api/admin/comments', {
        params: { page: 0, size: 20, status: 'pending' },
      })
    })
  })

  it('refreshes when the active comment filter is selected again', async () => {
    renderPage()
    expect(await screen.findByText('等待审核的评论')).toBeInTheDocument()
    expect(axios.get).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /待审核/ }))

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2)
      expect(axios.get).toHaveBeenLastCalledWith('/api/admin/comments', {
        params: { page: 0, size: 20, status: 'pending' },
      })
    })
  })

  it('approves and deletes comments through admin endpoints', async () => {
    renderPage()
    expect(await screen.findByText('等待审核的评论')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '通过' }))
    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/admin/comments/12/approve')
    })

    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    fireEvent.click(screen.getByRole('button', { name: '删除评论' }))
    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith('/api/admin/comments/12')
    })
  })

  it('publishes an owner reply from the approved comment list', async () => {
    const approvedComment = {
      ...pendingComment,
      status: 'approved' as const,
    }
    vi.mocked(axios.get).mockImplementation((_url, config) => {
      const status = (config as { params?: { status?: string } })?.params?.status
      return Promise.resolve(pageResponse(status === 'approved' ? [approvedComment] : [pendingComment]))
    })

    renderPage()
    expect(await screen.findByText('等待审核的评论')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /已公开/ }))
    fireEvent.click(await screen.findByRole('button', { name: '回复' }))
    fireEvent.change(screen.getByLabelText('回复内容'), { target: { value: '感谢你的反馈' } })
    fireEvent.click(screen.getByRole('button', { name: '发布回复' }))

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/comments/article/3',
        { content: '感谢你的反馈', parentId: 12 },
      )
    })
  })

  it('labels owner comments as 站长', async () => {
    vi.mocked(axios.get).mockResolvedValue(pageResponse([{
      ...pendingComment,
      guestName: undefined,
      ownerComment: true,
    }]))

    renderPage()

    expect(await screen.findByText('站长')).toBeInTheDocument()
  })

  it('shows an explicit retry state when loading fails', async () => {
    vi.mocked(axios.get)
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValue({
        data: {
          content: [pendingComment],
          totalElements: 1,
          totalPages: 1,
          number: 0,
          size: 20,
        },
      })

    renderPage()

    expect(await screen.findByText('评论列表暂时加载失败')).toBeInTheDocument()
    expect(screen.queryByText('没有待审核评论')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
    expect(await screen.findByText('等待审核的评论')).toBeInTheDocument()
    expect(axios.get).toHaveBeenCalledTimes(2)
  })

  it('ignores a stale refresh when an approval finishes after the filter changes', async () => {
    const approvedComment = {
      ...pendingComment,
      id: 18,
      content: '已公开筛选结果',
      status: 'approved' as const,
    }
    const stalePendingComment = {
      ...pendingComment,
      id: 19,
      content: '过期的待审核刷新结果',
    }
    let resolveApprove!: (value: { data: Record<string, never> }) => void
    let resolveOlderList!: (value: ReturnType<typeof pageResponse>) => void
    let resolveCurrentRefresh!: (value: ReturnType<typeof pageResponse>) => void
    const approveRequest = new Promise<{ data: Record<string, never> }>((resolve) => {
      resolveApprove = resolve
    })
    const olderListRequest = new Promise<ReturnType<typeof pageResponse>>((resolve) => {
      resolveOlderList = resolve
    })
    const currentRefreshRequest = new Promise<ReturnType<typeof pageResponse>>((resolve) => {
      resolveCurrentRefresh = resolve
    })
    vi.mocked(axios.post).mockReturnValue(approveRequest)
    vi.mocked(axios.get)
      .mockResolvedValueOnce(pageResponse([pendingComment]))
      .mockReturnValueOnce(olderListRequest)
      .mockReturnValueOnce(currentRefreshRequest)

    renderPage()
    expect(await screen.findByText('等待审核的评论')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '通过' }))
    fireEvent.click(screen.getByRole('button', { name: /已公开/ }))
    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2))

    await act(async () => {
      resolveApprove({ data: {} })
    })
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(3)
      expect(axios.get).toHaveBeenNthCalledWith(3, '/api/admin/comments', {
        params: { page: 0, size: 20, status: 'approved' },
      })
    })

    await act(async () => {
      resolveCurrentRefresh(pageResponse([approvedComment]))
      resolveOlderList(pageResponse([stalePendingComment]))
    })

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /已公开/ })).toHaveAttribute('aria-pressed', 'true')
      expect(screen.getByText('已公开筛选结果')).toBeInTheDocument()
      expect(screen.queryByText('过期的待审核刷新结果')).not.toBeInTheDocument()
    })
  })

  it('returns to the previous page after deleting the only comment on the last page', async () => {
    const lastPageComment = {
      ...pendingComment,
      id: 22,
      content: '第二页唯一一条评论',
    }
    vi.mocked(axios.get)
      .mockResolvedValueOnce(pageResponse([pendingComment], 0, 2))
      .mockResolvedValueOnce(pageResponse([lastPageComment], 1, 2))
      .mockResolvedValueOnce(pageResponse([], 1, 1))
      .mockResolvedValueOnce(pageResponse([pendingComment], 0, 1))

    renderPage()
    expect(await screen.findByText('等待审核的评论')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '下一页' }))
    expect(await screen.findByText('第二页唯一一条评论')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '删除' }))
    fireEvent.click(screen.getByRole('button', { name: '删除评论' }))

    await waitFor(() => {
      expect(axios.delete).toHaveBeenCalledWith('/api/admin/comments/22')
      expect(axios.get).toHaveBeenNthCalledWith(4, '/api/admin/comments', {
        params: { page: 0, size: 20, status: 'pending' },
      })
    })
    expect(await screen.findByText('等待审核的评论')).toBeInTheDocument()
    expect(screen.queryByText('第二页唯一一条评论')).not.toBeInTheDocument()
  })
})
