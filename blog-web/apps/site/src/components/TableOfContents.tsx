import React, { useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { extractMarkdownHeadings } from '../lib/headings'

interface TableOfContentsProps {
  content: string
  collapsible?: boolean
}

const TableOfContents: React.FC<TableOfContentsProps> = ({ content, collapsible = false }) => {
  const [activeId, setActiveId] = useState('')
  const clickedIdRef = useRef('')
  const toc = useMemo(() => extractMarkdownHeadings(content, 3), [content])

  useEffect(() => {
    if (toc.length === 0) return

    const updateActiveHeading = () => {
      const activationLine = 112

      if (clickedIdRef.current) {
        const clickedIndex = toc.findIndex((item) => item.id === clickedIdRef.current)
        const clickedHeading = document.getElementById(clickedIdRef.current)
        const nextHeading = clickedIndex >= 0 && clickedIndex < toc.length - 1
          ? document.getElementById(toc[clickedIndex + 1].id)
          : null
        const clickedIsCurrent = clickedHeading
          && clickedHeading.getBoundingClientRect().top <= activationLine
          && (!nextHeading || nextHeading.getBoundingClientRect().top > activationLine)

        if (!clickedIsCurrent) return
        clickedIdRef.current = ''
      }

      let currentId = toc[0].id

      for (const item of toc) {
        const heading = document.getElementById(item.id)
        if (!heading || heading.getBoundingClientRect().top > activationLine) break
        currentId = item.id
      }

      setActiveId(currentId)
    }

    updateActiveHeading()
    window.addEventListener('scroll', updateActiveHeading, { passive: true })
    window.addEventListener('resize', updateActiveHeading)

    return () => {
      window.removeEventListener('scroll', updateActiveHeading)
      window.removeEventListener('resize', updateActiveHeading)
    }
  }, [toc])

  if (toc.length === 0) return null

  const handleHeadingClick = (event: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    const target = document.getElementById(id)
    if (!target) return

    event.preventDefault()
    const nextHash = `#${encodeURIComponent(id)}`
    if (window.location.hash !== nextHash) window.history.pushState(null, '', nextHash)
    clickedIdRef.current = id
    setActiveId(id)
    target.setAttribute('tabindex', '-1')
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    target.scrollIntoView({ behavior, block: 'start' })
    target.focus({ preventScroll: true })
  }

  const items = (
    <ul className="space-y-0.5 border-l border-slate-200 dark:border-slate-700">
      {toc.map((item) => {
        const isActive = activeId === item.id

        return (
        <li key={item.id}>
          <a
            href={`#${item.id}`}
            onClick={(event) => handleHeadingClick(event, item.id)}
            aria-current={isActive ? 'location' : undefined}
            className={`-ml-px flex min-h-11 items-center rounded-r-lg border-l-2 py-2 pr-1 text-[13px] leading-5 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-brand-blue lg:min-h-0 lg:py-0.5 lg:leading-4 ${
              item.level === 3 ? 'pl-6' : 'pl-3'
            } ${
              isActive
                ? 'border-brand-blue bg-blue-50/60 font-semibold text-slate-950 dark:border-blue-400 dark:bg-blue-500/10 dark:text-white'
                : 'border-transparent text-slate-500 hover:bg-slate-100/70 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white'
            }`}
          >
            {item.text}
          </a>
        </li>
        )
      })}
    </ul>
  )

  if (collapsible) {
    return (
      <details className="group border-b border-slate-200 dark:border-slate-700">
        <summary className="flex min-h-10 cursor-pointer list-none items-center justify-start gap-2 text-sm font-bold text-slate-950 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-blue [&::-webkit-details-marker]:hidden dark:text-white">
          <span className="-translate-y-1">本文目录</span>
          <span className="-translate-y-1 flex items-center gap-2">
            <span className="utility-type text-[10px] font-medium tracking-wide text-slate-500 dark:text-slate-400">
              {toc.length} 节
            </span>
            <ChevronDown className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180" aria-hidden />
          </span>
        </summary>
        <nav aria-label="本文目录" className="border-t border-slate-200 py-2 dark:border-slate-700">
          {items}
        </nav>
      </details>
    )
  }

  return (
    <nav aria-label="本文目录" className="border-t border-slate-200 pt-2 lg:border-t-0 dark:border-slate-700">
      <div className="mb-1.5 flex items-center gap-2 px-1">
        <h3 className="text-sm font-bold text-slate-950 dark:text-white">本文目录</h3>
        <span className="utility-type text-[10px] font-medium tracking-wide text-slate-500 dark:text-slate-400">
          {toc.length} 节
        </span>
      </div>
      {items}
    </nav>
  )
}

export default TableOfContents
