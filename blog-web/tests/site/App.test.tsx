import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import axios from 'axios'
import { BrowserRouter, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App, { RouteFocusManager } from '@site/App'

vi.mock('axios')

const RouteFocusHarness = () => {
  const navigate = useNavigate()

  return (
    <>
      <RouteFocusManager />
      <button type="button" onClick={() => navigate('/route?edit=7', { replace: true })}>替换查询参数</button>
      <button type="button" onClick={() => navigate('/route?keyword=React')}>提交新查询</button>
      <button type="button" onClick={() => navigate('/next')}>打开新页面</button>
      <input aria-label="保持焦点" />
      <main id="main-content" tabIndex={-1}>主要内容</main>
    </>
  )
}

describe('App', () => {
  beforeEach(() => {
    window.history.pushState({}, '', '/')
    vi.clearAllMocks()
    vi.mocked(axios.get).mockImplementation((url: string) => {
      if (url === '/api/auth/me') return Promise.reject({ response: { status: 401 } })
      if (url === '/api/categories') return Promise.resolve({ data: [] })
      if (url.includes('tab=hot') && url.includes('size=5')) return Promise.resolve({ data: { content: [] } })
      return Promise.resolve({ data: { content: [], totalPages: 0, number: 0 } })
    })
  })

  it('boots with the React Query provider and renders the home page', async () => {
    render(<App />)

    expect(await screen.findByRole('navigation', { name: '文章分类' })).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('出错了')).not.toBeInTheDocument())
  })

  it('renders the not-found page for an unknown route', async () => {
    window.history.pushState({}, '', '/unknown')
    render(<App />)

    expect(await screen.findByRole('heading', { name: '页面不存在' })).toBeInTheDocument()
  })

  it('shows only the article loading state while opening an article route', async () => {
    window.history.pushState({}, '', '/article/1')
    vi.mocked(axios.get).mockImplementation(() => new Promise<never>(() => undefined))

    render(<App />)

    expect(await screen.findByRole('status', { name: '正在加载文章' })).toBeInTheDocument()
    expect(screen.queryByText('正在加载页面…')).not.toBeInTheDocument()
    expect(screen.getAllByRole('status')).toHaveLength(1)
  })

  it('keeps focus for same-page query updates but resets it after a pathname change', async () => {
    window.history.pushState({}, '', '/route')
    const scrollTo = vi.spyOn(window, 'scrollTo')
    render(
      <BrowserRouter>
        <RouteFocusHarness />
      </BrowserRouter>,
    )

    const input = screen.getByLabelText('保持焦点')
    input.focus()
    fireEvent.click(screen.getByRole('button', { name: '替换查询参数' }))

    await waitFor(() => expect(window.location.search).toBe('?edit=7'))
    expect(input).toHaveFocus()
    expect(scrollTo).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '提交新查询' }))

    await waitFor(() => expect(window.location.search).toBe('?keyword=React'))
    expect(input).toHaveFocus()
    expect(scrollTo).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '打开新页面' }))

    await waitFor(() => expect(screen.getByText('主要内容')).toHaveFocus())
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' })
  })
})
