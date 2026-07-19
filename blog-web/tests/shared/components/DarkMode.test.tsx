import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useDarkMode } from '@shared/hooks/useDarkMode'
import ThemeToggle from '@shared/components/ThemeToggle'

// Mock useDarkMode hook
vi.mock('@shared/hooks/useDarkMode')

describe('Dark Mode', () => {
  beforeEach(() => {
    vi.mocked(useDarkMode).mockReturnValue({
      theme: 'light',
      toggleTheme: vi.fn()
    })
  })

  it('renders theme toggle button', () => {
    const mockToggle = vi.fn()

    vi.mocked(useDarkMode).mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggle
    })

    render(<ThemeToggle />)

    const button = screen.getByRole('button', { name: '切换到深色模式' })
    expect(button).toBeInTheDocument()
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows sun icon in dark mode', () => {
    const mockToggle = vi.fn()

    vi.mocked(useDarkMode).mockReturnValue({
      theme: 'dark',
      toggleTheme: mockToggle
    })

    render(<ThemeToggle />)

    const sunIcon = screen.getByRole('button', { name: '切换到浅色模式' })
    expect(sunIcon).toBeInTheDocument()
  })

  it('calls toggleTheme on click', () => {
    const mockToggle = vi.fn()

    vi.mocked(useDarkMode).mockReturnValue({
      theme: 'light',
      toggleTheme: mockToggle
    })

    render(<ThemeToggle />)

    const button = screen.getByRole('button', { name: '切换到深色模式' })
    fireEvent.click(button)

    expect(mockToggle).toHaveBeenCalledTimes(1)
  })
})
