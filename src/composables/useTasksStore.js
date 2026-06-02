import { computed, ref } from 'vue'
import * as tasksApi from '@/api/tasks'
import { resolveTaskStatusFromForm, taskDueBucket, resolveDoneAfterChecklistToggle } from '@/lib/taskDueDate'

const tasks = ref([])
const loading = ref(false)

function parseDeadlineDate(deadline) {
  if (!deadline) return ''
  const iso = String(deadline).match(/(\d{4}-\d{2}-\d{2})/)
  return iso ? iso[1] : ''
}

// ─── Data fetch ────────────────────────────────────────────────────

async function fetchTasks() {
  loading.value = true
  try {
    const { data, error } = await tasksApi.fetchTasks()
    if (!error) tasks.value = data
    else console.error('[useTasksStore] fetchTasks:', error.message)
  } finally {
    loading.value = false
  }
}

async function loadTaskById(taskId) {
  if (!taskId) return { data: null, error: new Error('Missing task id') }
  const cached = getTaskById(taskId)
  if (cached) return { data: cached, error: null }

  const { data, error } = await tasksApi.fetchTaskById(taskId)
  if (!error && data) {
    const idx = tasks.value.findIndex((x) => x.id === data.id)
    if (idx >= 0) tasks.value[idx] = data
    else tasks.value.unshift(data)
  }
  return { data, error }
}

// ─── Read helpers ────────────────────────────────────────────────────

function getTaskById(id) {
  return tasks.value.find((x) => x.id === id) || null
}

function upsertTask(task) {
  if (!task?.id) return
  const idx = tasks.value.findIndex((x) => x.id === task.id)
  const next = [...tasks.value]
  if (idx >= 0) next[idx] = task
  else next.unshift(task)
  tasks.value = next
}

function patchTask(id, partial) {
  const target = getTaskById(id)
  if (!target) return
  upsertTask({ ...target, ...partial })
}

// ─── Writes (local first, then sync) ───────────────────────────────────

async function toggleTaskDone(id) {
  const target = getTaskById(id)
  if (!target) return { data: null, error: new Error('Task not found') }

  const prevDone = target.done
  const deadlineDate = parseDeadlineDate(target.deadline)
  const optimisticDone = !prevDone
  upsertTask({
    ...target,
    done: optimisticDone,
    status: optimisticDone ? 'completed' : resolveTaskStatusFromForm({ deadlineDate }),
    completedAt: optimisticDone ? new Date().toISOString() : '',
  })

  const { data, error } = await tasksApi.toggleTaskDone(id, prevDone)
  if (error) {
    upsertTask(target)
    return { data: null, error }
  }
  if (data) upsertTask(data)
  return { data, error: null }
}

async function toggleChecklist(taskId, checklistId) {
  const target = getTaskById(taskId)
  if (!target) return { data: null, error: new Error('Task not found') }

  const checklist = (target.checklist || []).map((item) =>
    item.id === checklistId ? { ...item, done: !item.done } : item
  )
  const { done: nextDone } = resolveDoneAfterChecklistToggle(checklist, !!target.done)
  const deadlineDate = parseDeadlineDate(target.deadline)
  upsertTask({
    ...target,
    checklist,
    done: nextDone,
    status: nextDone ? 'completed' : resolveTaskStatusFromForm({ deadlineDate }),
    completedAt: nextDone ? target.completedAt || new Date().toISOString() : '',
  })

  const { data, error } = await tasksApi.toggleChecklistItem(taskId, checklistId)
  if (error) {
    upsertTask(target)
    return { data: null, error }
  }
  if (data) upsertTask(data)
  return { data, error: null }
}

async function updateTask(taskId, payload) {
  const target = getTaskById(taskId)
  const deadline = payload.deadline?.trim() || target?.deadline || 'Anytime'
  const deadlineDate = parseDeadlineDate(deadline)
  const done = payload.done ?? target?.done ?? false
  const merged = {
    title: payload.title?.trim() || target?.title || 'Untitled Task',
    description: payload.description?.trim() ?? target?.description ?? '',
    deadline,
    subject: payload.subject?.trim() || target?.subject || 'General',
    priority: payload.priority || target?.priority || 'P3',
    status: resolveTaskStatusFromForm({ deadlineDate, done }),
    reminder: payload.reminder?.trim() || target?.reminder || 'None',
    done,
    checklist: payload.checklist ?? target?.checklist ?? [],
    completedAt: done ? payload.completedAt || target?.completedAt || new Date().toISOString() : null,
  }
  const { data, error } = await tasksApi.updateTask(taskId, merged)
  if (!error && data) upsertTask(data)
  else if (error) console.error('[useTasksStore] updateTask:', error.message)
  return { data, error }
}

async function addTask(payload) {
  const { data, error } = await tasksApi.createTask(payload)
  if (!error && data) {
    upsertTask(data)
    return { data, error: null }
  }
  if (error) console.error('[useTasksStore] addTask:', error.message)
  return { data: null, error: error || new Error('Could not create task') }
}

async function addTaskFromNotice({ noticeId, title, subject, deadline, description, noticeTitle }) {
  const existing = tasks.value.find((t) => t.sourceNoticeId === noticeId)
  if (existing) return existing

  const { data } = await addTask({
    title: title?.trim() || 'From notice',
    subject: subject?.trim() || 'General',
    deadline: deadline?.trim() ? `Due ${deadline.trim()}` : 'See notice',
    description: description?.trim() || '',
    priority: 'P2',
    relatedNotice: { id: noticeId, title: noticeTitle || title },
    sourceNoticeId: noticeId,
  })
  return data
}

async function archiveTask(id) {
  const { data, error } = await tasksApi.archiveTask(id)
  if (!error && data) upsertTask(data)
  return { data, error }
}

async function unarchiveTask(id) {
  const { data, error } = await tasksApi.unarchiveTask(id)
  if (!error && data) upsertTask(data)
  return { data, error }
}

async function deleteTask(id) {
  const { error } = await tasksApi.deleteTask(id)
  if (!error) {
    tasks.value = tasks.value.filter((x) => x.id !== id)
  }
  return { error }
}

// ─── Computed ────────────────────────────────────────────────────

const tasksCountRecent = computed(() =>
  tasks.value.filter((x) => !x.done && taskDueBucket(x) === 'recent').length
)

export function useTasksStore() {
  return {
    tasks,
    loading,
    tasksCountToday: tasksCountRecent,
    tasksCountRecent,
    fetchTasks,
    loadTaskById,
    getTaskById,
    patchTask,
    toggleTaskDone,
    toggleChecklist,
    updateTask,
    addTask,
    addTaskFromNotice,
    archiveTask,
    unarchiveTask,
    deleteTask,
  }
}
