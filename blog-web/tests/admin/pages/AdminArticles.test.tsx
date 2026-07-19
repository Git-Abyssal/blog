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

  it('uses the shared loading copy', () => {
    vi.mocked(axios.get).mockImplementation(() => new Promise<never>(() => undefined))

    render(
      <MemoryRouter>
        <AdminArticles />
      </MemoryRouter>,
    )

    expect(screen.getByRole('status')).toHaveTextContent(/^加载中$/)
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
