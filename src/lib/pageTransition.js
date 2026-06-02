/**
 * Unified page transition (0.2s from user click).
 * Stable shell: AppHeader, BottomNav, page .bg — stay static on each page.
 * Volatile: TabPageContent / PageContent — PPT-style slide + scale (no blur/mask).
 */

export const PAGE_MS = 200

/** Routes with bespoke motion — do not apply unified enter reveal */
export const PAGE_TRANSITION_SKIP = new Set([
  'pages/login/login',
  'pages/study/focus',
])

export function shouldSkipPageEnterTransition(route = '') {
  const key = String(route || '')
    .replace(/^\//, '')
    .replace(/^\?/, '')
  return PAGE_TRANSITION_SKIP.has(key)
}

export function getCurrentPageRoute() {
  try {
    const pages = getCurrentPages?.() || []
    const last = pages[pages.length - 1]
    return last?.route || ''
  } catch {
    return ''
  }
}
