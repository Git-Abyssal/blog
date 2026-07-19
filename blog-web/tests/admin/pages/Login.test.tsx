import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter, MemoryRouter, Route, Routes } from 'react-router-dom'
import axios from 'axios'
import { useAuth } from '@shared/hooks/useAuth'
import Login from '@admin/pages/Login'

// Mock useAuth hook
vi.mock('@shared/hooks/useAuth')

// Mock axios
vi.mock('axios')

describe('Login Page', () => {
  const mockLogin = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuth).mockReturnValue({
      owner: null,
      isAuthenticated: false,
      login: mockLogin,
      logout: vi.fn(),
      loading: false,
    })
  })

  it('renders login form', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    expect(screen.getByText('后台登录')).toBeInTheDocument()
    expect(screen.getByLabelText('用户名')).toBeInTheDocument()
    expect(screen.getByLabelText('密码')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /登录/i })).toBeInTheDocument()
  })

  it('redirects an authenticated owner away from the login page', async () => {
    vi.mocked(useAuth).mockReturnValue({
      owner: { id: 1, username: 'owner' },
      isAuthenticated: true,
      login: mockLogin,
      logout: vi.fn(),
      loading: false,
    })

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/articles" element={<p>后台文章管理</p>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(await screen.findByText('后台文章管理')).toBeInTheDocument()
  })

  it('shows validation error for empty fields', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const loginButton = screen.getByRole('button', { name: /登录/i })
    fireEvent.click(loginButton)

    // Should not submit (form validation)
    expect(mockLogin).not.toHaveBeenCalled()
  })

  it('keeps the password visibility control in the keyboard tab order', () => {
    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const passwordInput = screen.getByLabelText('密码')
    const visibilityButton = screen.getByRole('button', { name: '显示密码' })
    expect(visibilityButton).toHaveProperty('tabIndex', 0)
    expect(passwordInput).toHaveAttribute('type', 'password')

    fireEvent.click(visibilityButton)
    expect(passwordInput).toHaveAttribute('type', 'text')
    expect(screen.getByRole('button', { name: '隐藏密码' })).toBeInTheDocument()
  })

  it('calls login API with credentials', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        owner: { id: 1, username: 'testuser' }
      }
    })

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const usernameInput = screen.getByLabelText('用户名')
    const passwordInput = screen.getByLabelText('密码')
    const loginButton = screen.getByRole('button', { name: /登录/i })

    fireEvent.change(usernameInput, { target: { value: 'testuser' } })
    fireEvent.change(passwordInput, { target: { value: 'password123' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(axios.post).toHaveBeenCalledWith(
        '/api/auth/login',
        { username: 'testuser', password: 'password123' }
      )
      expect(mockLogin).toHaveBeenCalledWith({ id: 1, username: 'testuser' })
    })
  })

  it('sends the owner to password settings when the initial password must change', async () => {
    vi.mocked(axios.post).mockResolvedValue({
      data: {
        owner: { id: 1, username: 'owner', mustChangePassword: true },
      },
    })

    render(
      <MemoryRouter initialEntries={['/login']}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/password" element={<p>必须修改初始密码</p>} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'owner' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'Initial-Password1!' } })
    fireEvent.click(screen.getByRole('button', { name: /登录/i }))

    expect(await screen.findByText('必须修改初始密码')).toBeInTheDocument()
  })

  it('displays error message on failed login', async () => {
    vi.mocked(axios.post).mockRejectedValue({
      response: {
        status: 401,
        data: { message: '用户名或密码错误' }
      }
    })
    vi.mocked(axios.isAxiosError).mockReturnValue(true)

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    const usernameInput = screen.getByLabelText('用户名')
    const passwordInput = screen.getByLabelText('密码')
    const loginButton = screen.getByRole('button', { name: /登录/i })

    fireEvent.change(usernameInput, { target: { value: 'wronguser' } })
    fireEvent.change(passwordInput, { target: { value: 'wrongpass' } })
    fireEvent.click(loginButton)

    await waitFor(() => {
      expect(screen.getByText('用户名或密码错误')).toBeInTheDocument()
    })
  })

  it('does not report a connection failure as a wrong password', async () => {
    vi.mocked(axios.post).mockRejectedValue(new Error('Network Error'))
    vi.mocked(axios.isAxiosError).mockReturnValue(true)

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'admin' } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'CorrectPassword1!' } })
    fireEvent.click(screen.getByRole('button', { name: /登录/i }))

    expect(await screen.findByText('无法连接服务器，请确认后端服务已启动')).toBeInTheDocument()
    expect(screen.queryByText('用户名或密码错误')).not.toBeInTheDocument()
    expect(screen.getByLabelText('用户名')).toHaveAttribute('aria-invalid', 'false')
    expect(screen.getByLabelText('密码')).toHaveAttribute('aria-invalid', 'false')
  })

  it('associates server-side field errors with the matching input', async () => {
    vi.mocked(axios.post).mockRejectedValue({
      response: {
        status: 400,
        data: {
          message: '请求参数校验失败',
          data: { errors: { username: '用户名长度不能超过50个字符' } },
        },
      },
    })
    vi.mocked(axios.isAxiosError).mockReturnValue(true)

    render(
      <BrowserRouter>
        <Login />
      </BrowserRouter>
    )

    fireEvent.change(screen.getByLabelText('用户名'), { target: { value: 'x'.repeat(51) } })
    fireEvent.change(screen.getByLabelText('密码'), { target: { value: 'password123' } })
    fireEvent.click(screen.getByRole('button', { name: /登录/i }))

    const username = await screen.findByLabelText('用户名')
    expect(await screen.findByText('用户名长度不能超过50个字符')).toBeInTheDocument()
    expect(username).toHaveAttribute('aria-invalid', 'true')
    expect(username).toHaveFocus()
    expect(screen.getByLabelText('密码')).toHaveAttribute('aria-invalid', 'false')
  })
})
