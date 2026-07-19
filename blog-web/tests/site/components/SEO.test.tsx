import { render, waitFor } from '@testing-library/react'
import { HelmetProvider } from 'react-helmet-async'
import { afterEach, describe, expect, it } from 'vitest'
import SEO from '@site/components/SEO'
import { siteConfig } from '@site/config/site'

const article = {
  id: 9,
  title: '可靠的部署记录',
  content: '文章正文',
  summary: '这是一段摘要',
  coverImage: '/uploads/cover.png',
  tags: [{ id: 1, name: 'Spring Boot' }],
  views: 0,
  createdAt: '2026-07-16T10:00:00',
  updatedAt: '2026-07-16T11:00:00',
}

describe('SEO', () => {
  afterEach(() => {
    window.history.pushState({}, '', '/')
  })

  it('uses the concise public tab title', async () => {
    render(<HelmetProvider><SEO /></HelmetProvider>)

    await waitFor(() => {
      expect(document.title).toBe(siteConfig.title)
    })
  })

  it('adds absolute sharing metadata and BlogPosting structured data', async () => {
    window.history.pushState({}, '', '/article/9')
    render(<HelmetProvider><SEO article={article} /></HelmetProvider>)

    await waitFor(() => {
      expect(document.title).toBe(`可靠的部署记录 - ${siteConfig.title}`)
      expect(document.querySelector('meta[property="og:image"]')).toHaveAttribute(
        'content',
        `${window.location.origin}/uploads/cover.png`,
      )
    })
    const schema = JSON.parse(document.querySelector('script[type="application/ld+json"]')?.textContent ?? '{}')
    expect(schema['@type']).toBe('BlogPosting')
    expect(schema.headline).toBe('可靠的部署记录')
    expect(schema.author).toEqual({
      '@type': 'Person',
      name: siteConfig.authorName,
      url: window.location.origin,
    })
    expect(schema.mainEntityOfPage['@id']).toBe(`${window.location.origin}/article/9`)
  })

  it('marks owner-only routes as noindex', async () => {
    window.history.pushState({}, '', '/admin/comments')
    render(<HelmetProvider><SEO /></HelmetProvider>)

    await waitFor(() => {
      expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex, nofollow')
    })
  })
})
