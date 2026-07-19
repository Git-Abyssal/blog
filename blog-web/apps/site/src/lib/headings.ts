import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkGfm from 'remark-gfm'

export const plainHeadingText = (value: string) => value
  .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
  .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
  .replace(/[*_`~]/g, '')
  .replace(/<[^>]+>/g, '')
  .trim()

const headingSlug = (value: string) => plainHeadingText(value)
  .toLowerCase()
  .replace(/[^a-z0-9\u4e00-\u9fff]+/g, '-')
  .replace(/^-|-$/g, '')

export const nextHeadingId = (value: string, counts: Map<string, number>) => {
  const base = headingSlug(value) || 'section'
  const count = counts.get(base) ?? 0
  counts.set(base, count + 1)
  return count === 0 ? base : `${base}-${count + 1}`
}

export interface MarkdownHeading {
  id: string
  text: string
  level: number
}

interface MarkdownNode {
  type?: string
  value?: string
  alt?: string
  depth?: number
  children?: MarkdownNode[]
  data?: {
    hProperties?: Record<string, unknown>
    [key: string]: unknown
  }
}

const markdownParser = unified().use(remarkParse).use(remarkGfm)

const markdownNodeText = (node: MarkdownNode): string => {
  if (typeof node.value === 'string') return node.value
  if (typeof node.alt === 'string') return node.alt
  return node.children?.map(markdownNodeText).join('') ?? ''
}

export const extractMarkdownHeadings = (content: string, maxLevel = 6): MarkdownHeading[] => {
  const headings: MarkdownHeading[] = []
  const counts = new Map<string, number>()
  const tree = markdownParser.parse(content) as MarkdownNode

  const visit = (node: MarkdownNode) => {
    if (node.type === 'heading' && typeof node.depth === 'number') {
      const text = plainHeadingText(markdownNodeText(node))
      const id = nextHeadingId(text, counts)
      if (text && node.depth <= maxLevel) headings.push({ id, text, level: node.depth })
    }
    node.children?.forEach(visit)
  }

  visit(tree)
  return headings
}

export const remarkHeadingIds = () => (tree: MarkdownNode) => {
  const counts = new Map<string, number>()

  const visit = (node: MarkdownNode) => {
    if (node.type === 'heading') {
      node.data = {
        ...node.data,
        hProperties: {
          ...node.data?.hProperties,
          id: nextHeadingId(markdownNodeText(node), counts)
        }
      }
    }

    node.children?.forEach(visit)
  }

  visit(tree)
}
