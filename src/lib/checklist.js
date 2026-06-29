import { parseDueDateKey } from '@/lib/taskDueDate'

export function normalizeChecklist(raw) {
  if (Array.isArray(raw)) return raw
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export function sanitizeChecklistForSave(items) {
  return normalizeChecklist(items)
    .filter((x) => String(x?.text || '').trim())
    .map((x) => ({
      id: x.id || `step-${Date.now().toString(36)}`,
      text: String(x.text).trim(),
      done: !!x.done,
      deadline: x.deadline || '',
    }))
}

export function parseStoredStepDeadline(raw) {
  if (!raw) return ''
  const iso = String(raw).match(/(\d{4}-\d{2}-\d{2})/)
  return iso ? iso[1] : ''
}

/** Preserve task step completion when syncing checklist from a notice. */
export function mergeNoticeChecklistIntoTask(noticeChecklist, taskChecklist) {
  const noticeItems = sanitizeChecklistForSave(noticeChecklist).map((item) => ({
    ...item,
    done: false,
  }))
  if (!noticeItems.length) return normalizeChecklist(taskChecklist)

  const doneById = new Map(normalizeChecklist(taskChecklist).map((c) => [c.id, c.done]))
  return noticeItems.map((item) => ({
    ...item,
    done: !!doneById.get(item.id),
  }))
}

export function noticeChecklistContentKey(checklist) {
  return sanitizeChecklistForSave(checklist)
    .map((item) => `${item.id}|${item.text}|${item.deadline || ''}`)
    .join('\n')
}

export function noticeChecklistsDiffer(a, b) {
  return noticeChecklistContentKey(a) !== noticeChecklistContentKey(b)
}

export function resolveDeadlineIsoFromSteps(checklist, taskLevelDate = '') {
  if (taskLevelDate) return taskLevelDate
  const pending = sanitizeChecklistForSave(checklist).filter((x) => !x.done && x.deadline)
  if (!pending.length) return ''
  return [...pending.map((x) => parseDueDateKey(x.deadline) || x.deadline)].filter(Boolean).sort()[0]
}
