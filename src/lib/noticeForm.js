import { resolveNoticeDeadlineIso } from '@/lib/noticeTaskDeadline'
import {
  normalizeChecklist,
  parseStoredStepDeadline,
  resolveDeadlineIsoFromSteps,
  sanitizeChecklistForSave,
} from '@/lib/checklist'
import {
  buildReminderString,
  computeReminderAtIso,
  emptyReminderFormFields,
  normalizeReminderRepeat,
  reminderFormFieldsFromStored,
} from '@/lib/reminderString'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function formatNoticeDeadlineLabel(value) {
  if (!value) return ''
  const [y, m, d] = value.split('-')
  if (!y) return value
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (Number.isNaN(date.getTime())) return value
  return `${WEEKDAYS[date.getDay()]} ${MONTHS[date.getMonth()]} ${date.getDate()}`
}

export function emptyNoticeEditorForm() {
  return {
    type: 'Homework',
    title: '',
    subject: '',
    deadlineDate: '',
    description: '',
    checklist: [],
    ...emptyReminderFormFields(),
  }
}

export function noticeToEditorForm(notice = {}) {
  return {
    type: notice.type || 'Homework',
    title: notice.title || '',
    subject: notice.subject || '',
    deadlineDate: resolveNoticeDeadlineIso(notice) || '',
    description: notice.description || '',
    checklist: normalizeChecklist(notice.checklist).map((x, idx) => ({
      id: x.id || `c-${idx}`,
      text: x.text || '',
      done: false,
      deadline: parseStoredStepDeadline(x.deadline) || '',
    })),
    ...reminderFormFieldsFromStored(notice.reminder),
  }
}

export function editorFormToNoticePayload(form) {
  const type = String(form.type || '').trim()
  const checklist = sanitizeChecklistForSave(form.checklist)
  const deadlineDate = resolveDeadlineIsoFromSteps(checklist, form.deadlineDate || '')
  return {
    type,
    title: String(form.title || '').trim(),
    subject: type === 'Homework' ? String(form.subject || '').trim() : '',
    deadline: deadlineDate ? formatNoticeDeadlineLabel(deadlineDate) : '',
    deadlineAt: deadlineDate || null,
    description: String(form.description || '').trim(),
    checklist,
    reminder: buildReminderString(form),
    reminderAt: computeReminderAtIso(form),
    reminderRepeat: form.reminderOn ? normalizeReminderRepeat(form.reminderRepeat) : 'none',
  }
}
