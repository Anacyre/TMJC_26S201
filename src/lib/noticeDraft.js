import { TEXT_AREA_MAX_LENGTH } from '@/lib/textInput'
import { normalizeChecklist, parseStoredStepDeadline, sanitizeChecklistForSave } from '@/lib/checklist'
import { emptyReminderFormFields, reminderFormFieldsFromStored } from '@/lib/reminderString'

const DRAFT_KEY_PREFIX = 'notice_compose_draft_v1'
const NOTICE_TYPES = new Set(['Homework', 'General', 'VIA', 'Event'])
const REPEAT_IDS = new Set(['none', 'daily', 'weekly', 'monthly', 'yearly'])

function storageKey(userId) {
  return `${DRAFT_KEY_PREFIX}:${userId || 'anon'}`
}

export function noticeDraftHasContent(draft) {
  if (!draft) return false
  const hasSteps = sanitizeChecklistForSave(draft.checklist).length > 0
  return !!(
    String(draft.title || '').trim()
    || String(draft.description || '').trim()
    || String(draft.subject || '').trim()
    || String(draft.deadlineDate || '').trim()
    || draft.reminderOn
    || String(draft.reminderDate || '').trim()
    || String(draft.reminderTime || '').trim()
    || hasSteps
  )
}

function normalizeChecklistDraft(raw) {
  return normalizeChecklist(raw).map((x, idx) => ({
    id: x.id || `c-${idx}`,
    text: String(x.text || ''),
    done: false,
    deadline: parseStoredStepDeadline(x.deadline) || '',
  }))
}

function normalizeReminderDraft(raw) {
  if (raw.reminderOn != null || raw.reminderDate || raw.reminderTime || raw.reminderRepeat) {
    const repeat = String(raw.reminderRepeat || 'none').toLowerCase()
    return {
      reminderOn: !!raw.reminderOn,
      reminderDate: String(raw.reminderDate || ''),
      reminderTime: String(raw.reminderTime || ''),
      reminderRepeat: REPEAT_IDS.has(repeat) ? repeat : 'none',
    }
  }
  if (raw.reminder) return reminderFormFieldsFromStored(raw.reminder)
  return emptyReminderFormFields()
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
    checklist: normalizeChecklistDraft(raw.checklist),
    ...normalizeReminderDraft(raw),
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
