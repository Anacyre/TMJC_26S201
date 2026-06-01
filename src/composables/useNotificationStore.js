import { computed, ref } from 'vue'
import * as notificationsApi from '@/api/notifications'

const notifications = ref([])
const loading = ref(false)

const HIDDEN_CACHE_KEY = 'notice_hidden_cache_v1'

function hiddenCacheKey(userId) {
  return userId ? `${HIDDEN_CACHE_KEY}_${userId}` : HIDDEN_CACHE_KEY
}

function loadHiddenSet(userId = '') {
  try {
    const raw = uni.getStorageSync(hiddenCacheKey(userId))
    return new Set(Array.isArray(raw) ? raw : [])
  } catch {
    return new Set()
  }
}

function saveHiddenSet(set, userId = '') {
  try {
    uni.setStorageSync(hiddenCacheKey(userId), [...set])
  } catch {}
}

function mergeHiddenFromCache(list, userId = '') {
  const hiddenSet = loadHiddenSet(userId)
  const merged = list.map((n) => ({
    ...n,
    hidden: !!n.hidden || hiddenSet.has(n.id),
  }))

  for (const n of merged) {
    if (n.hidden) hiddenSet.add(n.id)
    else hiddenSet.delete(n.id)
  }
  saveHiddenSet(hiddenSet, userId)
  return merged
}

// ─── Data fetch ────────────────────────────────────────────────────

async function fetchNotifications() {
  loading.value = true
  try {
    const { data, error, userId } = await notificationsApi.fetchNotifications()
    if (!error) {
      notifications.value = mergeHiddenFromCache(data, userId || '')
    } else {
      console.error('[useNotificationStore] fetchNotifications:', error.message)
    }
  } finally {
    loading.value = false
  }
}

// ─── Read helpers ────────────────────────────────────────────────────

function getNotificationById(id) {
  return notifications.value.find((n) => n.id === id) || null
}

// ─── Writes ──────────────────────────────────────────────────────

function _patchLocal(id, patch) {
  const idx = notifications.value.findIndex((n) => n.id === id)
  if (idx >= 0) Object.assign(notifications.value[idx], patch)
}

function _rememberHidden(id, hidden, userId = '') {
  const hiddenSet = loadHiddenSet(userId)
  if (hidden) hiddenSet.add(id)
  else hiddenSet.delete(id)
  saveHiddenSet(hiddenSet, userId)
}

async function markRead(id) {
  _patchLocal(id, { read: true })
  await notificationsApi.markRead(id)
}

async function toggleImportant(id) {
  const item = getNotificationById(id)
  if (!item) return
  const wasImportant = item.important
  _patchLocal(id, { important: !wasImportant })
  await notificationsApi.toggleImportant(id, wasImportant)
}

async function toggleHidden(id) {
  const item = getNotificationById(id)
  if (!item) return
  const wasHidden = item.hidden
  const nextHidden = !wasHidden
  _patchLocal(id, { hidden: nextHidden })
  const { userId } = await notificationsApi.setHidden(id, nextHidden)
  _rememberHidden(id, nextHidden, userId || '')
}

async function setHidden(id, hidden) {
  _patchLocal(id, { hidden: !!hidden })
  const { userId } = await notificationsApi.setHidden(id, hidden)
  _rememberHidden(id, !!hidden, userId || '')
}

async function unhide(id) {
  await setHidden(id, false)
}

async function setInPlanner(id, value) {
  _patchLocal(id, { inPlanner: value })
  await notificationsApi.setInPlanner(id, value)
}

async function removeNotification(id) {
  const { error } = await notificationsApi.deleteNotification(id)
  if (!error) {
    notifications.value = notifications.value.filter((n) => n.id !== id)
  }
  return { error }
}

async function addNotification(payload) {
  const { data, error } = await notificationsApi.createNotification(payload)
  if (!error && data) notifications.value.unshift(data)
  else if (error) console.error('[useNotificationStore] addNotification:', error.message)
  return { data, error }
}

// ─── Computed ────────────────────────────────────────────────────

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
    setHidden,
    unhide,
    removeNotification,
    addNotification,
  }
}
