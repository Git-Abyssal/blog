import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import axios from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ArticleDetail from '@site/pages/ArticleDetail'
import { useToast } from '@shared/hooks/useToast'
import { useThreadedComments } from '@shared/hooks/useApi'
import type { Comment, PageResponse } from '@shared/types'

vi.mock('axios')
vi.mock('@shared/hooks/useToast')
vi.mock('@shared/hooks/useApi', () => ({ useThreadedComments: vi.fn() }))
vi.mock('@site/components/SEO', () => ({ default: () => null }))
vi.mock('@site/components/TableOfContents', () => ({ default: () => null }))

const article = {
  id: 1,
  title: '一篇工程记录',
  content: '正文内容',
  summary: '摘要',
  views: 12,
  createdAt: '2026-07-16T10:00:00',
  updatedAt: '2026-07-16T10:00:00',
}

const guestComment = {
  id: 8,
  content: '这条公开评论很有帮助',
  guestName: '访客甲',
  status: 'approved' as const,
  createdAt: '2026-07-16T11:00:00',
  replies: [],
}

const refetchComments = vi.fn().mockResolvedValue(undefined)
const threadedCommentsResult = (
  data: PageResponse<Comment> | undefined,
  isError = false,
) => ({
  data,
  refetch: refetchComments,
  isLoading: false,
  isError,
} as unknown as ReturnType<typeof useThreadedComments>)

const renderPage = () => render(
  <MemoryRouter initialEntries={['/article/1']}>
    <Routes>
      <Route path="/article/:id" element={<ArticleDetail />} />
    </Routes>
  </MemoryRouter>,
)

