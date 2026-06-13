import { computed, ref } from 'vue'
import { useTasksStore } from './useTasksStore'
import { useCommunityStore } from './useCommunityStore'
import { useStudyStore } from './useStudyStore'
import { useNotificationStore } from './useNotificationStore'
import { visibleMembers } from './useMemberStore'

const RECENT_KEY = 'global_search_recent_v1'

const open = ref(false)
const query = ref('')

function loadRecent() {
  try {
    const raw = uni.getStorageSync(RECENT_KEY)
    if (Array.isArray(raw)) return raw.filter((x) => typeof x === 'string')
  } catch (e) {}
  return []
}
function persistRecent(list) {
  try { uni.setStorageSync(RECENT_KEY, list) } catch (e) {}
}

const recent = ref(loadRecent())

function includesText(value, q) {
  return String(value || '')
    .toLowerCase()
    .includes(q)
}

function commitRecent(value) {
  const v = String(value || '').trim()
  if (!v) return
  recent.value = [v, ...recent.value.filter((x) => x !== v)].slice(0, 6)
  persistRecent(recent.value)
}

function clearRecent() {
  recent.value = []
  persistRecent(recent.value)
}

function isString(value) {
  return typeof value === 'string'
}

function openSearch(initial) {
  query.value = isString(initial) ? initial : ''
  open.value = true
}

function closeSearch({ keepQuery = false } = {}) {
  if (query.value && isString(query.value) && query.value.trim()) {
    commitRecent(query.value.trim())
  }
  open.value = false
  if (!keepQuery) {
    query.value = ''
  }
}

function setQuery(value) {
  query.value = isString(value) ? value : ''
}

const EMPTY_RESULTS = []

export function useGlobalSearch() {
  const { tasks } = useTasksStore()
  const { communities } = useCommunityStore()
  const { resources } = useStudyStore()
  const { visibleNotifications } = useNotificationStore()
  const q = computed(() => (isString(query.value) ? query.value.trim().toLowerCase() : ''))
  const active = computed(() => open.value)

  const resultTasks = computed(() => {
    if (!active.value) return EMPTY_RESULTS
    if (!q.value) return tasks.value
    return tasks.value.filter(
      (x) =>
        includesText(x.title, q.value) ||
        includesText(x.subject, q.value) ||
        includesText(x.description, q.value)
    )
  })

  const resultCommunities = computed(() => {
    if (!active.value) return EMPTY_RESULTS
    if (!q.value) return communities.value
    return communities.value.filter(
      (x) => includesText(x.name, q.value) || includesText(x.desc, q.value)
    )
  })

  const resultMembers = computed(() => {
    if (!active.value) return EMPTY_RESULTS
    const pool = visibleMembers.value
    if (!q.value) return pool
    return pool.filter(
      (x) => includesText(x.name, q.value) || includesText(x.interests, q.value)
    )
  })

  const resultNotifications = computed(() => {
    if (!active.value) return EMPTY_RESULTS
    if (!q.value) return visibleNotifications.value
    return visibleNotifications.value.filter(
      (x) => includesText(x.title, q.value) || includesText(x.type, q.value)
    )
  })

  const resultResources = computed(() => {
    if (!active.value) return EMPTY_RESULTS
    if (!q.value) return resources.value
    return resources.value.filter(
      (x) => includesText(x.title, q.value) || includesText(x.by, q.value)
    )
  })

  return {
    open,
    query,
    recent,
    resultTasks,
    resultCommunities,
    resultMembers,
    resultNotifications,
    resultResources,
    openSearch,
    closeSearch,
    commitRecent,
    clearRecent,
    setQuery,
  }
}
