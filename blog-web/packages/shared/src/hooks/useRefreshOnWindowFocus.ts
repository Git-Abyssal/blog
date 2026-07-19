import { useEffect, useRef } from 'react'

const FOCUS_EVENT_DEDUPLICATION_MS = 250

export function useRefreshOnWindowFocus(
  refresh: () => void | Promise<unknown>,
  enabled = true,
) {
  const refreshRef = useRef(refresh)
  const lastRefreshAtRef = useRef<number | null>(null)

  useEffect(() => {
    refreshRef.current = refresh
  }, [refresh])

  useEffect(() => {
    if (!enabled) return

    const refreshWhenVisible = () => {
      if (document.visibilityState === 'hidden') return

      const now = Date.now()
      if (
        lastRefreshAtRef.current !== null
        && now - lastRefreshAtRef.current < FOCUS_EVENT_DEDUPLICATION_MS
      ) {
        return
      }

      lastRefreshAtRef.current = now
      void refreshRef.current()
    }

    window.addEventListener('focus', refreshWhenVisible)
    document.addEventListener('visibilitychange', refreshWhenVisible)

    return () => {
      window.removeEventListener('focus', refreshWhenVisible)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
    }
  }, [enabled])
}
