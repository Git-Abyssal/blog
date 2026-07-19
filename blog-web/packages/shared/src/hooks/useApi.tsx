import { keepPreviousData, useQuery, useInfiniteQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { Article, Comment, PageResponse } from '@shared/types'

export function useArticles(params?: {
  keyword?: string
  page?: number
  size?: number
  sort?: string
  tab?: string
  categoryId?: number
  tagId?: number
}) {
  return useQuery({
    queryKey: ['articles', params],
    queryFn: () => api.get<PageResponse<Article>>('/api/articles', params || {}),
    placeholderData: keepPreviousData,
    staleTime: 0,
  })
}

// ============ Infinite Scroll Articles ============

export function useInfiniteArticles(params?: { keyword?: string; tab?: string; categoryId?: number; tagId?: number; size?: number }) {
  const size = params?.size || 10
  return useInfiniteQuery({
    queryKey: ['infinite-articles', params],
    queryFn: ({ pageParam = 0 }) => {
      const queryParams: any = { page: pageParam, size, ...params }
      return api.get<any>('/api/articles', queryParams)
    },
    getNextPageParam: (lastPage: any) => {
      const currentPage = lastPage?.number ?? 0
      const totalPages = lastPage?.totalPages ?? 0
      return currentPage + 1 < totalPages ? currentPage + 1 : undefined
    },
    initialPageParam: 0,
    staleTime: 0,
  })
}

// ============ Threaded Comments ============

export function useThreadedComments(articleId: number, page: number = 0) {
  return useQuery({
    queryKey: ['threaded-comments', articleId, page],
    queryFn: () => api.get<PageResponse<Comment>>(`/api/comments/article/${articleId}/threaded?page=${page}&size=20`),
    enabled: !!articleId,
    staleTime: 0,
  })
}
