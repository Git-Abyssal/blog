export interface Owner {
  id: number
  username: string
  mustChangePassword?: boolean
}

export interface Category {
  id: number
  name: string
}

export interface Tag {
  id: number
  name: string
}

export interface Article {
  id: number
  title: string
  content: string
  summary: string
  coverImage?: string
  category?: Category
  tags?: Tag[]
  views: number
  commentCount?: number
  status?: 'draft' | 'published'
  createdAt: string
  updatedAt: string
}

export interface Comment {
  id: number
  content: string
  ownerComment?: boolean
  guestName?: string
  status?: 'pending' | 'approved'
  reviewedAt?: string | null
  articleId?: number
  articleTitle?: string
  parentId?: number
  replies?: Comment[]
  createdAt: string
}

export interface PageResponse<T> {
  content: T[]
  totalElements: number
  totalPages: number
  number: number
  size: number
}
