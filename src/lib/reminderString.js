export const REMINDER_REPEAT_OPTIONS = [
  { id: 'none', label: 'Never' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'yearly', label: 'Yearly' },
]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const REPEAT_IDS = new Set(['daily', 'weekly', 'monthly', 'yearly'])

export function emptyReminderFormFields() {
  return {
    reminderOn: false,
    reminderDate: '',
    reminderTime: '',
    reminderRepeat: 'none',
  }
}

export function formatReminderDateLabel(value) {
  if (!value) return ''
  const [y, m, d] = String(value).split('-')
  if (!y) return value
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (Number.isNaN(date.getTime())) return value
  return `${WEEKDAYS[date.getDay()]} ${MONTHS[date.getMonth()]} ${date.getDate()} · ${value}`
}

export function parseStoredReminder(raw) {
  if (!raw || raw === 'None') return { on: false, date: '', time: '', repeat: 'none' }
  const text = String(raw)
  const datePart = text.match(/(\d{4}-\d{2}-\d{2})/)
  const timePart = text.match(/(\d{2}:\d{2})/)
  const repeatMatch = text.match(/repeat:(\w+)/i)
  const repeat = repeatMatch ? repeatMatch[1].toLowerCase() : 'none'
  return {
    on: !!datePart || !!timePart,
    date: datePart ? datePart[1] : '',
    time: timePart ? timePart[1] : '',
    repeat: REPEAT_IDS.has(repeat) ? repeat : 'none',
  }
}

export function buildReminderString({
  reminderOn,
  reminderDate,
  reminderTime,
  reminderRepeat,
} = {}) {
  if (!reminderOn) return 'None'
  if (!reminderDate && !reminderTime) return 'None'
  const parts = []
  if (reminderDate) parts.push(formatReminderDateLabel(reminderDate))
  if (reminderTime) parts.push(`at ${reminderTime}`)
  if (reminderRepeat && reminderRepeat !== 'none') {
    const repeatLabel = REMINDER_REPEAT_OPTIONS.find((x) => x.id === reminderRepeat)?.label || reminderRepeat
    parts.push(`· repeat:${reminderRepeat}`)
    parts.push(`(${repeatLabel})`)
  }
  return parts.join(' ')
}

export function reminderFormFieldsFromStored(raw) {
  const parsed = parseStoredReminder(raw)
  return {
    reminderOn: parsed.on,
    reminderDate: parsed.date,
    reminderTime: parsed.time,
    reminderRepeat: parsed.repeat,
  }
}

export function normalizeReminderValue(raw) {
  const value = String(raw || '').trim()
  return value || 'None'
}

export function normalizeReminderRepeat(raw) {
  const value = String(raw || 'none').toLowerCase()
  return REPEAT_IDS.has(value) || value === 'none' ? value : 'none'
}

// Class timezone. Reminders are entered as local wall-clock time and stored as
// an absolute instant using this fixed offset so the server-side dispatcher
// fires at the intended moment regardless of the device timezone.
const CLASS_TZ_OFFSET = '+08:00'
const DEFAULT_REMINDER_TIME = '09:00'

/**
 * Build an absolute ISO timestamp (timestamptz) from the reminder form fields.
 * Returns null when the reminder is disabled or has no date.
 */
export function computeReminderAtIso({ reminderOn, reminderDate, reminderTime } = {}) {
  if (!reminderOn || !reminderDate) return null
  const time = /^\d{2}:\d{2}$/.test(String(reminderTime || '')) ? reminderTime : DEFAULT_REMINDER_TIME
  return `${reminderDate}T${time}:00${CLASS_TZ_OFFSET}`
}
