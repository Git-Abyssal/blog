const ArticleLoadingState = () => (
  <div
    className="flex h-96 items-center justify-center"
    role="status"
    aria-label="正在加载文章"
    aria-busy="true"
  >
    <div className="flex flex-col items-center gap-2">
      <div
        className="h-7 w-7 animate-spin rounded-full border-2 border-slate-300 border-t-brand-blue dark:border-slate-700 dark:border-t-blue-300"
        aria-hidden
      />
      <span className="text-sm text-slate-600 dark:text-slate-400">正在加载文章…</span>
    </div>
  </div>
)

export default ArticleLoadingState
