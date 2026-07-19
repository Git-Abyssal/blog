import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import ArticleCard from '@site/components/ArticleCard'

const article = {
  id: 7,
  title: '保留返回位置',
  summary: '从搜索结果进入详情',
  content: '正文',
  views: 1,
  createdAt: '2026-07-19T00:00:00',
  updatedAt: '2026-07-19T00:00:00',
}

const LocationStateProbe = () => {
  const location = useLocation()
  return <span>{String((location.state as { returnTo?: string } | null)?.returnTo || '')}</span>
}

describe('ArticleCard', () => {
  it('passes the current list location to the article detail page', () => {
    render(
      <MemoryRouter initialEntries={['/search?keyword=Spring']}>
        <Routes>
          <Route path="/search" element={<ArticleCard article={article} />} />
          <Route path="/article/:id" element={<LocationStateProbe />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('link', { name: /保留返回位置/ }))

    expect(screen.getByText('/search?keyword=Spring')).toBeInTheDocument()
  })
})
