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
    expect(returnLink).toHaveClass('relative', 'text-lg')
    expect(returnLink.querySelector('svg')).toHaveClass('absolute', 'right-full', 'h-5', 'w-5')
    expect(returnLink.parentElement).not.toHaveClass('border-t', 'border-slate-200')
    expect(returnLink.parentElement?.nextElementSibling).toHaveClass('border-t', 'border-slate-200', 'pt-2')
    expect(returnLink.parentElement).not.toHaveClass('mb-4')
    expect(returnLink.parentElement).not.toHaveClass('border-b', 'border-y')
    expect(returnLink).not.toHaveClass('-ms-2', 'sm:-ms-6', 'gap-1', 'px-1')
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
      'leading-[1.1]',
      'sm:leading-[1.1]',
      'lg:leading-[1.1]',
    )
    expect(title).not.toHaveClass('whitespace-nowrap', 'overflow-hidden', 'text-ellipsis')
  })

  it('uses dividers instead of cards to structure the article page', async () => {
    renderPage()

    const title = await screen.findByRole('heading', { name: '一篇工程记录' })
    const articleElement = title.closest('article')
    const contentColumn = articleElement?.parentElement
    expect(contentColumn).toHaveClass('min-w-0', 'flex-1', 'xl:w-[50rem]', 'xl:flex-none')
    expect(contentColumn?.parentElement).toHaveClass(
      'lg:gap-8',
      'xl:justify-center',
      'relative',
      'min-[1400px]:left-[5rem]',
      'min-[1400px]:gap-10',
    )
    expect(articleElement?.parentElement?.parentElement?.parentElement).toHaveClass('pt-0')
    expect(title.parentElement?.parentElement).not.toHaveClass('my-2')
    expect(articleElement).toHaveClass('pb-2.5', 'pt-0', 'sm:pb-5')
    expect(articleElement).not.toHaveClass('lg:pt-6')
    expect(articleElement).not.toHaveClass('rounded-3xl', 'border', 'bg-white', 'shadow-sm')
    const returnLinkSlot = screen.getByRole('link', { name: '返回文章列表' }).parentElement
    expect(returnLinkSlot).toHaveClass(
      'min-[1400px]:fixed',
      'min-[1400px]:left-[calc(50%_-_39rem)]',
      'min-[1400px]:right-auto',
      'min-[1400px]:top-0',
      'min-[1400px]:z-40',
    )
    const returnLink = screen.getByRole('link', { name: '返回文章列表' })
    expect(returnLink).toHaveClass('items-start', 'whitespace-nowrap', 'pt-2', 'leading-[1.1]')
    expect(returnLink.querySelector('svg')).toHaveClass('top-2')
    expect(returnLinkSlot?.parentElement).toHaveClass('relative')
    const mobileTocSlot = Array.from(articleElement?.children ?? [])
      .find((element) => element.classList.contains('lg:hidden'))
    expect(mobileTocSlot).toHaveClass('mb-[9px]', 'lg:hidden')
    expect(articleElement?.querySelector('.article-prose')).toHaveClass('w-full', '!max-w-none')

    const date = await screen.findByText(new Date(article.createdAt).toLocaleDateString())
    expect(date.parentElement).toHaveClass('mb-2.5', 'min-h-10', 'sm:min-h-11', 'border-b')
    expect(date.parentElement).not.toHaveClass('pb-4')

    const comments = screen.getByRole('heading', { name: '评论 1' }).closest('section')
    expect(comments).toHaveClass('mt-0', 'sm:mt-2', 'border-t', 'border-slate-200', 'dark:border-slate-700')
    expect(comments).not.toHaveClass('border-slate-300')
    expect(comments).not.toHaveClass('lg:border-t-0')
    const commentHeadingRow = screen.getByRole('heading', { name: '评论 1' }).parentElement
    expect(commentHeadingRow).toHaveClass('min-h-12', 'items-center', 'justify-between')
    expect(comments).not.toHaveClass('rounded-3xl', 'bg-white', 'shadow-sm')

    expect(screen.queryByRole('button', { name: '1 条评论' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '复制链接' }).parentElement?.parentElement).toBe(commentHeadingRow)

    const commentForm = screen.getByLabelText('你的昵称').closest('form')
    expect(commentForm).toHaveClass('border-y', 'py-3')
    expect(commentForm).not.toHaveClass('mb-3.5')
    expect(commentForm).not.toHaveClass('rounded-2xl', 'bg-slate-50')
    const commentContent = screen.getByLabelText('评论内容')
    const guestName = screen.getByLabelText('你的昵称')
    expect(commentContent.compareDocumentPosition(guestName) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    const commentFooter = guestName.parentElement?.parentElement
    expect(commentFooter).toHaveClass(
      'mt-3',
      'flex',
      'flex-col',
      'gap-2.5',
      'sm:flex-row',
      'sm:items-end',
    )
    expect(guestName.parentElement).toHaveClass('min-w-0', 'flex-1')
    expect(guestName.parentElement).not.toHaveClass('sm:max-w-sm')
    expect(screen.getByText('你的昵称', { selector: 'label' })).toHaveClass('block', 'mb-1.5')
    expect(guestName).toHaveClass('w-full')
    expect(guestName).toHaveAttribute('placeholder', '怎么称呼你')
    expect(screen.getByRole('button', { name: '提交审核' }).parentElement).toBe(commentFooter)
    expect(screen.getByRole('button', { name: '提交审核' })).toHaveClass('w-full', 'sm:w-auto')
    expect(commentContent).toHaveClass('block', 'w-full', 'resize-y')
    expect(commentContent).toHaveAttribute('placeholder', '写下你的想法或问题')
    expect(commentContent).toHaveAttribute('rows', '4')
    expect(commentContent.tagName).toBe('TEXTAREA')
    expect(screen.getByText('0 / 1000')).toBeInTheDocument()
    expect(screen.queryByText('评论审核通过后公开显示')).not.toBeInTheDocument()

    const commentItem = screen.getByText(guestComment.content).parentElement?.parentElement?.parentElement
    expect(commentItem).toHaveClass('pt-3.5')
    expect(commentItem).not.toHaveClass('border-b', 'pb-2')
    expect(commentItem?.parentElement).toHaveClass('border-b', 'pb-2')
  })

  it('places the category and tags immediately after the article date', async () => {
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url === '/api/articles/1') {
        return Promise.resolve({
          data: {
            ...article,
            category: { id: 1, name: 'AI' },
            tags: [{ id: 2, name: '工程实践' }],
          },
        })
      }
      if (url === '/api/articles/1/related') return Promise.resolve({ data: [] })
      return Promise.reject(new Error(`Unexpected GET ${url}`))
    })

    renderPage()

    const date = await screen.findByText(new Date(article.createdAt).toLocaleDateString())
    const metadataLinks = screen.getByRole('link', { name: 'AI' }).parentElement
    expect(metadataLinks?.previousElementSibling).toBe(date)
    expect(metadataLinks).not.toHaveClass('sm:ml-auto')
  })

  it('keeps mobile article actions collapsed until the reader expands them', async () => {
    renderPage()

    await screen.findByRole('heading', { name: '一篇工程记录' })
    const expandButton = screen.getByRole('button', { name: '展开文章操作' })
    expect(expandButton.parentElement).toHaveClass('bottom-[calc(4.5rem+env(safe-area-inset-bottom))]')
    expect(expandButton.parentElement).toHaveClass(
      'right-[calc(0.75rem+env(safe-area-inset-right))]',
      'rounded-full',
    )
    expect(expandButton).not.toHaveClass('border-l')
    expect(expandButton).toHaveAttribute('aria-expanded', 'false')
    expect(document.getElementById('mobile-article-actions')).not.toBeInTheDocument()

    fireEvent.click(expandButton)

    const actionMenu = document.getElementById('mobile-article-actions')
    expect(actionMenu).toBeInTheDocument()
    const collapseButton = screen.getByRole('button', { name: '收起文章操作' })
    expect(collapseButton).toHaveAttribute('aria-expanded', 'true')
    expect(collapseButton).toHaveClass('border-l', 'border-slate-200')
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

  it('uses the same subtle divider for related articles', async () => {
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url === '/api/articles/1') return Promise.resolve({ data: article })
      if (url === '/api/articles/1/related') {
        return Promise.resolve({
          data: [{ ...article, id: 2, title: '下一篇文章' }],
        })
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`))
    })

    renderPage()

    const relatedSection = (await screen.findByRole('heading', { name: '继续阅读' })).closest('section')
    expect(relatedSection).toHaveClass('border-y', 'border-slate-200', 'pt-2', 'dark:border-slate-700')
    expect(relatedSection).not.toHaveClass('border-t')
    expect(relatedSection).not.toHaveClass('border-slate-300', 'border-slate-400', 'dark:border-slate-600')
    expect(relatedSection?.closest('aside')).toHaveClass('space-y-2', 'top-0')
    expect(relatedSection?.closest('aside')).not.toHaveClass('lg:mt-11')
    expect(relatedSection?.closest('aside')).not.toHaveClass('top-4')
    const relatedLink = screen.getByRole('link', { name: /下一篇文章/ })
    expect(relatedLink).toHaveClass('py-1')
    expect(relatedLink.querySelector('p')).toHaveClass('leading-4')
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

  it('keeps replies inside the parent comment group before its divider', async () => {
    const ownerReply = {
      id: 9,
      content: '谢谢，回复应该属于上面的读者评论。',
      ownerComment: true,
      status: 'approved' as const,
      createdAt: '2026-07-16T12:00:00',
      replies: [],
    }
    vi.mocked(useThreadedComments).mockReturnValue(threadedCommentsResult({
      content: [{
        ...guestComment,
        replies: [ownerReply],
      }],
      totalElements: 1,
      totalPages: 1,
      number: 0,
      size: 20,
    }))

    renderPage()

    const parentContent = await screen.findByText(guestComment.content)
    const replyContent = screen.getByText(ownerReply.content)
    const parentGroup = parentContent.closest('.border-b')
    const replyItem = replyContent.parentElement?.parentElement?.parentElement

    expect(parentGroup).toHaveClass('border-b', 'pb-2')
    expect(replyContent.closest('.border-b')).toBe(parentGroup)
    expect(replyItem).toHaveClass('ml-4', 'mt-3', 'sm:ml-10')
    expect(replyItem).not.toHaveClass('border-b')
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

  it('balances the empty comments spacing with the page bottom padding', async () => {
    vi.mocked(useThreadedComments).mockReturnValue(threadedCommentsResult({
      content: [],
      totalElements: 0,
      totalPages: 0,
      number: 0,
      size: 20,
    }))

    renderPage()

    const emptyState = await screen.findByText('还没有评论')
    expect(emptyState).toHaveClass('pt-3', 'pb-4', 'lg:pb-0', 'text-center')
    expect(emptyState).not.toHaveClass('py-8')
  })
})
