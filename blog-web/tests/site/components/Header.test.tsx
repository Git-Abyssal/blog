import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import Header from '@site/components/Header'

vi.mock('@shared/components/ThemeToggle', () => ({ default: () => <button type="button">切换主题</button> }))

const LocationProbe = () => {
  const location = useLocation()
  return <output aria-label="当前位置">{location.pathname}{location.search}</output>
}

describe('public header', () => {
  it('shows search, theme and home navigation', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    )

    expect(screen.getByRole('link', { name: '返回文章首页' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: '返回文章首页' })).toHaveTextContent('ABYSSAL')
    expect(screen.getByRole('searchbox', { name: '搜索文章' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '切换主题' })).toBeInTheDocument()
    const banner = screen.getByRole('banner')
    expect(banner).not.toHaveClass('border-b')
    expect(banner.firstElementChild?.firstElementChild).toHaveClass('h-16', 'max-w-[69rem]', 'border-b')
  })

  it('removes the global header from article detail pages', () => {
    render(
      <MemoryRouter initialEntries={['/article/1']}>
        <Header />
      </MemoryRouter>,
    )

    expect(screen.queryByRole('banner')).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: '返回文章首页' })).not.toBeInTheDocument()
  })

  it('closes the mobile navigation with Escape', () => {
    render(
      <MemoryRouter>
        <Header />
      </MemoryRouter>,
    )

    const menuButton = screen.getByRole('button', { name: '打开导航' })
    fireEvent.click(menuButton)
    expect(screen.getByRole('button', { name: '关闭导航' })).toHaveAttribute('aria-expanded', 'true')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.getByRole('button', { name: '打开导航' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('resets scroll and focus when searching again on the results page', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo')
    render(
      <MemoryRouter initialEntries={['/search?keyword=React']}>
        <Header />
        <LocationProbe />
        <main id="main-content" tabIndex={-1}>主要内容</main>
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByRole('searchbox', { name: '搜索文章' }), {
      target: { value: 'MySQL' },
    })
    fireEvent.click(screen.getByRole('button', { name: '搜索' }))

    expect(await screen.findByLabelText('当前位置')).toHaveTextContent('/search?keyword=MySQL')
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, left: 0, behavior: 'auto' })
    await waitFor(() => expect(screen.getByText('主要内容')).toHaveFocus())
  })
})
