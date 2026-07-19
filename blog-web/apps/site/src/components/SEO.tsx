import { Helmet } from 'react-helmet-async'
import type { Article } from '@shared/types'
import { siteConfig } from '../config/site'

interface SEOProps {
  title?: string
  description?: string
  image?: string
  article?: Article
  noIndex?: boolean
}

const SEO: React.FC<SEOProps> = ({ title, description, image, article, noIndex }) => {
  const stripMarkdown = (text: string) => text.replace(/[#*_`[\]()>~|\\-]/g, '').replace(/\s+/g, ' ').trim()

  const siteName = siteConfig.title
  const defaultTitle = article ? `${stripMarkdown(article.title)} - ${siteName}` : siteName
  const rawDescription = article
    ? (article.summary || (article.content ? String(article.content).substring(0, 200) : ''))
    : siteConfig.description
  const defaultDescription = stripMarkdown(rawDescription).substring(0, 160)
  const siteOrigin = window.location.origin
  const defaultImage = article?.coverImage
    ? new URL(article.coverImage, siteOrigin).toString()
    : `${siteOrigin}/logo.png`

  const seoTitle = title || defaultTitle
  const seoDescription = description || defaultDescription
  const seoImage = image ? new URL(image, siteOrigin).toString() : defaultImage
  const url = article
    ? `${siteOrigin}/article/${article.id}`
    : `${siteOrigin}${window.location.pathname}`
  const privateRoute = /^\/(?:admin|login|settings|write)(?:\/|$)/.test(window.location.pathname)
  const shouldNoIndex = noIndex ?? privateRoute
  const articleSchema = article ? {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: stripMarkdown(article.title),
    description: seoDescription,
    image: [seoImage],
    datePublished: article.createdAt,
    dateModified: article.updatedAt || article.createdAt,
    author: {
      '@type': 'Person',
      name: siteConfig.authorName,
      url: siteOrigin,
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': url,
    },
    keywords: article.tags?.map((tag) => tag.name).join(', '),
  } : null

  return (
    <Helmet>
      <title>{seoTitle}</title>
      <meta name="description" content={seoDescription} />
      <meta name="robots" content={shouldNoIndex ? 'noindex, nofollow' : 'index, follow'} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={article ? 'article' : 'website'} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDescription} />
      <meta property="og:image" content={seoImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={url} />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDescription} />
      <meta name="twitter:image" content={seoImage} />

      {/* Article specific */}
      {article && (
        <>
          <meta property="article:published_time" content={article.createdAt} />
          <meta property="article:author" content={siteConfig.authorName} />
          {article.tags && article.tags.map((tag, index) => (
            <meta key={index} property="article:tag" content={tag.name} />
          ))}
          <script type="application/ld+json">{JSON.stringify(articleSchema)}</script>
        </>
      )}

      {/* Canonical URL */}
      <link rel="canonical" href={url} />
    </Helmet>
  )
}

export default SEO
