import { normalizeChecklist } from '@/lib/checklist'
import { getEffectiveDueDateKey, parseDueDateKey } from '@/lib/taskDueDate'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** ISO date key → label used in task `deadline` strings (matches TaskEditorSheet). */
export function formatDueDateLabel(isoKey) {
  if (!isoKey) return ''
  const [y, m, d] = isoKey.split('-')
  if (!y) return isoKey
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (Number.isNaN(date.getTime())) return isoKey
  return `${WEEKDAYS[date.getDay()]} ${MONTHS[date.getMonth()]} ${date.getDate()} · ${isoKey}`
}

/** Resolve YYYY-MM-DD from notice `deadlineAt`, step deadlines, or embedded ISO in `deadline`. */
export function resolveNoticeDeadlineIso(notice) {
  const at = String(notice?.deadlineAt || notice?.deadline_at || '').trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(at)) return at

  const checklist = normalizeChecklist(notice?.checklist)
  if (checklist.length) {
    const fromSteps = getEffectiveDueDateKey({ checklist, deadline: '' })
    if (fromSteps) return fromSteps
  }

  return parseDueDateKey(notice?.deadline)
}

/** Build task storage deadline when adding a notice to the planner. */
export function taskDeadlineFromNotice(notice) {
  const iso = resolveNoticeDeadlineIso(notice)
  if (iso) return `Due ${formatDueDateLabel(iso)}`
  const raw = String(notice?.deadline || '').trim()
  if (!raw) return 'See notice'
  if (/^due\s/i.test(raw)) return raw
  return `Due ${raw}`
}

/** Normalize notice fields for deadline sync (store row or planner payload). */
export function noticeDeadlineSource(notice) {
  if (!notice) return { deadline: '', deadlineAt: '', checklist: [] }
  return {
    deadline: notice.deadline ?? '',
    deadlineAt: notice.deadlineAt ?? notice.deadline_at ?? '',
    checklist: normalizeChecklist(notice.checklist),
  }
}
