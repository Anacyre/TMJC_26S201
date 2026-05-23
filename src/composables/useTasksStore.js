import { computed, ref } from 'vue'
import * as tasksApi from '@/api/tasks'

const tasks = ref([])
const loading = ref(false)

// ─── 数据获取 ────────────────────────────────────────────────────

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

// ─── 读取工具 ────────────────────────────────────────────────────

function getTaskById(id) {
  return tasks.value.find((x) => x.id === id) || null
}

function upsertTask(task) {
  if (!task?.id) return
  const idx = tasks.value.findIndex((x) => x.id === task.id)
  if (idx >= 0) tasks.value[idx] = task
  else tasks.value.unshift(task)
}

// ─── 写操作（先本地更新再同步）──────────────────────────────────

async function toggleTaskDone(id) {
  const target = getTaskById(id)
  if (!target) return { error: new Error('Task not found') }
  const { data, error } = await tasksApi.toggleTaskDone(id, target.done)
  if (!error && data) upsertTask(data)
  return { data, error }
}

async function toggleChecklist(taskId, checklistId) {
  const { data, error } = await tasksApi.toggleChecklistItem(taskId, checklistId)
  if (!error && data) upsertTask(data)
  return { data, error }
}

async function updateTask(taskId, payload) {
  const target = getTaskById(taskId)
  const merged = {
    title: payload.title?.trim() || target?.title || 'Untitled Task',
    description: payload.description?.trim() ?? target?.description ?? '',
    deadline: payload.deadline?.trim() || target?.deadline || 'Anytime',
    subject: payload.subject?.trim() || target?.subject || 'General',
    priority: payload.priority || target?.priority || 'P3',
    status: payload.status || target?.status || 'today',
    reminder: payload.reminder?.trim() || target?.reminder || 'None',
    done: payload.status === 'completed' ? true : payload.done ?? target?.done ?? false,
    checklist: payload.checklist ?? target?.checklist ?? [],
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
    return data
  }
  if (error) console.error('[useTasksStore] addTask:', error.message)
  return null
}

async function addTaskFromNotice({ noticeId, title, subject, deadline, description, noticeTitle }) {
  const existing = tasks.value.find((t) => t.sourceNoticeId === noticeId)
  if (existing) return existing

  return addTask({
    title: title?.trim() || 'From notice',
    subject: subject?.trim() || 'General',
    deadline: deadline?.trim() ? `Due ${deadline.trim()}` : 'See notice',
    description: description?.trim() || '',
    status: 'today',
    priority: 'P2',
    relatedNotice: { id: noticeId, title: noticeTitle || title },
    sourceNoticeId: noticeId,
  })
}

async function archiveTask(id) {
  const { data, error } = await tasksApi.archiveTask(id)
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

// ─── 计算属性 ────────────────────────────────────────────────────

const tasksCountToday = computed(() => tasks.value.filter((x) => x.status === 'today' && !x.done).length)

export function useTasksStore() {
  return {
    tasks,
    loading,
    tasksCountToday,
    fetchTasks,
    loadTaskById,
    getTaskById,
    toggleTaskDone,
    toggleChecklist,
    updateTask,
    addTask,
    addTaskFromNotice,
    archiveTask,
    deleteTask,
  }
}
