import { siteDefaults } from '../../../../site.defaults'

export const siteConfig = {
  title: import.meta.env.VITE_SITE_TITLE || siteDefaults.title,
  authorName: import.meta.env.VITE_AUTHOR_NAME || siteDefaults.authorName,
  description: import.meta.env.VITE_SITE_DESCRIPTION || siteDefaults.description,
} as const
