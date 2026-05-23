import { computed, ref } from 'vue'
import {
  mergeNoiseLibrary,
  loadLocalSounds,
  saveLocalSounds,
  pickAndBuildSoundRecord,
  BUILTIN_NOISES,
} from '@/lib/focusNoise'
import * as focusSoundsApi from '@/api/focusSounds'

const FOCUS_KEY = 'focus_sessions_v1'
const FOCUS_PREFS_KEY = 'focus_prefs_v1'
const FOCUS_ACTIVE_KEY = 'focus_active_v1'

function loadSessions() {
  try {
    const raw = uni.getStorageSync(FOCUS_KEY)
    if (Array.isArray(raw)) return raw
  } catch (e) {}
  return []
}
function saveSessions(list) {
  try { uni.setStorageSync(FOCUS_KEY, list) } catch (e) {}
}

function loadPrefs() {
  try {
    const raw = uni.getStorageSync(FOCUS_PREFS_KEY)
    if (raw && typeof raw === 'object') return raw
  } catch (e) {}
  return { visibility: 'public', defaultMinutes: 25, soundId: 'silence' }
}
function savePrefs(value) {
  try { uni.setStorageSync(FOCUS_PREFS_KEY, value) } catch (e) {}
}

function loadActiveSession() {
  try {
    const raw = uni.getStorageSync(FOCUS_ACTIVE_KEY)
    if (raw && typeof raw === 'object') return raw
  } catch (e) {}
  return null
}

function saveActiveSession(state) {
  try {
    uni.setStorageSync(FOCUS_ACTIVE_KEY, {
      ...state,
      updatedAt: new Date().toISOString(),
    })
  } catch (e) {}
}

function clearActiveSession() {
  try { uni.removeStorageSync(FOCUS_ACTIVE_KEY) } catch (e) {}
}

const sessions = ref(loadSessions())
const prefs = ref(loadPrefs())
const noiseLibrary = ref(mergeNoiseLibrary())

async function refreshNoiseLibrary(userId = '') {
  const { data: shared } = await focusSoundsApi.fetchSharedSounds()
  const local = loadLocalSounds(userId)
  noiseLibrary.value = mergeNoiseLibrary({ shared: shared || [], local })
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

async function addLocalNoise(userId) {
  const record = await pickAndBuildSoundRecord({ source: 'local', userId })
  const list = loadLocalSounds(userId)
  list.unshift(record)
  saveLocalSounds(userId, list)
  await refreshNoiseLibrary(userId)
  setSound(record.id)
  return record
}

async function removeLocalNoise(userId, id) {
  const list = loadLocalSounds(userId).filter((s) => s.id !== id)
  saveLocalSounds(userId, list)
  if (prefs.value.soundId === id) setSound('silence')
  await refreshNoiseLibrary(userId)
}

async function addSharedNoise(userId) {
  const record = await pickAndBuildSoundRecord({ source: 'shared', userId })
  await focusSoundsApi.addSharedSound(record)
  await refreshNoiseLibrary(userId)
  setSound(record.id)
  return record
}

async function removeSharedNoise(userId, id) {
  await focusSoundsApi.removeSharedSound(id)
  if (prefs.value.soundId === id) setSound('silence')
  await refreshNoiseLibrary(userId)
}

function recordSession({ minutes, subject = 'Focus', soundId = 'silence' }) {
  if (!minutes || minutes < 1) return null
  const session = {
    id: `fs_${Date.now().toString(36)}`,
    minutes: Math.round(minutes),
    subject,
    soundId,
    endedAt: new Date().toISOString(),
  }
  sessions.value = [session, ...sessions.value].slice(0, 200)
  saveSessions(sessions.value)
  return session
}

function clearSessions() {
  sessions.value = []
  saveSessions(sessions.value)
}

function setVisibility(value) {
  prefs.value = { ...prefs.value, visibility: value === 'private' ? 'private' : 'public' }
  savePrefs(prefs.value)
}

function setDefaultMinutes(minutes) {
  prefs.value = { ...prefs.value, defaultMinutes: Math.max(1, Math.round(minutes)) }
  savePrefs(prefs.value)
}

function setSound(soundId) {
  prefs.value = { ...prefs.value, soundId }
  savePrefs(prefs.value)
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
    totalMinutes,
    totalHoursLabel,
    publicFocusHoursLabel,
    weekTotals,
    monthTrend,
    subjectDistribution,
    recordSession,
    clearSessions,
    setVisibility,
    setDefaultMinutes,
    setSound,
    getNoiseById,
    refreshNoiseLibrary,
    addLocalNoise,
    removeLocalNoise,
    addSharedNoise,
    removeSharedNoise,
    loadActiveSession,
    saveActiveSession,
    clearActiveSession,
  }
}
