import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import AdminHeader from '@admin/components/AdminHeader'
import { useAuth } from '@shared/hooks/useAuth'

vi.mock('@shared/hooks/useAuth')
vi.mock('@shared/components/ThemeToggle', () => ({ default: () => <button type="button">主题</button> }))
describe('AdminHeader', () => {
  beforeEach(() => {
    vi.mocked(useAuth).mockReturnValue({
      owner: { id: 1, username: 'owner' },
      isAuthenticated: true,
      login: vi.fn(),
      logout: vi.fn(),
      loading: false,
    })
  })

  it('does not render the admin header on the editor page', () => {
    render(
      <MemoryRouter initialEntries={['/write?edit=7']}>
        <AdminHeader />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
  })

  it('shows the owner account actions', () => {
    render(
      <MemoryRouter initialEntries={['/tags']}>
        <AdminHeader />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: '修改密码' })).toHaveClass('h-11', 'w-11', 'border', 'border-transparent')
    expect(screen.getByRole('button', { name: '退出登录' })).toHaveClass('h-11', 'w-11', 'border', 'border-transparent')
  })
})
