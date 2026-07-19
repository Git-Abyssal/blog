try {
  if (globalThis.localStorage.getItem('theme') === 'dark') {
    globalThis.document.documentElement.classList.add('dark')
  }
} catch {
  // Local storage can be unavailable in restricted browsing contexts.
}