describe('ArticleDetail comments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useToast).mockReturnValue({
      showToast: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    })
    vi.mocked(useThreadedComments).mockReturnValue(threadedCommentsResult({
      content: [guestComment],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 20,
    }))
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url === '/api/articles/1') return Promise.resolve({ data: article })
      if (url === '/api/articles/1/related') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`Unexpected GET ${url}`))
    })
    vi.mocked(axios.post).mockResolvedValue({ data: { code: 202 } })
    vi.mocked(axios.isCancel).mockReturnValue(false)
  })

  it('lets a visitor submit a named comment for moderation', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: '一篇工程记录' })).toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('你的昵称'), { target: { value: '读者小明' } })
    fireEvent.change(screen.getByLabelText('评论内容'), { target: { value: '我也遇到过这个问题' } })
    fireEvent.click(screen.getByRole('button', { name: '提交审核' }))

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/comments/article/1', {
        content: '我也遇到过这个问题',
        guestName: '读者小明',
      })
    })
    expect(await screen.findByText('评论已提交，审核通过后显示')).toBeInTheDocument()
    expect(refetchComments).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: '回复' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '删除' })).not.toBeInTheDocument()
  })

  it('keeps moderation controls out of the public article page', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: '一篇工程记录' })).toBeInTheDocument()
    const returnLink = screen.getByRole('link', { name: '返回文章列表' })
    expect(returnLink).toHaveAttribute(
      'href',
      '/?tab=latest#articles',
    )
    expect(returnLink).toHaveClass('-ms-2', 'sm:-ms-6', 'text-base')
    expect(screen.queryByRole('button', { name: '回复' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '删除' })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '编辑' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('你的昵称')).toBeInTheDocument()
  })

  it('returns to the list location that opened the article', async () => {
    render(
      <MemoryRouter
        initialEntries={[{
          pathname: '/article/1',
          state: { returnTo: '/search?keyword=Spring' },
        }]}
      >
        <Routes>
          <Route path="/article/:id" element={<ArticleDetail />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('heading', { name: '一篇工程记录' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '返回文章列表' })).toHaveAttribute(
      'href',
      '/search?keyword=Spring',
    )
  })

  it('refreshes article data without counting another view when the browser regains focus', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { name: '一篇工程记录' })).toBeInTheDocument()

    act(() => {
      window.dispatchEvent(new Event('focus'))
    })

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/articles/1', {
        params: { trackView: false },
      })
      const relatedRequests = vi.mocked(axios.get).mock.calls
        .filter(([url]) => url === '/api/articles/1/related')
      expect(relatedRequests).toHaveLength(2)
    })
  })

  it('keeps a fixed title size and wraps long titles instead of shrinking them', async () => {
    renderPage()

    const title = await screen.findByRole('heading', { name: '一篇工程记录' })
    expect(title).toHaveClass(
      'break-words',
      'whitespace-normal',
      'text-3xl',
      'sm:text-4xl',
      'lg:text-[2.7rem]',
    )
    expect(title).not.toHaveClass('whitespace-nowrap', 'overflow-hidden', 'text-ellipsis')
  })

  it('hides the redundant metadata divider on mobile', async () => {
    renderPage()

    const date = await screen.findByText(new Date(article.createdAt).toLocaleDateString())
    expect(date.parentElement).toHaveClass('sm:border-b')
    expect(date.parentElement).not.toHaveClass('border-b')
    expect(date.parentElement).toHaveClass('mb-4', 'sm:mb-7', 'sm:pb-5')
    expect(date.parentElement).not.toHaveClass('pb-5')
  })

  it('keeps mobile article actions collapsed until the reader expands them', async () => {
    renderPage()

    await screen.findByRole('heading', { name: '一篇工程记录' })
    const expandButton = screen.getByRole('button', { name: '展开文章操作' })
    expect(expandButton.parentElement).toHaveClass('bottom-[calc(4.5rem+env(safe-area-inset-bottom))]')
    expect(expandButton).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('mobile-article-actions')).not.toBeInTheDocument()

    fireEvent.click(expandButton)

    const actionMenu = document.getElementById('mobile-article-actions')
    expect(actionMenu).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '收起文章操作' })).toHaveAttribute('aria-expanded', 'true')
    expect(within(actionMenu as HTMLElement).getByRole('button', { name: '查看评论' })).toBeInTheDocument()
    expect(within(actionMenu as HTMLElement).getByRole('button', { name: '复制文章链接' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '收起文章操作' }))
    expect(document.getElementById('mobile-article-actions')).not.toBeInTheDocument()
  })

  it('renders a saved Markdown blockquote as a blockquote', async () => {
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url === '/api/articles/1') {
        return Promise.resolve({
          data: { ...article, content: '> 把这个文章编辑器优化一下。' },
        })
      }
      if (url === '/api/articles/1/related') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`Unexpected GET ${url}`))
    })

    renderPage()

    const quote = await screen.findByText('把这个文章编辑器优化一下。')
    expect(quote.closest('blockquote')).toBeInTheDocument()
  })

  it('does not render raw script tags from saved Markdown', async () => {
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url === '/api/articles/1') {
        return Promise.resolve({
          data: { ...article, content: '<script>window.evil = true</script>\n\n安全正文' },
        })
      }
      if (url === '/api/articles/1/related') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`Unexpected GET ${url}`))
    })

    const { container } = renderPage()

    expect(await screen.findByText('安全正文')).toBeInTheDocument()
    expect(container.querySelector('script')).not.toBeInTheDocument()
  })

  it('labels owner comments as 站长', async () => {
    vi.mocked(useThreadedComments).mockReturnValue(threadedCommentsResult({
        content: [{
          ...guestComment,
          guestName: undefined,
          ownerComment: true,
        }],
        totalElements: 1,
        totalPages: 1,
        number: 0,
        size: 20,
      }))

    renderPage()

    expect(await screen.findByText('站长')).toBeInTheDocument()
  })

  it('distinguishes a missing article from a temporary loading failure', async () => {
    vi.mocked(axios.isAxiosError).mockReturnValue(true)
    vi.mocked(axios.get).mockRejectedValue({ response: { status: 404 } })

    renderPage()

    expect(await screen.findByText('文章不存在或已被删除')).toBeInTheDocument()
    expect(screen.queryByText('文章暂时加载失败')).not.toBeInTheDocument()
  })

  it('lets the visitor retry a temporary article loading failure', async () => {
    let attempts = 0
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url === '/api/articles/1') {
        attempts += 1
        return attempts === 1
          ? Promise.reject(new Error('network unavailable'))
          : Promise.resolve({ data: article })
      }
      if (url === '/api/articles/1/related') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`Unexpected GET ${url}`))
    })

    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: '重新加载' }))
    expect(await screen.findByRole('heading', { name: '一篇工程记录' })).toBeInTheDocument()
    expect(attempts).toBe(2)
  })

  it('shows a retry state when comments fail instead of an empty state', async () => {
    vi.mocked(useThreadedComments).mockReturnValue(threadedCommentsResult(undefined, true))

    renderPage()

    expect(await screen.findByText('评论暂时加载失败')).toBeInTheDocument()
    expect(screen.queryByText('暂无评论，快来发表第一条评论吧！')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重新加载评论' }))
    expect(refetchComments).toHaveBeenCalledTimes(1)
  })
})
