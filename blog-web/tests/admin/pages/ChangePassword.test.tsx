import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChangePassword from '@admin/pages/ChangePassword'
import { useAuth } from '@shared/hooks/useAuth'
import { useToast } from '@shared/hooks/useToast'

vi.mock('axios')
vi.mock('@shared/hooks/useAuth')
vi.mock('@shared/hooks/useToast')

describe('ChangePassword', () => {
  const login = vi.fn()
  const success = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      owner: { id: 1, username: 'owner', mustChangePassword: true },
      isAuthenticated: true,
      login,
      logout: vi.fn(),
      loading: false,
    })
    vi.mocked(useToast).mockReturnValue({
      showToast: vi.fn(),
      success,
      error: vi.fn(),
      info: vi.fn(),
      warning: vi.fn(),
    })
    vi.mocked(axios.post).mockResolvedValue({ data: { code: 200 } })
  })

  it('clears the forced-password flag after a successful change', async () => {
    render(
      <MemoryRouter initialEntries={['/password']}>
        <Routes>
          <Route path="/password" element={<ChangePassword />} />
          <Route path="/articles" element={<p>已返回后台</p>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('当前密码'), { target: { value: 'Initial1!' } })
    fireEvent.change(screen.getByLabelText('新密码'), { target: { value: 'NewPassword1!' } })
    fireEvent.change(screen.getByLabelText('确认新密码'), { target: { value: 'NewPassword1!' } })
    fireEvent.click(screen.getByRole('button', { name: '确认修改' }))

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/auth/change-password', {
        currentPassword: 'Initial1!',
        newPassword: 'NewPassword1!',
      })
    })
    expect(login).toHaveBeenCalledWith(expect.objectContaining({ mustChangePassword: false }))
    expect(success).toHaveBeenCalledWith('密码修改成功')
    expect(await screen.findByText('已返回后台')).toBeInTheDocument()
  })

  it('does not show a home link that the password gate would reject', () => {
    render(
      <MemoryRouter initialEntries={['/password']}>
        <ChangePassword />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('link', { name: '返回首页' })).not.toBeInTheDocument()
  })

  it('associates backend complexity errors with the new-password field', async () => {
    vi.mocked(axios.post).mockRejectedValue({
      response: {
        data: {
          message: '请求参数校验失败',
          data: { errors: { newPassword: '密码必须包含至少一个特殊字符' } },
        },
      },
    })
    vi.mocked(axios.isAxiosError).mockReturnValue(true)

    render(
      <MemoryRouter>
        <ChangePassword />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('当前密码'), { target: { value: 'Initial1!' } })
    fireEvent.change(screen.getByLabelText('新密码'), { target: { value: 'NewPassword1' } })
    fireEvent.change(screen.getByLabelText('确认新密码'), { target: { value: 'NewPassword1' } })
    fireEvent.click(screen.getByRole('button', { name: '确认修改' }))

    const newPassword = await screen.findByLabelText('新密码')
    expect(await screen.findByText('密码必须包含至少一个特殊字符')).toBeInTheDocument()
    expect(newPassword).toHaveAttribute('aria-invalid', 'true')
    expect(newPassword).toHaveFocus()
    expect(screen.getByLabelText('当前密码')).toHaveAttribute('aria-invalid', 'false')
  })

  it('does not silently trim password values before submitting', async () => {
    render(
      <MemoryRouter initialEntries={['/password']}>
        <Routes>
          <Route path="/password" element={<ChangePassword />} />
          <Route path="/articles" element={<p>已返回后台</p>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('当前密码'), { target: { value: ' Initial1! ' } })
    fireEvent.change(screen.getByLabelText('新密码'), { target: { value: ' NewPassword1! ' } })
    fireEvent.change(screen.getByLabelText('确认新密码'), { target: { value: ' NewPassword1! ' } })
    fireEvent.click(screen.getByRole('button', { name: '确认修改' }))

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith('/api/auth/change-password', {
        currentPassword: ' Initial1! ',
        newPassword: ' NewPassword1! ',
      })
    })
  })
})
