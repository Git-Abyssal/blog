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

  it('does not render a second loading indicator', () => {
    vi.mocked(axios.get).mockImplementation(() => new Promise<never>(() => undefined))

    const { container } = render(<AdminCategories />)

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(container.querySelector('section[aria-busy="true"]')).toBeInTheDocument()
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

    const firstCategory = await screen.findByText('第一页分类')
    expect(firstCategory).toBeInTheDocument()
    const categoryList = firstCategory.closest('ul')
    const pageHeading = screen.getByRole('heading', { name: '分类管理' })
    expect(pageHeading.parentElement).toHaveTextContent('分类管理共 11 个分类')
    expect(pageHeading.closest('header')).toHaveClass('min-h-16', 'items-center')
    expect(categoryList).toHaveClass('border-b')
    expect(categoryList).not.toHaveClass('border-y', 'rounded-2xl', 'bg-white/70')
    expect(firstCategory.closest('li')).toHaveClass('items-center', 'pl-1.5', 'pr-[0.1875rem]', 'py-2.5')
    expect(screen.queryByText('当前分类')).not.toBeInTheDocument()
    expect(screen.queryByText('新增分类')).not.toBeInTheDocument()
    expect(screen.getByLabelText('新增分类')).toHaveClass('px-3', 'focus:ring-4', 'focus:ring-blue-500/10', 'dark:bg-slate-800')
    expect(screen.getByLabelText('新增分类')).not.toHaveClass('focus-visible:outline-none')
    expect(screen.getByLabelText('新增分类').closest('form')).toHaveClass('border-b', 'px-3', 'pb-4')
    expect(axios.get).toHaveBeenCalledWith('/api/admin/categories', {
      params: { page: 0, size: 10 },
    })

    fireEvent.click(screen.getByRole('button', { name: '编辑' }))
    const editDialogHeading = screen.getByRole('heading', { name: '编辑分类' })
    expect(editDialogHeading.parentElement).toHaveClass('items-center')
    expect(editDialogHeading.parentElement).not.toHaveClass('items-start')
    fireEvent.click(screen.getByRole('button', { name: '关闭' }))

    expect(screen.getByRole('navigation', { name: '分页导航' })).toHaveClass('justify-center', 'sm:justify-end', 'sm:px-3')
    fireEvent.click(screen.getByRole('button', { name: '第 2 页' }))

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
