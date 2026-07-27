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
      'border-slate-200',
      'pt-2',
      'lg:border-t-0',
      'dark:border-slate-700',
    )
    expect(screen.getByRole('navigation', { name: '本文目录' })).not.toHaveClass('border-slate-300')
    const tocHeading = screen.getByRole('heading', { name: '本文目录' })
    const sectionCount = screen.getByText('1 节')
    expect(tocHeading.parentElement).toHaveClass('gap-2')
    expect(tocHeading.parentElement).not.toHaveClass('justify-between')
    expect(tocHeading.nextElementSibling).toBe(sectionCount)
    fireEvent.click(screen.getByRole('link', { name: '最后的取舍' }))

    expect(window.location.hash).toBe(`#${encodeURIComponent('最后的取舍')}`)
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' })
    expect(heading).toHaveFocus()
    expect(screen.getByRole('link', { name: '最后的取舍' })).toHaveClass(
      'border-brand-blue',
      'bg-blue-50/60',
      'text-slate-950',
      'lg:py-0.5',
      'lg:leading-4',
    )
    expect(screen.getByRole('link', { name: '最后的取舍' })).toHaveAttribute(
      'aria-current',
      'location',
    )
  })

  it('shows the section count in the collapsible mobile table of contents', () => {
    render(<TableOfContents content={'## 第一节\n\n### 细节'} collapsible />)

    expect(screen.getByText('2 节')).toBeInTheDocument()
    expect(screen.getByText('2 节').closest('details')).toHaveClass(
      'border-b',
      'border-slate-200',
      'dark:border-slate-700',
    )
    expect(screen.getByText('2 节').closest('details')).not.toHaveClass('border-t', 'border-y')
    expect(screen.getByText('本文目录').closest('summary')).toHaveClass(
      'flex',
      'min-h-10',
      'items-center',
      'justify-start',
    )
    expect(screen.getByText('本文目录').closest('summary')).not.toHaveClass(
      'grid',
      'min-h-12',
      'grid-cols-[1fr_auto_1fr]',
      'justify-between',
    )
    expect(screen.getByText('本文目录')).toHaveClass('-translate-y-1')
    expect(screen.getByText('2 节').parentElement).toHaveClass('-translate-y-1', 'items-center')
    expect(screen.getByText('本文目录')).not.toHaveClass('col-start-2', 'text-center')
    expect(screen.getByRole('navigation', { name: '本文目录' })).toHaveClass(
      'border-t',
      'border-slate-200',
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

  it('keeps the clicked section active while smooth scrolling reaches it', () => {
    let firstHeadingTop = -20
    let secondHeadingTop = 500
    const rectSpy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        if (this.id === '第二节') return { top: secondHeadingTop } as DOMRect
        return { top: firstHeadingTop } as DOMRect
      })

    render(
      <>
        <TableOfContents content={'## 第一节\n\n## 第二节'} />
        <h2 id="第一节">第一节</h2>
        <h2 id="第二节">第二节</h2>
      </>,
    )
    const secondHeading = screen.getByRole('heading', { name: '第二节' })
    Object.defineProperty(secondHeading, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })

    const secondLink = screen.getByRole('link', { name: '第二节' })
    fireEvent.click(secondLink)
    fireEvent.scroll(window)

    expect(secondLink).toHaveAttribute('aria-current', 'location')

    secondHeadingTop = 80
    fireEvent.scroll(window)
    expect(secondLink).toHaveAttribute('aria-current', 'location')

    firstHeadingTop = 80
    secondHeadingTop = 500
    fireEvent.scroll(window)
    expect(screen.getByRole('link', { name: '第一节' })).toHaveAttribute(
      'aria-current',
      'location',
    )
    rectSpy.mockRestore()
  })
})
