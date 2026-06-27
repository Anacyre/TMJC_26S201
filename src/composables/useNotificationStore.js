import { computed, ref, shallowRef } from 'vue'
import * as notificationsApi from '@/api/notifications'
import { currentUser } from '@/composables/useUserStore'
import { communities } from '@/composables/useCommunityStore'
import { adminModeEnabled } from '@/composables/adminModeState'
import { isAdminMember } from '@/lib/classMembers'
import { noticeMatchesCommunity } from '@/lib/communitySubjectLinks'
import { countUnreadRelevantNotices, isNoticeRelevantToUser } from '@/lib/noticeRelevance'

const notifications = shallowRef([])
const loading = ref(false)
let fetchGeneration = 0
let _lastFetchAt = 0
const FETCH_TTL_MS = 30_000

const HIDDEN_CACHE_KEY = 'notice_hidden_cache_v1'

let _sessionHiddenUserId = ''
let _sessionHiddenSet = null

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

function getHiddenSet(userId = '') {
  const cacheUserId = resolveCacheUserId(userId)
  if (_sessionHiddenSet && _sessionHiddenUserId === cacheUserId) return _sessionHiddenSet
  migrateLegacyHiddenCache(cacheUserId)
  _sessionHiddenSet = loadHiddenSet(cacheUserId)
  _sessionHiddenUserId = cacheUserId
  return _sessionHiddenSet
}

function invalidateHiddenSessionCache() {
  _sessionHiddenSet = null
  _sessionHiddenUserId = ''
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
  _lastFetchAt = 0
  invalidateHiddenSessionCache()
}

/** Mirror server hidden flags into local cache (server is source of truth). */
function syncHiddenCacheFromServer(list, userId = '') {
  const cacheUserId = resolveCacheUserId(userId)
  const hiddenSet = getHiddenSet(cacheUserId)
  let changed = false
  for (const n of list) {
    if (n.hidden) {
      if (!hiddenSet.has(n.id)) {
        hiddenSet.add(n.id)
        changed = true
      }
    } else if (hiddenSet.has(n.id)) {
      hiddenSet.delete(n.id)
      changed = true
    }
  }
  if (changed) saveHiddenSet(hiddenSet, cacheUserId)
  return list.map((n) => ({ ...n, hidden: !!n.hidden }))
}

// ─── Data fetch ────────────────────────────────────────────────────

async function fetchNotifications({ force = false } = {}) {
  const now = Date.now()
  if (!force && notifications.value.length && now - _lastFetchAt < FETCH_TTL_MS) return
  const gen = ++fetchGeneration
  loading.value = true
  try {
    const { data, error, userId } = await notificationsApi.fetchNotifications()
    if (gen !== fetchGeneration) return
    if (!error) {
      notifications.value = syncHiddenCacheFromServer(data, userId || '')
      _lastFetchAt = Date.now()
    } else {
      console.error('[useNotificationStore] fetchNotifications:', error.message)
    }
  } finally {
    if (gen === fetchGeneration) loading.value = false
  }
}

// ─── Read helpers ────────────────────────────────────────────────────

function getNotificationById(id) {
  return notificationsById.value.get(id) || null
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
  const cacheUserId = resolveCacheUserId(userId)
  const hiddenSet = getHiddenSet(cacheUserId)
  if (hidden) hiddenSet.add(id)
  else hiddenSet.delete(id)
  saveHiddenSet(hiddenSet, cacheUserId)
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

async function patchNotificationState(id, patch) {
  const localPatch = {}
  if (patch.hidden !== undefined) localPatch.hidden = !!patch.hidden
  if (patch.inPlanner !== undefined) localPatch.inPlanner = !!patch.inPlanner
  if (patch.read !== undefined) localPatch.read = !!patch.read
  if (patch.important !== undefined) localPatch.important = !!patch.important

  const item = getNotificationById(id)
  const prevHidden = item?.hidden ?? false
  const prevInPlanner = item?.inPlanner ?? false
  const prevRead = item?.read ?? false
  const prevImportant = item?.important ?? false

  if (Object.keys(localPatch).length) _patchLocal(id, localPatch)
  if (patch.hidden !== undefined) _rememberHidden(id, !!patch.hidden)

  const { error } = await notificationsApi.patchNotificationState(id, patch)
  if (error) {
    _patchLocal(id, {
      hidden: prevHidden,
      inPlanner: prevInPlanner,
      read: prevRead,
      important: prevImportant,
    })
    _rememberHidden(id, prevHidden)
    console.error('[useNotificationStore] patchNotificationState:', error.message)
  }
  return { error }
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

const notificationsById = computed(() => {
  const map = new Map()
  for (const n of notifications.value) map.set(n.id, n)
  return map
})

const partitionedNotifications = computed(() => {
  const visible = []
  const hidden = []
  const pinned = []
  for (const n of notifications.value) {
    if (n.hidden) {
      hidden.push(n)
      continue
    }
    if (n.inPlanner) continue
    visible.push(n)
    if (n.important) pinned.push(n)
  }
  pinned.sort((a, b) => (a.read === b.read ? 0 : a.read ? 1 : -1))
  return { visible, hidden, pinned }
})

const visibleNotifications = computed(() => partitionedNotifications.value.visible)
const hiddenNotifications = computed(() => partitionedNotifications.value.hidden)
const pinnedNotifications = computed(() => partitionedNotifications.value.pinned)

const visibleNoticesByCommunityId = computed(() => {
  const map = new Map()
  const pool = visibleNotifications.value
  for (const c of communities.value) {
    const list = []
    for (const n of pool) {
      if (noticeMatchesCommunity(n, c)) list.push(n)
    }
    map.set(c.id, list)
  }
  return map
})

function getVisibleNoticesForCommunity(communityOrId) {
  const id = typeof communityOrId === 'object' ? communityOrId?.id : communityOrId
  if (!id) return []
  return visibleNoticesByCommunityId.value.get(id) || []
}

function getVisibleNoticeCountForCommunity(communityOrId) {
  return getVisibleNoticesForCommunity(communityOrId).length
}

function isNoticeDeletable(notice, userId = currentUser.value?.id) {
  if (!userId || !notice?.id) return false
  return (isAdminMember(currentUser.value) && adminModeEnabled.value) || notice.createdBy === userId
}

function buildDeletableNoticeIds(notices = []) {
  const set = new Set()
  for (const n of notices) {
    if (isNoticeDeletable(n)) set.add(n.id)
  }
  return set
}

const unreadRelevantCount = computed(() =>
  countUnreadRelevantNotices(visibleNotifications.value, currentUser.value?.id || '')
)

export function resetNotificationSession() {
  invalidateNotificationFetches()
  notifications.value = []
}

export { setInPlanner, patchNotificationState, unhide, setHidden, isNoticeRelevantToUser, countUnreadRelevantNotices, buildDeletableNoticeIds, isNoticeDeletable }

export function useNotificationStore() {
  return {
    notifications,
    loading,
    visibleNotifications,
    hiddenNotifications,
    unreadRelevantCount,
    pinnedNotifications,
    getVisibleNoticesForCommunity,
    getVisibleNoticeCountForCommunity,
    buildDeletableNoticeIds,
    isNoticeDeletable,
    fetchNotifications,
    getNotificationById,
    markRead,
    toggleImportant,
    setInPlanner,
    patchNotificationState,
    toggleHidden,
    setHidden,
    unhide,
    removeNotification,
    addNotification,
  }
}
