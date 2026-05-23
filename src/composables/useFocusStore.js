import { computed, ref } from 'vue'

const FOCUS_KEY = 'focus_sessions_v1'
const FOCUS_PREFS_KEY = 'focus_prefs_v1'

const WHITE_NOISE = [
  { id: 'silence', name: 'Silence' },
  { id: 'rain', name: 'Rain' },
  { id: 'cafe', name: 'Cafe' },
  { id: 'wind', name: 'Wind' },
  { id: 'brown', name: 'Brown noise' },
]

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

const sessions = ref(loadSessions())
const prefs = ref(loadPrefs())

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

export const WHITE_NOISE_OPTIONS = WHITE_NOISE

export function useFocusStore() {
  return {
    sessions,
    prefs,
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
  }
}
