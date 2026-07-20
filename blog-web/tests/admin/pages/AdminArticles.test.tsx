import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminArticles from '@admin/pages/AdminArticles'
import { useToast } from '@shared/hooks/useToast'

vi.mock('axios')
vi.mock('@shared/hooks/useToast')

describe('AdminArticles', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useToast).mockReturnValue({
      showToast: vi.fn(),
      success: vi.fn(),
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    })
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url === '/api/admin/categories') {
        return Promise.resolve({ data: { content: [{ id: 2, name: '技术随笔' }] } })
      }
      if (url === '/api/admin/tags') {
        return Promise.resolve({ data: { content: [{ id: 3, name: 'React' }] } })
      }
      if (url.startsWith('/api/admin/articles?')) {
        return Promise.resolve({
          data: { content: [], totalElements: 0, totalPages: 0, number: 0, size: 10 },
        })
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`))
    })
  })

  it('does not render a second loading indicator', () => {
    vi.mocked(axios.get).mockImplementation(() => new Promise<never>(() => undefined))

    const { container } = render(
      <MemoryRouter>
        <AdminArticles />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(container.querySelector('section[aria-busy="true"]')).toBeInTheDocument()
  })

  it('renders the article list as a flat divided section', async () => {
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url === '/api/admin/categories' || url === '/api/admin/tags') {
        return Promise.resolve({ data: { content: [] } })
      }
      if (url.startsWith('/api/admin/articles?')) {
        return Promise.resolve({
          data: {
            content: [{ id: 1, title: '扁平列表文章', status: 'published', views: 8 }],
            totalElements: 11,
            totalPages: 2,
            number: 0,
            size: 10,
          },
        })
      }
      return Promise.reject(new Error(`Unexpected GET ${url}`))
    })

    render(
      <MemoryRouter>
        <AdminArticles />
      </MemoryRouter>,
    )

    const articleTitle = await screen.findByText('扁平列表文章')
    const articleList = articleTitle.closest('.admin-list')
    const pageHeading = screen.getByRole('heading', { name: '文章管理' })
    expect(pageHeading.parentElement).toHaveTextContent('文章管理共 11 篇文章')
    expect(pageHeading.parentElement).toHaveClass('border-b', 'min-h-16', 'mb-3')
    expect(pageHeading.parentElement).not.toHaveClass('pb-3')
    expect(articleList?.tagName).toBe('UL')
    expect(articleList).toHaveClass('border-b')
    expect(articleList).not.toHaveClass('border-y', 'rounded-2xl', 'bg-white/70')
    expect(articleTitle.closest('li')).toHaveClass('flex-row', 'items-start', 'justify-between', 'gap-1.5', 'pl-3', 'pr-[0.1875rem]', 'py-2.5', 'sm:items-center')
    expect(articleTitle.closest('li')).not.toHaveClass('flex-col')
    expect(articleTitle).toHaveClass('block', 'truncate')
    expect(articleTitle.parentElement).toHaveClass('min-w-0', 'flex-1', 'leading-6')
    expect(articleTitle.parentElement).not.toHaveClass('min-h-11')
    expect(screen.getByRole('link', { name: '编辑' }).parentElement).toHaveClass('shrink-0', 'gap-0.5')
    expect(screen.getByRole('link', { name: '编辑' }).parentElement).not.toHaveClass('border-t', 'pt-2')
    expect(screen.getByLabelText('搜索文章')).toHaveClass('px-2', 'sm:px-3')
    const filterForm = screen.getByLabelText('搜索文章').closest('form')
    expect(filterForm).toHaveClass('px-3', 'flex-row', 'items-center')
    expect(screen.getByRole('button', { name: '搜索' })).toHaveClass('admin-search-action')
    expect(screen.queryByText('操作')).not.toBeInTheDocument()
    const statusFilter = screen.getByRole('combobox', { name: '文章状态' })
    expect(statusFilter).toHaveClass('pl-1.5', 'pr-1', 'sm:pl-3', 'sm:pr-[0.8125rem]')
    expect(statusFilter.parentElement?.parentElement).toHaveClass('w-[11.625rem]', 'grid-cols-3')
    expect(statusFilter).toHaveTextContent('状态全部状态')
    expect(statusFilter.closest('form')).toBe(filterForm)
    expect(screen.getByRole('combobox', { name: '文章分类' }).closest('form')).toBe(filterForm)
    expect(screen.getByRole('combobox', { name: '文章标签' }).closest('form')).toBe(filterForm)
    expect(statusFilter.compareDocumentPosition(screen.getByLabelText('搜索文章')) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(screen.getByRole('navigation', { name: '分页导航' })).toHaveClass('justify-center', 'sm:justify-end', 'sm:px-3')
    expect(screen.getByRole('button', { name: '第 1 页' })).toHaveAttribute('aria-current', 'page')
  })

  it('sends status, category and tag filters to the paged admin endpoint', async () => {
    render(
      <MemoryRouter>
        <AdminArticles />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('combobox', { name: '文章分类' })).not.toBeDisabled()
      expect(screen.getByRole('combobox', { name: '文章标签' })).not.toBeDisabled()
    })

    fireEvent.click(screen.getByRole('combobox', { name: '文章状态' }))
    fireEvent.click(screen.getByRole('option', { name: '已发布' }))
    fireEvent.click(screen.getByRole('combobox', { name: '文章分类' }))
    fireEvent.click(screen.getByRole('option', { name: '技术随笔' }))
    fireEvent.click(screen.getByRole('combobox', { name: '文章标签' }))
    fireEvent.click(screen.getByRole('option', { name: 'React' }))

    await waitFor(() => {
      const articleRequests = vi.mocked(axios.get).mock.calls
        .map(([url]) => String(url))
        .filter((url) => url.startsWith('/api/admin/articles?'))
      const lastRequest = articleRequests.at(-1) ?? ''
      expect(lastRequest).toContain('page=0')
      expect(lastRequest).toContain('status=published')
      expect(lastRequest).toContain('categoryId=2')
      expect(lastRequest).toContain('tagId=3')
    })
  })

  it('refreshes when the current search is submitted again', async () => {
    render(
      <MemoryRouter>
        <AdminArticles />
      </MemoryRouter>,
    )

    await waitFor(() => {
      const articleRequests = vi.mocked(axios.get).mock.calls
        .filter(([url]) => String(url).startsWith('/api/admin/articles?'))
      expect(articleRequests).toHaveLength(1)
    })

    fireEvent.click(screen.getByRole('button', { name: '搜索' }))

    await waitFor(() => {
      const articleRequests = vi.mocked(axios.get).mock.calls
        .filter(([url]) => String(url).startsWith('/api/admin/articles?'))
      expect(articleRequests).toHaveLength(2)
    })
  })

})
