import { computed, ref, shallowRef } from 'vue'
import * as tasksApi from '@/api/tasks'
import { noticeTaskFieldsDiffer, taskPatchFromNotice } from '@/lib/noticeTaskSync'
import {
  resolveTaskStatusFromForm,
  taskDueBucket,
  resolveDoneAfterChecklistToggle,
} from '@/lib/taskDueDate'
import {
  noticeDeadlineSource,
  resolveNoticeDeadlineIso,
  taskDeadlineFromNotice,
} from '@/lib/noticeTaskDeadline'
import { setInPlanner } from '@/composables/useNotificationStore'

const tasks = shallowRef([])
const loading = ref(false)
let _lastFetchAt = 0
const FETCH_TTL_MS = 30_000

function parseDeadlineDate(deadline) {
  if (!deadline) return ''
  const iso = String(deadline).match(/(\d{4}-\d{2}-\d{2})/)
  return iso ? iso[1] : ''
}

// ─── Data fetch ────────────────────────────────────────────────────

async function fetchTasks({ force = false } = {}) {
  const now = Date.now()
  if (!force && tasks.value.length && now - _lastFetchAt < FETCH_TTL_MS) return
  loading.value = true
  try {
    const { data, error } = await tasksApi.fetchTasks()
    if (!error) {
      tasks.value = data
      _lastFetchAt = Date.now()
    } else console.error('[useTasksStore] fetchTasks:', error.message)
  } finally {
    loading.value = false
  }
}

export function resetTasksSession() {
  tasks.value = []
  _lastFetchAt = 0
}

async function loadTaskById(taskId) {
  if (!taskId) return { data: null, error: new Error('Missing task id') }
  const cached = getTaskById(taskId)
  if (cached) return { data: cached, error: null }

  const { data, error } = await tasksApi.fetchTaskById(taskId)
  if (!error && data) upsertTask(data)
  return { data, error }
}

// ─── Read helpers ────────────────────────────────────────────────────

const tasksById = computed(() => {
  const map = new Map()
  for (const t of tasks.value) map.set(t.id, t)
  return map
})

function getTaskById(id) {
  return tasksById.value.get(id) || null
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

async function addTaskFromNotice({
  notice: noticeInput,
  noticeId,
  title,
  subject,
  deadline,
  deadlineAt,
  description,
  noticeTitle,
}) {
  const notice = noticeDeadlineSource(
    noticeInput || { deadline, deadlineAt },
  )
  const id = noticeId || noticeInput?.id
  if (!id) return null

  const nextDeadline = taskDeadlineFromNotice(notice)
  const deadlineDate = resolveNoticeDeadlineIso(notice)
  const existing = tasks.value.find((t) => t.sourceNoticeId === id)

  if (existing) {
    const noticeRow = noticeInput || { deadline, deadlineAt, title, subject, description, id }
    if (noticeTaskFieldsDiffer(noticeRow, existing)) {
      const patch = taskPatchFromNotice(noticeRow, existing)
      await updateTask(existing.id, {
        ...patch,
        priority: existing.priority,
        reminder: existing.reminder,
        checklist: existing.checklist ?? [],
        done: existing.done,
      })
    }
    return getTaskById(existing.id) || existing
  }

  const { data } = await addTask({
    title: title?.trim() || noticeInput?.title?.trim() || 'From notice',
    subject: subject?.trim() || noticeInput?.subject?.trim() || 'General',
    deadline: nextDeadline,
    status: resolveTaskStatusFromForm({ deadlineDate }),
    description: description?.trim() || noticeInput?.description?.trim() || '',
    priority: 'P2',
    relatedNotice: { id, title: noticeTitle || title || noticeInput?.title },
    sourceNoticeId: id,
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

async function deleteTask(id, { syncNotice = true } = {}) {
  const task = getTaskById(id)
  const noticeId = task?.sourceNoticeId
  const { error } = await tasksApi.deleteTask(id)
  if (!error) {
    tasks.value = tasks.value.filter((x) => x.id !== id)
    if (syncNotice && noticeId) {
      try {
        await setInPlanner(noticeId, false)
      } catch (e) {
        console.error('[useTasksStore] deleteTask: notice sync', e)
      }
    }
  }
  return { error }
}

/** Remove planner task linked to a notice (e.g. when the notice is deleted). */
export async function deleteTaskBySourceNotice(noticeId) {
  const { error } = await tasksApi.deleteTasksBySourceNotice(noticeId)
  if (!error) {
    tasks.value = tasks.value.filter((t) => t.sourceNoticeId !== noticeId)
  }
  return { error }
}

/** Keep notice-sourced planner tasks aligned after a notice edit. */
export async function syncTasksFromNotice(notice) {
  if (!notice?.id) return
  const noticeId = notice.id
  let linked = tasks.value.filter((t) => t.sourceNoticeId === noticeId)
  if (!linked.length) {
    await fetchTasks({ force: true })
    linked = tasks.value.filter((t) => t.sourceNoticeId === noticeId)
  }
  for (const task of linked) {
    if (!noticeTaskFieldsDiffer(notice, task)) continue
    const patch = taskPatchFromNotice(notice, task)
    await updateTask(task.id, {
      ...patch,
      priority: task.priority,
      reminder: task.reminder,
      checklist: task.checklist ?? [],
      done: task.done,
    })
  }
}

// ─── Computed ────────────────────────────────────────────────────

const tasksCountRecent = computed(() => {
  let count = 0
  for (const x of tasks.value) {
    if (!x.done && taskDueBucket(x) === 'recent') count += 1
  }
  return count
})

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
