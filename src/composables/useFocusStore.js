import { computed, ref } from 'vue'
import {
  mergeNoiseLibrary,
  uploadFocusSoundRecord,
  BUILTIN_NOISES,
} from '@/lib/focusNoise'
import * as focusSoundsApi from '@/api/focusSounds'
import * as focusApi from '@/api/focus'

const FOCUS_KEY_PREFIX = 'focus_sessions_v1'
const FOCUS_PREFS_KEY_PREFIX = 'focus_prefs_v1'
const FOCUS_ACTIVE_KEY_PREFIX = 'focus_active_v1'

const DEFAULT_PREFS = { visibility: 'public', defaultMinutes: 25, soundId: 'silence' }

let _activeUserId = ''

function sessionsKey(userId = _activeUserId) {
  return userId ? `${FOCUS_KEY_PREFIX}_${userId}` : FOCUS_KEY_PREFIX
}
function prefsKey(userId = _activeUserId) {
  return userId ? `${FOCUS_PREFS_KEY_PREFIX}_${userId}` : FOCUS_PREFS_KEY_PREFIX
}
function activeKey(userId = _activeUserId) {
  return userId ? `${FOCUS_ACTIVE_KEY_PREFIX}_${userId}` : FOCUS_ACTIVE_KEY_PREFIX
}

function loadSessions(userId = _activeUserId) {
  try {
    const raw = uni.getStorageSync(sessionsKey(userId))
    if (Array.isArray(raw)) return raw
  } catch (e) {}
  return []
}

function saveSessions(list, userId = _activeUserId) {
  try { uni.setStorageSync(sessionsKey(userId), list) } catch (e) {}
}

function loadPrefs(userId = _activeUserId) {
  try {
    const raw = uni.getStorageSync(prefsKey(userId))
    if (raw && typeof raw === 'object') return { ...DEFAULT_PREFS, ...raw }
  } catch (e) {}
  return { ...DEFAULT_PREFS }
}

function savePrefs(value, userId = _activeUserId) {
  try { uni.setStorageSync(prefsKey(userId), value) } catch (e) {}
}

function loadActiveSession(userId = _activeUserId) {
  try {
    const raw = uni.getStorageSync(activeKey(userId))
    if (raw && typeof raw === 'object') return raw
  } catch (e) {}
  return null
}

function saveActiveSession(state, userId = _activeUserId) {
  try {
    uni.setStorageSync(activeKey(userId), {
      ...state,
      updatedAt: new Date().toISOString(),
    })
  } catch (e) {}
}

function clearActiveSession(userId = _activeUserId) {
  try { uni.removeStorageSync(activeKey(userId)) } catch (e) {}
}

function isPendingSession(session) {
  return session?.synced === false || String(session?.id || '').startsWith('fs_')
}

function mergeSessions(remote, localPending) {
  const merged = [...(remote || [])]
  const seenIds = new Set(merged.map((s) => s.id))
  const seenClients = new Set(merged.map((s) => s.clientId).filter(Boolean))

  for (const session of localPending || []) {
    if (session.clientId && seenClients.has(session.clientId)) continue
    if (seenIds.has(session.id)) continue
    merged.push(session)
  }

  merged.sort((a, b) => new Date(b.endedAt).getTime() - new Date(a.endedAt).getTime())
  return merged.slice(0, 200)
}

const sessions = ref([])
const prefs = ref({ ...DEFAULT_PREFS })
const noiseLibrary = ref(mergeNoiseLibrary())
const syncing = ref(false)

function migrateLegacyCache(userId) {
  if (!userId) return
  try {
    const legacySessions = uni.getStorageSync(FOCUS_KEY_PREFIX)
    const userSessions = uni.getStorageSync(sessionsKey(userId))
    if (Array.isArray(legacySessions) && legacySessions.length && (!userSessions || !userSessions.length)) {
      uni.setStorageSync(sessionsKey(userId), legacySessions)
    }
    const legacyPrefs = uni.getStorageSync(FOCUS_PREFS_KEY_PREFIX)
    const userPrefs = uni.getStorageSync(prefsKey(userId))
    if (legacyPrefs && typeof legacyPrefs === 'object' && !userPrefs) {
      uni.setStorageSync(prefsKey(userId), { ...DEFAULT_PREFS, ...legacyPrefs })
    }
  } catch (e) {}
}

function bindUser(userId) {
  if (!userId) return
  if (_activeUserId === userId && sessions.value.length) return
  migrateLegacyCache(userId)
  _activeUserId = userId
  sessions.value = loadSessions(userId)
  prefs.value = loadPrefs(userId)
}

async function refreshNoiseLibrary() {
  const { data: shared } = await focusSoundsApi.fetchSharedSounds()
  noiseLibrary.value = mergeNoiseLibrary({ shared: shared || [] })
  ensureValidSoundId()
}

function getNoiseById(id) {
  return noiseLibrary.value.find((n) => n.id === id) || null
}

function ensureValidSoundId() {
  if (!noiseLibrary.value.some((n) => n.id === prefs.value.soundId)) {
    prefs.value = { ...prefs.value, soundId: 'silence' }
    savePrefs(prefs.value)
  }
}

async function uploadSharedNoise(payload) {
  const record = await uploadFocusSoundRecord(payload)
  const { data, error } = await focusSoundsApi.addSharedSound(record)
  if (error) throw error
  await refreshNoiseLibrary()
  return data || record
}

async function removeSharedNoise(_userId, id) {
  const { error } = await focusSoundsApi.removeSharedSound(id)
  if (error) throw error
  if (prefs.value.soundId === id) setSound('silence')
  await refreshNoiseLibrary()
}

