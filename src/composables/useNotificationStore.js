import { computed, ref } from 'vue'
import * as notificationsApi from '@/api/notifications'

const notifications = ref([])
const loading = ref(false)

// ─── 数据获取 ────────────────────────────────────────────────────

async function fetchNotifications() {
  loading.value = true
  try {
    const { data, error } = await notificationsApi.fetchNotifications()
    if (!error) notifications.value = data
    else console.error('[useNotificationStore] fetchNotifications:', error.message)
  } finally {
    loading.value = false
  }
}

// ─── 读取工具 ────────────────────────────────────────────────────

function getNotificationById(id) {
  return notifications.value.find((n) => n.id === id) || null
}

// ─── 写操作 ──────────────────────────────────────────────────────

function _patchLocal(id, patch) {
  const idx = notifications.value.findIndex((n) => n.id === id)
  if (idx >= 0) Object.assign(notifications.value[idx], patch)
}

async function markRead(id) {
  _patchLocal(id, { read: true })
  await notificationsApi.markRead(id)
}

async function toggleImportant(id) {
  const item = getNotificationById(id)
  if (!item) return
  _patchLocal(id, { important: !item.important })
  await notificationsApi.toggleImportant(id, item.important)
}

async function toggleHidden(id) {
  const item = getNotificationById(id)
  if (!item) return
  _patchLocal(id, { hidden: !item.hidden })
  await notificationsApi.toggleHidden(id, item.hidden)
}

async function unhide(id) {
  _patchLocal(id, { hidden: false })
  await notificationsApi.toggleHidden(id, true)
}

async function setInPlanner(id, value) {
  _patchLocal(id, { inPlanner: value })
  await notificationsApi.setInPlanner(id, value)
}

async function removeNotification(id) {
  notifications.value = notifications.value.filter((n) => n.id !== id)
  await notificationsApi.deleteNotification(id)
}

async function addNotification(payload) {
  const { data, error } = await notificationsApi.createNotification(payload)
  if (!error && data) notifications.value.unshift(data)
  else if (error) console.error('[useNotificationStore] addNotification:', error.message)
}

// ─── 计算属性 ────────────────────────────────────────────────────

const visibleNotifications = computed(() => notifications.value.filter((n) => !n.hidden))
const hiddenNotifications = computed(() => notifications.value.filter((n) => n.hidden))

const pinnedNotifications = computed(() =>
  visibleNotifications.value
    .filter((n) => n.important)
    .sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1))
)

export function useNotificationStore() {
  return {
    notifications,
    loading,
    visibleNotifications,
    hiddenNotifications,
    pinnedNotifications,
    fetchNotifications,
    getNotificationById,
    markRead,
    toggleImportant,
    setInPlanner,
    toggleHidden,
    unhide,
    removeNotification,
    addNotification,
  }
}
