import React from 'react'
import { Loader2 } from 'lucide-react'

interface InfiniteScrollLoaderProps {
  hasMore: boolean
  loading: boolean
  sentinelRef: (node: HTMLDivElement | null) => void
}

const InfiniteScrollLoader: React.FC<InfiniteScrollLoaderProps> = ({ hasMore, loading, sentinelRef }) => {
  if (!loading && !hasMore) {
    return <div ref={sentinelRef} className="h-px" aria-hidden />
  }

  return (
    <div
      ref={sentinelRef}
      className="flex min-h-16 items-center justify-center py-5"
      aria-live="polite"
      aria-busy={loading}
    >
      {loading ? (
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin text-brand-blue" aria-hidden />
          <span className="text-sm">正在加载</span>
        </div>
      ) : (
        <span className="sr-only">继续向下滚动以加载更多文章</span>
      )}
    </div>
  )
}

export default InfiniteScrollLoader
