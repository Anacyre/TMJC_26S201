const NO_DUE_MARKERS = new Set(['', 'anytime', 'see notice'])

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const PRIORITY_ORDER = { P1: 0, P2: 1, P3: 2 }
const PRIORITY_LABELS = { P1: 'P1 · High', P2: 'P2 · Medium', P3: 'P3 · Low' }

export const RECENT_WINDOW_DAYS = 14
export const COMPLETED_RETENTION_DAYS = 14

/** Lower rank = higher priority (P1 first). */
export function priorityRank(task) {
  const key = String(task?.priority || 'P3').trim().toUpperCase()
  if (Object.prototype.hasOwnProperty.call(PRIORITY_ORDER, key)) {
    return PRIORITY_ORDER[key]
  }
  const match = key.match(/^P(\d+)$/)
  if (match) return Math.max(0, Number(match[1]) - 1)
  return 9
}

export function sortTasksByPriority(a, b) {
  const diff = priorityRank(a) - priorityRank(b)
  if (diff !== 0) return diff
  return String(a?.title || '').localeCompare(String(b?.title || ''))
}

export function dueDateSortKey(task) {
  return parseDueDateKey(task?.deadline) || '9999-99-99'
}

export function sortTasksByDueDate(a, b) {
  const diff = dueDateSortKey(a).localeCompare(dueDateSortKey(b))
  if (diff !== 0) return diff
  return sortTasksByPriority(a, b)
}

/** Same due-date group — highest priority first. */
export function sortTasksInDueDateGroup(tasks) {
  return [...tasks].sort(sortTasksByPriority)
}

/** Same priority group — earliest due date first. */
export function sortTasksInPriorityGroup(tasks) {
  return [...tasks].sort(sortTasksByDueDate)
}

export function parseDueDateKey(deadline) {
  if (!deadline) return ''
  const raw = String(deadline).trim()
  if (NO_DUE_MARKERS.has(raw.toLowerCase())) return ''
  const iso = raw.match(/(\d{4}-\d{2}-\d{2})/)
  return iso ? iso[1] : ''
}

export function formatDateKey(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayDateKey() {
  return formatDateKey(new Date())
}

export function addDaysToDateKey(isoKey, days) {
  const [y, m, d] = isoKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + days)
  return formatDateKey(date)
}

export function recentEndDateKey() {
  return addDaysToDateKey(todayDateKey(), RECENT_WINDOW_DAYS)
}

export function normalizeTaskStatus(status) {
  if (status === 'today') return 'recent'
  return status || 'recent'
}

export function taskIsOverdue(task) {
  if (!task || task.done) return false
  return taskDueBucket(task) === 'overdue'
}

export function taskDueBucket(task) {
  if (task?.done || task?.status === 'completed') return 'completed'
  if (taskHasNoDueDate(task)) return 'no-deadline'

  const key = parseDueDateKey(task.deadline)
  if (key) {
    const today = todayDateKey()
    const recentEnd = recentEndDateKey()
    if (key < today) return 'overdue'
    if (key <= recentEnd) return 'recent'
    return 'upcoming'
  }

  const status = normalizeTaskStatus(task.status)
  if (status === 'overdue') return 'overdue'
  if (status === 'upcoming') return 'upcoming'
  if (status === 'no-deadline') return 'no-deadline'
  return 'recent'
}

export function taskDisplayStatus(task) {
  if (task?.done) return 'completed'
  return taskDueBucket(task)
}

export function taskBucketLabel(bucket) {
  const labels = {
    recent: 'Recent',
    upcoming: 'Upcoming',
    overdue: 'Overdue',
    completed: 'Done',
    'no-deadline': 'No deadline',
  }
  return labels[bucket] || bucket
}

export function resolveActiveStatusFromDeadline(deadlineDate) {
  if (!deadlineDate) return 'recent'
  const today = todayDateKey()
  const recentEnd = recentEndDateKey()
  if (deadlineDate < today) return 'overdue'
  if (deadlineDate <= recentEnd) return 'recent'
  return 'upcoming'
}

export function resolveTaskStatusFromForm({ deadlineDate, done = false }) {
  if (done) return 'completed'
  return resolveActiveStatusFromDeadline(deadlineDate)
}

export function resolveTaskStatusFromTask(task) {
  if (task?.done) return 'completed'
  const key = parseDueDateKey(task?.deadline)
  if (key) return resolveActiveStatusFromDeadline(key)
  return 'recent'
}

