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
  return getEffectiveDueDateKey(task) || '9999-99-99'
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

export function parseChecklistItemDeadline(item) {
  if (!item?.deadline) return ''
  const raw = String(item.deadline).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw
  return parseDueDateKey(item.deadline)
}

/** First incomplete step deadline, else task-level deadline. */
export function getEffectiveDueDateKey(task) {
  const checklist = task?.checklist || []
  if (checklist.length) {
    for (const item of checklist) {
      if (!item?.done) {
        const stepKey = parseChecklistItemDeadline(item)
        if (stepKey) return stepKey
      }
    }
  }
  return parseDueDateKey(task?.deadline)
}

export function taskHasChecklistSteps(task) {
  return Array.isArray(task?.checklist) && task.checklist.length > 0
}

export function getNextIncompleteStep(task) {
  const checklist = task?.checklist || []
  return checklist.find((item) => !item?.done) || null
}

export function isChecklistFullyDone(checklist) {
  if (!Array.isArray(checklist) || !checklist.length) return false
  return checklist.every((item) => item?.done)
}

/** Sync task `done` when checklist steps are toggled. */
export function resolveDoneAfterChecklistToggle(checklist, wasDone) {
  if (!Array.isArray(checklist) || !checklist.length) {
    return { done: wasDone, changed: false }
  }
  const allDone = isChecklistFullyDone(checklist)
  if (allDone && !wasDone) return { done: true, changed: true }
  if (!allDone && wasDone) return { done: false, changed: true }
  return { done: wasDone, changed: false }
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

/** Home metrics + Today's focus — recent window and overdue */
export function isHomeTodayTask(task) {
  if (!task || task.done) return false
  const bucket = taskDueBucket(task)
  return bucket === 'recent' || bucket === 'overdue'
}

export function taskDueBucket(task) {
  if (task?.status === 'archived') return 'archived'
  if (task?.done || task?.status === 'completed') return 'completed'
  if (taskHasNoDueDate(task)) return 'no-deadline'

  const key = getEffectiveDueDateKey(task)
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

/** Map in-app bucket status to Postgres `tasks.status` check constraint values. */
export function toDbTaskStatus(status, { deadlineDate, done = false } = {}) {
  if (done) return 'completed'
  const appStatus = status || resolveTaskStatusFromForm({ deadlineDate, done: false })
  switch (appStatus) {
    case 'recent':
    case 'no-deadline':
    case 'today':
      return 'today'
    case 'upcoming':
      return 'upcoming'
    case 'overdue':
      return 'overdue'
    case 'completed':
      return 'completed'
    case 'archived':
      return 'archived'
    default:
      return 'today'
  }
}

export function resolveTaskStatusFromTask(task) {
  if (task?.done) return 'completed'
  const key = getEffectiveDueDateKey(task)
  if (key) return resolveActiveStatusFromDeadline(key)
  return 'recent'
}

export function taskHasDueDate(task) {
  return !!getEffectiveDueDateKey(task)
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

export function taskInDonePool(task) {
  if (!task) return false
  if (task.done) return true
  if (task.status === 'archived' || task.status === 'completed') return true
  const bucket = taskDueBucket(task)
  return bucket === 'completed' || bucket === 'archived'
}

/** Active tabs (All / Recent / …) — never show done or archived rows */
export function taskIsActiveForTab(task, filterId = '') {
  if (!task) return false
  if (task.status === 'archived') return false
  if (task.done) return false
  if (taskInDonePool(task)) return false
  if (!filterId) return true
  return taskDueBucket(task) === filterId
}

export function shouldRetainCompletedTask(task, referenceDate = new Date()) {
  if (task?.status === 'archived') return true
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
  if (task.status === 'archived' && task.done) {
    return { ...task, status: 'archived', done: true }
  }
  return {
    ...task,
    status: resolveTaskStatusFromTask(task),
    done: !!task.done,
  }
}

export function formatTaskDueChipLabel(task) {
  if (taskHasNoDueDate(task)) return 'Anytime'
  const key = getEffectiveDueDateKey(task)
  if (!key) return 'Anytime'

  const [y, m, d] = key.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  if (Number.isNaN(date.getTime())) return 'Anytime'

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const target = new Date(date)
  target.setHours(0, 0, 0, 0)
  const diff = Math.round((target - today) / 86400000)

  if (diff === 0) return 'Today'
  if (diff === 1) return 'Tomorrow'
  if (diff === -1) return 'Yesterday'
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`
}

export function taskDueChipClass(task) {
  if (taskHasNoDueDate(task)) return 'sub-slate'
  if (task?.done) return 'state-completed'
  const bucket = taskDueBucket(task)
  if (bucket === 'no-deadline') return 'sub-slate'
  if (bucket === 'completed') return 'state-completed'
  return `state-${bucket}`
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
    const key = getEffectiveDueDateKey(task)
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
  const done = tasks.filter((t) => {
    const bucket = taskDueBucket(t)
    return bucket === 'completed' || bucket === 'archived'
  })
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
