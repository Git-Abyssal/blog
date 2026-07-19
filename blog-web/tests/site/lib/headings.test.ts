import { describe, expect, it } from 'vitest'
import { extractMarkdownHeadings, nextHeadingId, plainHeadingText, remarkHeadingIds } from '@site/lib/headings'

describe('heading IDs', () => {
  it('uses visible heading text and stable duplicate suffixes', () => {
    const counts = new Map<string, number>()

    expect(plainHeadingText('[重复标题](https://example.com)')).toBe('重复标题')
    expect(nextHeadingId('重复标题', counts)).toBe('重复标题')
    expect(nextHeadingId('重复标题', counts)).toBe('重复标题-2')
    expect(nextHeadingId('重复标题', counts)).toBe('重复标题-3')
  })

  it('writes deterministic IDs into markdown heading nodes', () => {
    const tree = {
      type: 'root',
      children: [
        {
          type: 'heading',
          children: [{ type: 'link', children: [{ type: 'text', value: '重复标题' }] }],
        },
        {
          type: 'heading',
          children: [{ type: 'text', value: '重复标题' }],
        },
      ],
    }

    remarkHeadingIds()(tree)
    const headingNodes = tree.children as Array<(typeof tree.children)[number] & {
      data?: { hProperties?: { id?: string } }
    }>

    expect(headingNodes.map((node) => node.data?.hProperties?.id)).toEqual([
      '重复标题',
      '重复标题-2',
    ])
  })

  it('matches setext headings and ignores heading-looking code', () => {
    const headings = extractMarkdownHeadings([
      '主标题',
      '===',
      '',
      '```md',
      '# 代码里的标题',
      '```',
      '',
      '## [重复标题](https://example.com)',
      '重复标题',
      '---',
    ].join('\n'), 3)

    expect(headings).toEqual([
      { id: '主标题', text: '主标题', level: 1 },
      { id: '重复标题', text: '重复标题', level: 2 },
      { id: '重复标题-2', text: '重复标题', level: 2 },
    ])
  })

  it('decodes entities and includes headings nested in block quotes', () => {
    expect(extractMarkdownHeadings([
      '## A &amp; B',
      '',
      '> ## Nested title',
    ].join('\n'), 3)).toEqual([
      { id: 'a-b', text: 'A & B', level: 2 },
      { id: 'nested-title', text: 'Nested title', level: 2 },
    ])
  })

  it('keeps IDs aligned when a hidden heading level uses the same slug first', () => {
    expect(extractMarkdownHeadings([
      '#### 重复标题',
      '',
      '## 重复标题',
    ].join('\n'), 3)).toEqual([
      { id: '重复标题-2', text: '重复标题', level: 2 },
    ])
  })

  it('uses the same GFM footnote parsing as the rendered article', () => {
    expect(extractMarkdownHeadings([
      '## footnote[^1]',
      '',
      '[^1]: 注释内容',
    ].join('\n'), 3)).toEqual([
      { id: 'footnote', text: 'footnote', level: 2 },
    ])
  })
})
