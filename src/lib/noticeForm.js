import { resolveNoticeDeadlineIso } from '@/lib/noticeTaskDeadline'

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
  }
}

export function noticeToEditorForm(notice = {}) {
  return {
    type: notice.type || 'Homework',
    title: notice.title || '',
    subject: notice.subject || '',
    deadlineDate: resolveNoticeDeadlineIso(notice) || '',
    description: notice.description || '',
  }
}

export function editorFormToNoticePayload(form) {
  const type = String(form.type || '').trim()
  return {
    type,
    title: String(form.title || '').trim(),
    subject: type === 'Homework' ? String(form.subject || '').trim() : '',
    deadline: formatNoticeDeadlineLabel(form.deadlineDate),
    deadlineAt: form.deadlineDate || null,
    description: String(form.description || '').trim(),
  }
}
