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

// ─── 读取工具 ────────────────────────────────────────────────────

function getTaskById(id) {
  return tasks.value.find((x) => x.id === id) || null
}

// ─── 写操作（先本地更新再同步）──────────────────────────────────

async function toggleTaskDone(id) {
  const target = getTaskById(id)
  if (!target) return
  const { data, error } = await tasksApi.toggleTaskDone(id, target.done)
  if (!error && data) {
    const idx = tasks.value.findIndex((x) => x.id === id)
    if (idx >= 0) tasks.value[idx] = data
  }
}

async function toggleChecklist(taskId, checklistId) {
  const { data, error } = await tasksApi.toggleChecklistItem(taskId, checklistId)
  if (!error && data) {
    const idx = tasks.value.findIndex((x) => x.id === taskId)
    if (idx >= 0) tasks.value[idx] = data
  }
}

async function updateTask(taskId, payload) {
  const target = getTaskById(taskId)
  if (!target) return
  const merged = {
    title: payload.title?.trim() || target.title,
    description: payload.description?.trim() ?? '',
    deadline: payload.deadline?.trim() || 'Anytime',
    subject: payload.subject?.trim() || 'General',
    priority: payload.priority || 'P3',
    status: payload.status || 'upcoming',
    reminder: payload.reminder?.trim() || 'None',
    done: payload.status === 'completed' ? true : !!payload.done,
    checklist: payload.checklist || target.checklist,
  }
  const { data, error } = await tasksApi.updateTask(taskId, merged)
  if (!error && data) {
    const idx = tasks.value.findIndex((x) => x.id === taskId)
    if (idx >= 0) tasks.value[idx] = data
  }
}

async function addTask(payload) {
  const { data, error } = await tasksApi.createTask(payload)
  if (!error && data) {
    tasks.value.unshift(data)
    return data
  }
  if (error) console.error('[useTasksStore] addTask:', error.message)
  return null
}

async function addTaskFromNotice({ noticeId, title, subject, deadline, description, noticeTitle }) {
  // 幂等：同一通知不重复创建
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

async function deleteTask(id) {
  const { error } = await tasksApi.deleteTask(id)
  if (!error) {
    tasks.value = tasks.value.filter((x) => x.id !== id)
  }
}

// ─── 计算属性 ────────────────────────────────────────────────────

const tasksCountToday = computed(() => tasks.value.filter((x) => x.status === 'today' && !x.done).length)

export function useTasksStore() {
  return {
    tasks,
    loading,
    tasksCountToday,
    fetchTasks,
    getTaskById,
    toggleTaskDone,
    toggleChecklist,
    updateTask,
    addTask,
    addTaskFromNotice,
    deleteTask,
  }
}
