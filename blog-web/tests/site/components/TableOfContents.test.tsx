import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import TableOfContents from '@site/components/TableOfContents'

describe('TableOfContents', () => {
  beforeEach(() => {
    window.history.replaceState({}, '', '/article/1')
  })

  it('updates the hash and explicitly moves to the selected heading', () => {
    render(
      <>
        <TableOfContents content="## 最后的取舍" />
        <h2 id="最后的取舍">最后的取舍</h2>
      </>,
    )
    const heading = screen.getByRole('heading', { name: '最后的取舍' })
    const scrollIntoView = vi.fn()
    Object.defineProperty(heading, 'scrollIntoView', {
      configurable: true,
      value: scrollIntoView,
    })

    expect(screen.getByRole('navigation', { name: '本文目录' })).toHaveClass(
      'border-t',
      'pt-4',
    )
    expect(screen.getByRole('heading', { name: '本文目录' })).toBeInTheDocument()
    expect(screen.getByText('1 节')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('link', { name: '最后的取舍' }))

    expect(window.location.hash).toBe(`#${encodeURIComponent('最后的取舍')}`)
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    expect(heading).toHaveFocus()
    expect(screen.getByRole('link', { name: '最后的取舍' })).toHaveClass(
      'border-brand-blue',
      'bg-blue-50/60',
      'text-slate-950',
    )
    expect(screen.getByRole('link', { name: '最后的取舍' })).toHaveAttribute(
      'aria-current',
      'location',
    )
  })

  it('shows the section count in the collapsible mobile table of contents', () => {
    render(<TableOfContents content={'## 第一节\n\n### 细节'} collapsible />)

    expect(screen.getByText('2 节')).toBeInTheDocument()
    expect(screen.getByRole('navigation', { name: '本文目录' })).toHaveClass(
      'border-t',
      'py-2',
    )
  })

  it('keeps the current section aligned with the reading position', () => {
    const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        const top = this.id === '第二节' ? 80 : -20
        return { top } as DOMRect
      })

    render(
      <>
        <TableOfContents content={'## 第一节\n\n## 第二节'} />
        <h2 id="第一节">第一节</h2>
        <h2 id="第二节">第二节</h2>
      </>,
    )
    fireEvent.scroll(window)

    expect(screen.getByRole('link', { name: '第二节' })).toHaveAttribute(
      'aria-current',
      'location',
    )
    rectSpy.mockRestore()
  })
})
