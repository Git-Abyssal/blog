import { describe, it, expect, vi } from 'vitest'
import { act, render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import axios from 'axios'
import Home from '@site/pages/Home'
import type { Article } from '@shared/types'

// Mock axios
vi.mock('axios')

describe('Home Page', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
    vi.clearAllMocks()
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url.startsWith('/api/categories')) {
        return Promise.resolve({ data: [] })
      }
      if (url.includes('tab=hot') && url.includes('size=5')) {
        return Promise.resolve({ data: { content: [] } })
      }
      return Promise.resolve({ data: { content: [], totalPages: 0, totalElements: 0 } })
    })
  })

  const renderHome = () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
      },
    })
    return render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Home />
        </BrowserRouter>
      </QueryClientProvider>
    )
  }

  const mockArticles: Article[] = [
    {
      id: 1,
      title: 'Test Article',
      summary: 'Test summary',
      content: 'Test content',
      views: 100,
      createdAt: '2024-01-01T00:00:00',
      updatedAt: '2024-01-01T00:00:00',
    }
  ]

  const mockHomeRequests = (articleContent: Article[] = []) => {
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url.startsWith('/api/categories')) {
        return Promise.resolve({ data: [] })
      }
      if (url.includes('tab=hot') && url.includes('size=5')) {
        return Promise.resolve({ data: { content: [] } })
      }
      return Promise.resolve({
        data: {
          content: articleContent,
          totalPages: articleContent.length > 0 ? 1 : 0,
          totalElements: articleContent.length,
          number: 0,
        }
      })
    })
  }

  it('keeps fast initial loading visually quiet', async () => {
    renderHome()

    const categoryNav = screen.getByRole('navigation', { name: '文章分类' })
    expect(categoryNav).toBeInTheDocument()
    expect(categoryNav).toHaveClass('-mx-3', 'overflow-x-auto', 'px-3', 'py-1')
    expect(categoryNav.parentElement).toHaveClass('border-b')
    expect(categoryNav).not.toHaveClass('sm:py-1.5')
    expect(categoryNav).not.toHaveClass('border-y')
    expect(categoryNav.parentElement?.parentElement).not.toHaveClass('pt-2', 'sm:pt-3')
    expect(screen.getByRole('button', { name: '最新文章' })).toHaveClass('flex', 'min-h-[52px]', 'items-center')

    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(0)
    expect(screen.queryByRole('status', { name: '正在加载文章' })).not.toBeInTheDocument()

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalled()
      expect(screen.getByText('暂无文章')).toBeInTheDocument()
    })
  })

  it('shows compact feedback when initial loading takes longer than the delay', async () => {
    let resolveArticles: ((value: { data: { content: never[]; totalPages: number; totalElements: number } }) => void) | undefined
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url.startsWith('/api/categories')) {
        return Promise.resolve({ data: [] })
      }
      return new Promise((resolve) => {
        resolveArticles = resolve
      })
    })

    renderHome()

    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(0)
    expect(screen.queryByRole('status', { name: '正在加载文章' })).not.toBeInTheDocument()

    const loadingStatus = await screen.findByRole('status', { name: '正在加载文章' })
    expect(loadingStatus).toHaveTextContent('正在加载文章…')
    expect(document.querySelectorAll('.animate-pulse')).toHaveLength(0)

    await act(async () => {
      resolveArticles?.({ data: { content: [], totalPages: 0, totalElements: 0 } })
    })

    expect(await screen.findByText('暂无文章')).toBeInTheDocument()
  })

  it('renders articles after loading', async () => {
    mockHomeRequests(mockArticles)

    renderHome()

    await waitFor(() => {
      expect(screen.getByText('Test Article')).toBeInTheDocument()
    })

    expect(screen.getByText('Test Article').closest('article')?.parentElement).toHaveClass('border-b')
    expect(axios.get).toHaveBeenCalledWith('/api/articles', {
      params: expect.objectContaining({ page: 0, size: 10 }),
    })
  })

  it('switches to the real hot list and keeps the URL in sync', async () => {
    mockHomeRequests()

    renderHome()

    const latestTab = screen.getByRole('button', { name: '最新文章' })
    const hotTab = screen.getByRole('button', { name: '热榜' })

    expect(latestTab).toHaveClass('text-slate-950')
    expect(hotTab).not.toHaveClass('text-slate-950')

    fireEvent.click(hotTab)

    await waitFor(() => {
      expect(hotTab).toHaveClass('text-slate-950')
      expect(window.location.search).toContain('tab=hot')
      expect(axios.get).toHaveBeenCalledWith('/api/articles', {
        params: expect.objectContaining({ page: 0, size: 10, tab: 'hot' }),
      })
    })
  })

  it('keeps refresh feedback within the active tab instead of showing a full-width loading bar', async () => {
    let resolveHotRequest: ((value: { data: { content: never[]; totalPages: number; totalElements: number } }) => void) | undefined
    vi.mocked(axios.get).mockImplementation((url: string, config?: { params?: { tab?: string } }) => {
      if (url.startsWith('/api/categories')) {
        return Promise.resolve({ data: [] })
      }
      if (config?.params?.tab === 'hot') {
        return new Promise((resolve) => {
          resolveHotRequest = resolve
        })
      }
      return Promise.resolve({
        data: {
          content: mockArticles,
          totalPages: 1,
          totalElements: mockArticles.length,
          number: 0,
        },
      })
    })

    renderHome()

    await waitFor(() => {
      expect(screen.getByText('Test Article')).toBeInTheDocument()
    })

    const hotTab = screen.getByRole('button', { name: '热榜' })
    fireEvent.click(hotTab)

    await waitFor(() => {
      expect(hotTab.querySelector('[aria-hidden="true"]')).toHaveClass('motion-safe:animate-pulse')
    })
    expect(screen.getByText('Test Article')).toBeInTheDocument()
    expect(screen.queryByRole('status', { name: '正在加载文章' })).not.toBeInTheDocument()
    expect(document.querySelector('.opacity-55')).not.toBeInTheDocument()

    resolveHotRequest?.({ data: { content: [], totalPages: 0, totalElements: 0 } })
  })

  it('refreshes a previously visited article tab when switching back to it', async () => {
    mockHomeRequests()
    renderHome()

    await waitFor(() => {
      const latestRequests = vi.mocked(axios.get).mock.calls.filter(([, config]) => {
        const params = (config as { params?: { tab?: string } } | undefined)?.params
        return params && !params.tab
      })
      expect(latestRequests).toHaveLength(1)
    })

    fireEvent.click(screen.getByRole('button', { name: '热榜' }))
    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/articles', {
        params: expect.objectContaining({ tab: 'hot' }),
      })
    })

    fireEvent.click(screen.getByRole('button', { name: '最新文章' }))
    await waitFor(() => {
      const latestRequests = vi.mocked(axios.get).mock.calls.filter(([, config]) => {
        const params = (config as { params?: { tab?: string } } | undefined)?.params
        return params && !params.tab
      })
      expect(latestRequests).toHaveLength(2)
    })
  })

  it('refreshes the active article tab when it is selected again', async () => {
    mockHomeRequests()
    renderHome()

    await waitFor(() => {
      const articleRequests = vi.mocked(axios.get).mock.calls
        .filter(([url]) => url === '/api/articles')
      expect(articleRequests).toHaveLength(1)
    })

    fireEvent.click(screen.getByRole('button', { name: '最新文章' }))

    await waitFor(() => {
      const articleRequests = vi.mocked(axios.get).mock.calls
        .filter(([url]) => url === '/api/articles')
      expect(articleRequests).toHaveLength(2)
    })
  })

  it('leaves the hot list and reloads latest articles when all articles is selected', async () => {
    mockHomeRequests()
    renderHome()

    fireEvent.click(screen.getByRole('button', { name: '热榜' }))
    await waitFor(() => expect(window.location.search).toContain('tab=hot'))

    fireEvent.click(screen.getByRole('button', { name: '全部文章' }))

    await waitFor(() => {
      expect(window.location.search).toContain('tab=latest')
      expect(axios.get).toHaveBeenCalledWith('/api/articles', {
        params: expect.objectContaining({ tab: undefined, categoryId: undefined }),
      })
    })
  })

  it('refreshes category options when the browser regains focus', async () => {
    mockHomeRequests()
    renderHome()
    await waitFor(() => {
      const categoryRequests = vi.mocked(axios.get).mock.calls
        .filter(([url]) => url === '/api/categories')
      expect(categoryRequests).toHaveLength(1)
    })

    act(() => {
      window.dispatchEvent(new Event('focus'))
    })

    await waitFor(() => {
      const categoryRequests = vi.mocked(axios.get).mock.calls
        .filter(([url]) => url === '/api/categories')
      expect(categoryRequests).toHaveLength(2)
    })
  })

  it('uses real category ids when filtering articles', async () => {
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url.startsWith('/api/categories')) {
        return Promise.resolve({ data: [{ id: 7, name: 'Java' }] })
      }
      if (url.includes('tab=hot') && url.includes('size=5')) {
        return Promise.resolve({ data: { content: [] } })
      }
      return Promise.resolve({ data: { content: [], totalPages: 0, number: 0 } })
    })

    renderHome()

    const categoryButtons = await screen.findAllByRole('button', { name: 'Java' })
    fireEvent.click(categoryButtons[0])

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/articles', {
        params: expect.objectContaining({ categoryId: 7, page: 0, size: 10 }),
      })
    })
  })

  it('keeps category filters and the global hot list mutually exclusive', async () => {
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url.startsWith('/api/categories')) {
        return Promise.resolve({ data: [{ id: 7, name: 'Java' }] })
      }
      if (url.includes('tab=hot') && url.includes('size=5')) {
        return Promise.resolve({ data: { content: [] } })
      }
      return Promise.resolve({ data: { content: [], totalPages: 0, number: 0 } })
    })

    renderHome()

    const categoryButtons = await screen.findAllByRole('button', { name: 'Java' })
    fireEvent.click(categoryButtons[0])

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith('/api/articles', {
        params: expect.objectContaining({ categoryId: 7, tab: undefined }),
      })
    })

    fireEvent.click(screen.getByRole('button', { name: '热榜' }))

    await waitFor(() => {
      expect(window.location.search).toContain('tab=hot')
      expect(axios.get).toHaveBeenCalledWith('/api/articles', {
        params: expect.objectContaining({ categoryId: undefined, tab: 'hot' }),
      })
    })

    fireEvent.click(categoryButtons[0])

    await waitFor(() => {
      expect(window.location.search).toContain('tab=latest')
      expect(screen.getByRole('button', { name: '最新文章' })).toHaveClass('text-slate-950')
    })
  })

  it('queries the selected page and keeps the page number in the URL', async () => {
    vi.mocked(axios.get).mockImplementation((url: string, config?: { params?: { page?: number } }) => {
      if (url.startsWith('/api/categories')) {
        return Promise.resolve({ data: [] })
      }
      return Promise.resolve({
        data: {
          content: mockArticles,
          totalPages: 3,
          totalElements: 17,
          number: config?.params?.page ?? 0,
          size: 10,
        },
      })
    })

    renderHome()

    const secondPage = await screen.findByRole('button', { name: '第 2 页' })
    secondPage.focus()
    fireEvent.click(secondPage)

    await waitFor(() => {
      expect(window.location.search).toContain('page=2')
      expect(axios.get).toHaveBeenCalledWith('/api/articles', {
        params: expect.objectContaining({ page: 1, size: 10 }),
      })
      expect(screen.queryByText('PAGE 02 / 03')).not.toBeInTheDocument()
      expect(screen.getByRole('button', { name: '第 2 页' })).toHaveAttribute('aria-current', 'page')
      expect(screen.getByRole('navigation', { name: '分页导航' })).toHaveClass('sm:justify-end', 'sm:px-3')
      expect(screen.getByRole('heading', { name: '文章列表' })).toHaveFocus()
    })
  })
})