export function taskHasDueDate(task) {
  return !!parseDueDateKey(task?.deadline)
}

export function taskHasNoDueDate(task) {
  return !taskHasDueDate(task)
}

export function taskCompletedAtMs(task) {
  const raw = task?.completedAt || task?.updatedAt || task?.createdAt
  if (!raw) return 0
  const ms = new Date(raw).getTime()
  return Number.isNaN(ms) ? 0 : ms
}

export function shouldRetainCompletedTask(task, referenceDate = new Date()) {
  if (!task?.done && task?.status !== 'completed') return true
  const completedAt = taskCompletedAtMs(task)
  if (!completedAt) return true
  const cutoff = referenceDate.getTime() - COMPLETED_RETENTION_DAYS * 86400000
  return completedAt >= cutoff
}

export function purgeStaleCompletedTasks(tasks, referenceDate = new Date()) {
  return tasks.filter((task) => shouldRetainCompletedTask(task, referenceDate))
}

export function enrichTask(task) {
  if (!task) return task
  return {
    ...task,
    status: resolveTaskStatusFromTask(task),
  }
}

export function formatDueSectionLabel(isoKey) {
  const [y, m, d] = isoKey.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (Number.isNaN(date.getTime())) return isoKey

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target - today) / 86400000)
  const base = `${WEEKDAYS[date.getDay()]} ${MONTHS[date.getMonth()]} ${date.getDate()}`

  if (diff === 0) return `Today · ${base}`
  if (diff === 1) return `Tomorrow · ${base}`
  if (diff === -1) return `Yesterday · ${base}`
  return base
}

export function groupTasksByDueDate(tasks, { undatedLabel = '' } = {}) {
  const groups = new Map()
  const undated = []

  for (const task of tasks) {
    const key = parseDueDateKey(task.deadline)
    if (!key) {
      undated.push(task)
      continue
    }
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(task)
  }

  const sections = [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, items]) => ({
      key,
      label: formatDueSectionLabel(key),
      tasks: sortTasksInDueDateGroup(items),
    }))

  if (undated.length && undatedLabel) {
    sections.push({
      key: 'undated-batch',
      label: undatedLabel,
      tasks: sortTasksInDueDateGroup(undated),
    })
  }

  return sections
}

export function groupTasksByPriority(tasks) {
  const order = ['P1', 'P2', 'P3']
  const groups = new Map()

  for (const task of tasks) {
    const raw = String(task.priority || 'P3').trim().toUpperCase()
    const key = order.includes(raw) ? raw : 'P3'
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key).push(task)
  }

  return order
    .filter((key) => groups.has(key))
    .map((key) => ({
      key: `priority-${key}`,
      label: PRIORITY_LABELS[key] || key,
      tasks: sortTasksInPriorityGroup(groups.get(key)),
    }))
}

export function buildTaskListSectionsByDate(tasks) {
  const undated = tasks.filter((t) => taskDueBucket(t) === 'no-deadline')
  const done = tasks.filter((t) => taskDueBucket(t) === 'completed')
  const overdueItems = tasks.filter((t) => taskDueBucket(t) === 'overdue')
  const recentItems = tasks.filter((t) => taskDueBucket(t) === 'recent')
  const upcomingItems = tasks.filter((t) => taskDueBucket(t) === 'upcoming')

  const sections = []
  if (overdueItems.length) sections.push(...groupTasksByDueDate(overdueItems).reverse())
  if (recentItems.length) sections.push(...groupTasksByDueDate(recentItems, { undatedLabel: 'Recent' }))
  if (upcomingItems.length) sections.push(...groupTasksByDueDate(upcomingItems, { undatedLabel: 'Upcoming' }))
  if (undated.length) {
    sections.push({
      key: 'no-deadline',
      label: 'No deadline',
      tasks: sortTasksInDueDateGroup(undated),
    })
  }
  if (done.length) {
    sections.push({
      key: 'completed',
      label: 'Done',
      tasks: sortTasksInDueDateGroup(done),
    })
  }
  return sections
}

export function buildTaskSections(tasks, sortMode = 'due-date') {
  if (!tasks.length) return []
  if (sortMode === 'priority') return groupTasksByPriority(tasks)
  return buildTaskListSectionsByDate(tasks)
}

/** @deprecated use buildTaskListSectionsByDate */
export function buildTaskListSections(tasks) {
  return buildTaskListSectionsByDate(tasks)
}
