import { PAGE_MS } from '@/lib/pageTransition'

let pendingTransition = null

/**
 * Called at navigation click time — consumed on next page onShow.
 * @param {{ kind?: string, direction?: string, from?: string, to?: string, clickedAt?: number }} meta
 */
export function writePageTransition(meta = {}) {
  pendingTransition = {
    ...meta,
    clickedAt: meta.clickedAt ?? Date.now(),
  }
}

export function readPageTransition() {
  const meta = pendingTransition
  pendingTransition = null
  return meta
}

/** Remaining ms so animation ends ~PAGE_MS after the original click */
export function getTransitionDurationMs(clickedAt) {
  if (!clickedAt) return PAGE_MS
  const elapsed = Date.now() - clickedAt
  return Math.max(16, Math.min(PAGE_MS, PAGE_MS - elapsed))
}
