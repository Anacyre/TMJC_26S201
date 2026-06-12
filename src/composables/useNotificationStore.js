import { computed, ref } from 'vue'
import * as notificationsApi from '@/api/notifications'
import { useUserStore } from '@/composables/useUserStore'
import { countUnreadRelevantNotices, isNoticeRelevantToUser } from '@/lib/noticeRelevance'

const notifications = ref([])
const loading = ref(false)
let fetchGeneration = 0

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

function resolveCacheUserId(apiUserId = '') {
  if (apiUserId) return apiUserId
  try {
    return useUserStore().currentUser.value?.id || ''
  } catch {
    return ''
  }
}

/** One-time merge from legacy global cache into per-user key. */
function migrateLegacyHiddenCache(userId) {
  if (!userId) return
  try {
    const legacy = uni.getStorageSync(HIDDEN_CACHE_KEY)
    if (!Array.isArray(legacy) || !legacy.length) return
    const set = loadHiddenSet(userId)
    legacy.forEach((id) => set.add(id))
    saveHiddenSet(set, userId)
    uni.removeStorageSync(HIDDEN_CACHE_KEY)
  } catch {}
}

function invalidateNotificationFetches() {
  fetchGeneration += 1
}

/** Mirror server hidden flags into local cache (server is source of truth). */
function syncHiddenCacheFromServer(list, userId = '') {
  const cacheUserId = resolveCacheUserId(userId)
  migrateLegacyHiddenCache(cacheUserId)
  const hiddenSet = loadHiddenSet(cacheUserId)
  for (const n of list) {
    if (n.hidden) hiddenSet.add(n.id)
    else hiddenSet.delete(n.id)
  }
  saveHiddenSet(hiddenSet, cacheUserId)
  return list.map((n) => ({ ...n, hidden: !!n.hidden }))
}

// ─── Data fetch ────────────────────────────────────────────────────

async function fetchNotifications() {
  const gen = ++fetchGeneration
  loading.value = true
  try {
    const { data, error, userId } = await notificationsApi.fetchNotifications()
    if (gen !== fetchGeneration) return
    if (!error) {
      notifications.value = syncHiddenCacheFromServer(data, userId || '')
    } else {
      console.error('[useNotificationStore] fetchNotifications:', error.message)
    }
  } finally {
    if (gen === fetchGeneration) loading.value = false
  }
}

// ─── Read helpers ────────────────────────────────────────────────────

function getNotificationById(id) {
  return notifications.value.find((n) => n.id === id) || null
}

// ─── Writes ──────────────────────────────────────────────────────

function _patchLocal(id, patch) {
  const idx = notifications.value.findIndex((n) => n.id === id)
  if (idx < 0) return
  const next = [...notifications.value]
  next[idx] = { ...next[idx], ...patch }
  notifications.value = next
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
  invalidateNotificationFetches()
  _patchLocal(id, { hidden: nextHidden })
  const cacheUserId = resolveCacheUserId()
  _rememberHidden(id, nextHidden, cacheUserId)
  const { userId, error } = await notificationsApi.setHidden(id, nextHidden)
  _rememberHidden(id, nextHidden, resolveCacheUserId(userId))
  if (error) {
    invalidateNotificationFetches()
    _patchLocal(id, { hidden: wasHidden })
    _rememberHidden(id, wasHidden, cacheUserId)
    console.error('[useNotificationStore] toggleHidden:', error.message)
  }
}

async function setHidden(id, hidden) {
  const item = getNotificationById(id)
  const prevHidden = item?.hidden ?? false
  const nextHidden = !!hidden
  invalidateNotificationFetches()
  _patchLocal(id, { hidden: nextHidden })
  const cacheUserId = resolveCacheUserId()
  _rememberHidden(id, nextHidden, cacheUserId)
  const { userId, error } = await notificationsApi.setHidden(id, nextHidden)
  _rememberHidden(id, nextHidden, resolveCacheUserId(userId))
  if (error) {
    invalidateNotificationFetches()
    _patchLocal(id, { hidden: prevHidden })
    _rememberHidden(id, prevHidden, cacheUserId)
    console.error('[useNotificationStore] setHidden:', error.message)
    return { error }
  }
  return { error: null }
}

async function unhide(id) {
  return setHidden(id, false)
}

async function setInPlanner(id, value) {
  _patchLocal(id, { inPlanner: value })
  await notificationsApi.setInPlanner(id, value)
}

async function removeNotification(id) {
  const { error, userId } = await notificationsApi.deleteNotification(id)
  if (!error) {
    notifications.value = notifications.value.filter((n) => n.id !== id)
    _rememberHidden(id, false, userId || '')
    try {
      const { deleteTaskBySourceNotice } = await import('@/composables/useTasksStore')
      await deleteTaskBySourceNotice(id)
    } catch (e) {
      console.error('[useNotificationStore] removeNotification: task sync', e)
    }
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

const unreadRelevantCount = computed(() => {
  let userId = ''
  try {
    userId = useUserStore().currentUser.value?.id || ''
  } catch {}
  return countUnreadRelevantNotices(visibleNotifications.value, userId)
})

const pinnedNotifications = computed(() =>
  visibleNotifications.value
    .filter((n) => n.important)
    .sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1))
)

export { setInPlanner, unhide, setHidden, isNoticeRelevantToUser, countUnreadRelevantNotices }

export function useNotificationStore() {
  return {
    notifications,
    loading,
    visibleNotifications,
    hiddenNotifications,
    unreadRelevantCount,
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
