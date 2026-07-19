import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import CategoryDetail from '@site/pages/CategoryDetail'
import SearchResults from '@site/pages/SearchResults'
import TagDetail from '@site/pages/TagDetail'
import { useInfiniteArticles } from '@shared/hooks/useApi'
import { useInfiniteScroll } from '@site/hooks/useInfiniteScroll'

vi.mock('@shared/hooks/useApi', () => ({ useInfiniteArticles: vi.fn() }))
vi.mock('@site/hooks/useInfiniteScroll', () => ({ useInfiniteScroll: vi.fn() }))

const refetch = vi.fn()

const RepeatSearchButton = () => {
  const navigate = useNavigate()
  return (
    <button type="button" onClick={() => navigate('/search?keyword=Spring')}>
      再次搜索
    </button>
  )
}

const renderRoute = (entry: string, path: string, element: React.ReactNode) => render(
  <MemoryRouter initialEntries={[entry]}>
    <Routes>
      <Route path={path} element={element} />
    </Routes>
  </MemoryRouter>,
)

describe('article listing error states', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useInfiniteScroll).mockReturnValue(vi.fn())
    vi.mocked(useInfiniteArticles).mockReturnValue({
      data: undefined,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
      isLoading: false,
      isError: true,
      refetch,
    } as unknown as ReturnType<typeof useInfiniteArticles>)
  })

  it('does not present a failed search as zero results', () => {
    renderRoute('/search?keyword=Spring', '/search', <SearchResults />)

    expect(screen.getByText('搜索结果暂时加载失败')).toBeInTheDocument()
    expect(screen.queryByText('没有找到相关文章，试试其他关键词')).not.toBeInTheDocument()
    expect(screen.queryByText('共找到 0 篇相关文章')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('refreshes when the same search is submitted again', async () => {
    renderRoute(
      '/search?keyword=Spring',
      '/search',
      <>
        <RepeatSearchButton />
        <SearchResults />
      </>,
    )

    fireEvent.click(screen.getByRole('button', { name: '再次搜索' }))

    await waitFor(() => expect(refetch).toHaveBeenCalledTimes(1))
  })

  it('does not present a failed category request as an empty category', () => {
    renderRoute('/category/7', '/category/:id', <CategoryDetail />)

    expect(screen.getByText('分类文章暂时加载失败')).toBeInTheDocument()
    expect(screen.queryByText('该分类下暂无文章')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })

  it('does not present a failed tag request as an empty tag', () => {
    renderRoute('/tag/9', '/tag/:id', <TagDetail />)

    expect(screen.getByText('标签文章暂时加载失败')).toBeInTheDocument()
    expect(screen.queryByText('该标签下暂无文章')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '重新加载' }))
    expect(refetch).toHaveBeenCalledTimes(1)
  })
})
