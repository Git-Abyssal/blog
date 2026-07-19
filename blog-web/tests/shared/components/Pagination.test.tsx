import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import Pagination from '@shared/components/Pagination'

describe('Pagination', () => {
  it('shows direct page controls without duplicate page copy', () => {
    const onPageChange = vi.fn()
    render(<Pagination currentPage={0} totalPages={3} onPageChange={onPageChange} />)

    const navigation = screen.getByRole('navigation', { name: '分页导航' })
    expect(navigation).toHaveClass('justify-center', 'sm:justify-end', 'sm:px-3')
    expect(screen.queryByText(/PAGE|第 1 \//)).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '第 1 页' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '第 2 页' })).toHaveClass('hidden', 'sm:inline-flex')
    expect(screen.getByRole('button', { name: '上一页' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: '第 2 页' }))
    expect(onPageChange).toHaveBeenCalledWith(1)
  })

  it('keeps long page ranges compact', () => {
    render(<Pagination currentPage={4} totalPages={10} onPageChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: '第 1 页' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '第 4 页' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '第 5 页' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '第 6 页' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '第 10 页' })).toBeInTheDocument()
  })
})
