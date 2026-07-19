import { StrictMode } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminCategories from '@admin/pages/AdminCategories'
import { useToast } from '@shared/hooks/useToast'

vi.mock('axios')
vi.mock('@shared/hooks/useToast')

describe('AdminCategories', () => {
  const showError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useToast).mockReturnValue({
      showToast: vi.fn(),
      success: vi.fn(),
      error: showError,
      info: vi.fn(),
      warning: vi.fn(),
    })
  })

  it('uses the shared loading copy', () => {
    vi.mocked(axios.get).mockImplementation(() => new Promise<never>(() => undefined))

    render(<AdminCategories />)

    expect(screen.getByRole('status')).toHaveTextContent(/^加载中$/)
  })

  it('shows one load error when StrictMode starts the request twice', async () => {
    vi.mocked(axios.get).mockRejectedValue(new Error('network error'))

    render(
      <StrictMode>
        <AdminCategories />
      </StrictMode>,
    )

    await waitFor(() => expect(axios.get).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(showError).toHaveBeenCalledTimes(1))
  })

  it('loads paged categories and switches pages', async () => {
    vi.mocked(axios.get).mockImplementation((_url, config) => {
      const page = (config as { params?: { page?: number } })?.params?.page ?? 0
      return Promise.resolve({
        data: {
          content: [{ id: page + 1, name: page === 0 ? '第一页分类' : '第二页分类' }],
          totalElements: 11,
          totalPages: 2,
          number: page,
          size: 10,
        },
      })
    })

    render(<AdminCategories />)

    expect(await screen.findByText('第一页分类')).toBeInTheDocument()
    expect(axios.get).toHaveBeenCalledWith('/api/admin/categories', {
      params: { page: 0, size: 10 },
    })

    fireEvent.click(screen.getByRole('button', { name: '下一页' }))

    expect(await screen.findByText('第二页分类')).toBeInTheDocument()
    expect(axios.get).toHaveBeenLastCalledWith('/api/admin/categories', {
      params: { page: 1, size: 10 },
    })
  })

  it('saves a category order after dragging the handle', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        content: [
          { id: 1, name: '前端' },
          { id: 2, name: '后端' },
        ],
        totalElements: 2,
        totalPages: 1,
        number: 0,
        size: 10,
      },
    })
    vi.mocked(axios.put).mockResolvedValue({ data: null })
    render(<AdminCategories />)

    const firstHandle = await screen.findByRole('button', { name: '拖动排序：前端' })
    const secondHandle = screen.getByRole('button', { name: '拖动排序：后端' })
    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
    }

    fireEvent.dragStart(firstHandle, { dataTransfer })
    fireEvent.dragEnter(secondHandle.closest('li') as HTMLElement)
    fireEvent.dragEnd(firstHandle, { dataTransfer })

    await waitFor(() => expect(axios.put).toHaveBeenCalledWith(
      '/api/admin/categories/reorder',
      { orderedIds: [2, 1] },
    ))
  })
})
