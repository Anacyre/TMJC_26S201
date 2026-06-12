import { UNDO_COMMIT_MS } from '@/composables/useUndo'

/** Human-readable age for an undo queue entry */
export function undoEntryAgeLabel(entry, now = Date.now()) {
  const created = entry.createdAt ?? (entry.expiresAt ? entry.expiresAt - UNDO_COMMIT_MS : now)
  const sec = Math.max(0, Math.floor((now - created) / 1000))
  if (sec < 12) return 'Just now'
  if (sec < 60) return `${sec}s ago`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  return `${Math.floor(min / 60)}h ago`
}

/** Minutes left before the action commits */
export function undoEntryExpiresLabel(entry, now = Date.now()) {
  if (!entry.expiresAt) return ''
  const sec = Math.max(0, Math.floor((entry.expiresAt - now) / 1000))
  if (sec < 60) return `${sec}s left`
  const min = Math.ceil(sec / 60)
  return `${min}m left`
}
