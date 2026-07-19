import { useEffect, useRef, useCallback, useState } from 'react'

export function useInfiniteScroll(
  callback: () => void,
  options?: { threshold?: number; rootMargin?: string }
) {
  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null)
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  const sentinelCallback = useCallback((node: HTMLDivElement | null) => {
    setSentinel(node)
  }, [])

  useEffect(() => {
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          callbackRef.current()
        }
      },
      {
        threshold: options?.threshold ?? 0,
        rootMargin: options?.rootMargin ?? '200px',
      }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [sentinel, options?.threshold, options?.rootMargin])

  return sentinelCallback
}
