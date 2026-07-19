import React from 'react'

interface SkeletonCardProps {
  count?: number
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ count = 3 }) => {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">正在加载文章</span>
      <div aria-hidden="true">
        {Array.from({ length: count }).map((_, index) => (
          <div key={index} className="animate-pulse border-b border-slate-200/80 py-5 last:border-b-0 dark:border-slate-800">
            <div className="flex gap-5 sm:gap-8">
              <div className="min-w-0 flex-1">
                <div className="mb-3 flex gap-3">
                  <div className="h-3 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
                  <div className="h-3 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
                </div>
                <div className={`mb-3 h-5 bg-slate-200 dark:bg-slate-700 ${index % 2 === 0 ? 'w-3/4' : 'w-2/3'}`} />
                <div className="mb-2 h-3.5 w-full rounded-full bg-slate-100 dark:bg-slate-800" />
                <div className="mb-5 h-3.5 w-3/5 rounded-full bg-slate-100 dark:bg-slate-800" />
                <div className="flex items-center gap-5">
                  <div className="h-3 w-16 rounded-full bg-slate-100 dark:bg-slate-800" />
                  <div className="h-3 w-12 rounded-full bg-slate-100 dark:bg-slate-800" />
                  <div className="h-3 w-12 rounded-full bg-slate-100 dark:bg-slate-800" />
                </div>
              </div>
              <div className="hidden h-24 w-32 shrink-0 rounded-2xl bg-slate-200 dark:bg-slate-700 sm:block lg:h-28 lg:w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default SkeletonCard