async function uploadPendingSession(session) {
  const { data, error } = await focusApi.createFocusSession({
    minutes: session.minutes,
    subject: session.subject,
    soundId: session.soundId,
    endedAt: session.endedAt,
    clientId: session.clientId || session.id,
  })
  if (error || !data) return null
  return data
}

async function fetchFocusSessions(userId) {
  if (userId) bindUser(userId)
  if (!_activeUserId) return

  syncing.value = true
  try {
    const pending = sessions.value.filter(isPendingSession)
    for (const session of pending) {
      const uploaded = await uploadPendingSession(session)
      if (uploaded) {
        const idx = sessions.value.findIndex(
          (s) => s.clientId === session.clientId || s.id === session.id
        )
        if (idx >= 0) sessions.value[idx] = uploaded
      }
    }

    const { data, error } = await focusApi.fetchFocusSessions()
    if (error) {
      console.error('[useFocusStore] fetchFocusSessions:', error.message)
      saveSessions(sessions.value)
      return
    }

    const stillPending = sessions.value.filter(isPendingSession)
    sessions.value = mergeSessions(data, stillPending)
    saveSessions(sessions.value)

    const { data: remotePrefs } = await focusApi.fetchFocusPrefs()
    if (remotePrefs && typeof remotePrefs === 'object') {
      prefs.value = { ...DEFAULT_PREFS, ...remotePrefs }
      savePrefs(prefs.value)
      ensureValidSoundId()
    }
  } finally {
    syncing.value = false
  }
}

async function recordSession({ minutes, subject = 'Focus', soundId = 'silence' }) {
  if (!minutes || minutes < 1) return null

  const clientId = `fs_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
  const session = {
    id: clientId,
    clientId,
    minutes: Math.round(minutes),
    subject,
    soundId,
    endedAt: new Date().toISOString(),
    synced: false,
  }

  sessions.value = [session, ...sessions.value].slice(0, 200)
  saveSessions(sessions.value)

  const uploaded = await uploadPendingSession(session)
  if (uploaded) {
    const idx = sessions.value.findIndex((s) => s.clientId === clientId)
    if (idx >= 0) {
      sessions.value[idx] = uploaded
      sessions.value = [...sessions.value]
      saveSessions(sessions.value)
    }
  }

  return uploaded || session
}

function clearSessions() {
  sessions.value = []
  saveSessions(sessions.value)
}

function pushPrefsRemote() {
  focusApi.saveFocusPrefs(prefs.value).catch((e) => {
    console.error('[useFocusStore] saveFocusPrefs:', e?.message || e)
  })
}

function setVisibility(value) {
  prefs.value = { ...prefs.value, visibility: value === 'private' ? 'private' : 'public' }
  savePrefs(prefs.value)
  pushPrefsRemote()
}

function setDefaultMinutes(minutes) {
  prefs.value = { ...prefs.value, defaultMinutes: Math.max(1, Math.round(minutes)) }
  savePrefs(prefs.value)
  pushPrefsRemote()
}

function setSound(soundId) {
  prefs.value = { ...prefs.value, soundId }
  savePrefs(prefs.value)
  pushPrefsRemote()
}

const totalMinutes = computed(() => sessions.value.reduce((acc, s) => acc + (s.minutes || 0), 0))
const totalHoursLabel = computed(() => {
  const h = totalMinutes.value / 60
  if (h >= 10) return `${Math.round(h)}h`
  if (h >= 1) return `${h.toFixed(1)}h`
  return `${totalMinutes.value}m`
})

const weekTotals = computed(() => {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = new Date()
  const out = labels.map((label, idx) => {
    const day = new Date(today)
    day.setDate(today.getDate() - (today.getDay() - idx))
    day.setHours(0, 0, 0, 0)
    return { label, key: day.toISOString().slice(0, 10), minutes: 0 }
  })
  for (const s of sessions.value) {
    const k = (s.endedAt || '').slice(0, 10)
    const bucket = out.find((b) => b.key === k)
    if (bucket) bucket.minutes += s.minutes || 0
  }
  return out
})

const monthTrend = computed(() => {
  const today = new Date()
  const out = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const next = new Date(today.getFullYear(), today.getMonth() - i + 1, 1)
    const minutes = sessions.value
      .filter((s) => {
        const t = new Date(s.endedAt).getTime()
        return t >= d.getTime() && t < next.getTime()
      })
      .reduce((acc, s) => acc + (s.minutes || 0), 0)
    out.push({
      key: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: d.toLocaleString('en-US', { month: 'short' }),
      minutes,
    })
  }
  return out
})

const subjectDistribution = computed(() => {
  const tally = {}
  for (const s of sessions.value) {
    const k = s.subject || 'Focus'
    tally[k] = (tally[k] || 0) + (s.minutes || 0)
  }
  const entries = Object.entries(tally).map(([name, minutes]) => ({ name, minutes }))
  entries.sort((a, b) => b.minutes - a.minutes)
  return entries
})

const publicFocusHoursLabel = computed(() =>
  prefs.value.visibility === 'private' ? '' : totalHoursLabel.value
)

/** @deprecated use noiseLibrary */
export const WHITE_NOISE_OPTIONS = BUILTIN_NOISES

export function useFocusStore() {
  return {
    sessions,
    prefs,
    noiseLibrary,
    syncing,
    totalMinutes,
    totalHoursLabel,
    publicFocusHoursLabel,
    weekTotals,
    monthTrend,
    subjectDistribution,
    bindUser,
    fetchFocusSessions,
    recordSession,
    clearSessions,
    setVisibility,
    setDefaultMinutes,
    setSound,
    getNoiseById,
    refreshNoiseLibrary,
    uploadSharedNoise,
    removeSharedNoise,
    loadActiveSession,
    saveActiveSession,
    clearActiveSession,
  }
}
