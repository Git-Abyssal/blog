import { render, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '@admin/App'

vi.mock('axios')

describe('admin app boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(axios.get).mockRejectedValue({ response: { status: 401 } })
  })

  it('serves its login page below the /admin base path', async () => {
    window.history.replaceState({}, '', '/admin/login')

    render(<App />)

    expect(await screen.findByRole('heading', { name: '后台登录' })).toBeInTheDocument()
  })

  it('redirects a protected admin route to the admin login page', async () => {
    window.history.replaceState({}, '', '/admin/articles')

    render(<App />)

    expect(await screen.findByRole('heading', { name: '后台登录' })).toBeInTheDocument()
    await waitFor(() => expect(window.location.pathname).toBe('/admin/login'))
  })

  it('opens article management from the admin root path', async () => {
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url === '/api/auth/me') {
        return Promise.resolve({
          data: {
            id: 1,
            username: 'owner',
            mustChangePassword: false,
          },
        })
      }
      return Promise.resolve({
        data: {
          content: [],
          totalElements: 0,
          totalPages: 0,
          number: 0,
          size: 10,
        },
      })
    })
    window.history.replaceState({}, '', '/admin/')

    render(<App />)

    await waitFor(() => expect(window.location.pathname).toBe('/admin/articles'))
    const pageHeading = await screen.findByRole('heading', { name: '文章管理' })
    const navigation = screen.getByRole('navigation', { name: '管理导航' })
    expect(navigation.parentElement).toHaveClass('max-w-[72rem]')
    expect(navigation).toHaveClass('overflow-x-auto')
    expect(navigation).toHaveClass('border-b')
    expect(navigation).toHaveClass('py-1.5', 'sm:py-2')
    expect(navigation).not.toHaveClass('border-y')
    expect(navigation.querySelectorAll('a')).toHaveLength(4)
    expect(screen.getByRole('link', { name: '文章管理' })).toHaveAttribute('aria-current', 'page')
    expect(pageHeading.closest('section')).toHaveClass('admin-list-page')
    expect(pageHeading.closest('section')).not.toHaveClass('admin-panel', 'rounded-3xl')
    expect(navigation.compareDocumentPosition(pageHeading))
      .toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })
})
