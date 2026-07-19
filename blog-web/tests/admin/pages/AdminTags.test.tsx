import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminTags from '@admin/pages/AdminTags'
import { useToast } from '@shared/hooks/useToast'

vi.mock('axios')
vi.mock('@shared/hooks/useToast')

describe('AdminTags', () => {
  const success = vi.fn()
  const showError = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useToast).mockReturnValue({
      showToast: vi.fn(),
      success,
      error: showError,
      info: vi.fn(),
      warning: vi.fn(),
    })
    vi.mocked(axios.get).mockImplementation((_url, config) => {
      const page = (config as { params?: { page?: number } })?.params?.page ?? 0
      return Promise.resolve({
        data: {
          content: [{ id: page + 1, name: page === 0 ? 'React' : 'Spring Boot' }],
          totalElements: 11,
          totalPages: 2,
        },
      })
    })
  })

  it('uses the shared loading copy', () => {
    vi.mocked(axios.get).mockImplementation(() => new Promise<never>(() => undefined))

    render(<AdminTags />)

    expect(screen.getByRole('status')).toHaveTextContent(/^加载中$/)
  })

  it('loads tags and switches pages', async () => {
    render(<AdminTags />)

    const firstTag = await screen.findByText('React')
    expect(firstTag).toBeInTheDocument()
    const tagList = firstTag.closest('ul')
    const pageHeading = screen.getByRole('heading', { name: '标签管理' })
    expect(pageHeading.parentElement).toHaveTextContent('标签管理共 11 个标签')
    expect(pageHeading.closest('header')).toHaveClass('min-h-16', 'items-center')
    expect(tagList).toHaveClass('border-b')
    expect(tagList).not.toHaveClass('border-y', 'rounded-2xl', 'bg-white/70')
    expect(firstTag.closest('li')).toHaveClass('items-center', 'pl-1.5', 'pr-[0.1875rem]', 'py-2.5')
    expect(screen.queryByText('当前标签')).not.toBeInTheDocument()
    expect(screen.queryByText('新增标签')).not.toBeInTheDocument()
    expect(screen.getByLabelText('新增标签')).toHaveClass('px-3', 'focus:ring-4', 'focus:ring-blue-500/10', 'dark:bg-slate-800')
    expect(screen.getByLabelText('新增标签')).not.toHaveClass('focus-visible:outline-none')
    expect(screen.getByLabelText('新增标签').closest('form')).toHaveClass('border-b', 'px-3', 'pb-4')
    expect(axios.get).toHaveBeenCalledWith('/api/admin/tags', {
      params: { page: 0, size: 10 },
    })

    expect(screen.getByRole('button', { name: '下一页' }).parentElement).toHaveClass('justify-center', 'sm:justify-end', 'sm:px-3')
    fireEvent.click(screen.getByRole('button', { name: '下一页' }))

    expect(await screen.findByText('Spring Boot')).toBeInTheDocument()
    expect(axios.get).toHaveBeenLastCalledWith('/api/admin/tags', {
      params: { page: 1, size: 10 },
    })
  })

  it('updates a tag from the edit dialog', async () => {
    vi.mocked(axios.put).mockResolvedValue({ data: { id: 1, name: 'React 19' } })
    render(<AdminTags />)

    await screen.findByText('React')
    fireEvent.click(screen.getByRole('button', { name: '编辑' }))
    fireEvent.change(screen.getByLabelText('标签名称'), { target: { value: 'React 19' } })
    fireEvent.click(screen.getByRole('button', { name: '保存' }))

    await waitFor(() => expect(axios.put).toHaveBeenCalledWith(
      '/api/tags/1',
      { name: 'React 19' },
    ))
    expect(success).toHaveBeenCalledWith('标签已更新')
  })

  it('saves a tag order with the keyboard sorting control', async () => {
    vi.mocked(axios.get).mockResolvedValue({
      data: {
        content: [
          { id: 1, name: 'React' },
          { id: 2, name: 'Spring Boot' },
        ],
        totalElements: 2,
        totalPages: 1,
      },
    })
    vi.mocked(axios.put).mockResolvedValue({ data: null })
    render(<AdminTags />)

    const firstHandle = await screen.findByRole('button', { name: '拖动排序：React' })
    fireEvent.keyDown(firstHandle, { key: 'ArrowDown' })

    await waitFor(() => expect(axios.put).toHaveBeenCalledWith(
      '/api/admin/tags/reorder',
      { orderedIds: [2, 1] },
    ))
    expect(success).toHaveBeenCalledWith('标签排序已保存')
  })
})
