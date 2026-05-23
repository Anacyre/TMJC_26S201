import { TEXT_AREA_MAX_LENGTH } from '@/lib/textInput'

const DRAFT_KEY_PREFIX = 'notice_compose_draft_v1'
const NOTICE_TYPES = new Set(['Homework', 'General', 'VIA', 'Event'])

function storageKey(userId) {
  return `${DRAFT_KEY_PREFIX}:${userId || 'anon'}`
}

export function noticeDraftHasContent(draft) {
  if (!draft) return false
  return !!(
    String(draft.title || '').trim()
    || String(draft.description || '').trim()
    || String(draft.subject || '').trim()
    || String(draft.deadlineDate || '').trim()
  )
}

function normalizeDraft(raw) {
  if (!raw || typeof raw !== 'object') return null
  const type = NOTICE_TYPES.has(raw.type) ? raw.type : 'Homework'
  return {
    type,
    title: String(raw.title || ''),
    subject: type === 'Homework' ? String(raw.subject || '') : '',
    deadlineDate: String(raw.deadlineDate || ''),
    description: String(raw.description || '').slice(0, TEXT_AREA_MAX_LENGTH),
  }
}

export function loadNoticeDraft(userId) {
  try {
    const raw = uni.getStorageSync(storageKey(userId))
    const draft = normalizeDraft(raw)
    return noticeDraftHasContent(draft) ? draft : null
  } catch {
    return null
  }
}

export function saveNoticeDraft(userId, draft) {
  if (!userId) return
  if (!noticeDraftHasContent(draft)) {
    clearNoticeDraft(userId)
    return
  }
  try {
    uni.setStorageSync(storageKey(userId), {
      ...normalizeDraft(draft),
      savedAt: Date.now(),
    })
  } catch {
    /* ignore quota errors */
  }
}

export function clearNoticeDraft(userId) {
  if (!userId) return
  try {
    uni.removeStorageSync(storageKey(userId))
  } catch {
    /* ignore */
  }
}
