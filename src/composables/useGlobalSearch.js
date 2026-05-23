import { computed, ref } from 'vue'
import { useTasksStore } from './useTasksStore'
import { useCommunityStore } from './useCommunityStore'
import { useStudyStore } from './useStudyStore'
import { useNotificationStore } from './useNotificationStore'

const open = ref(false)
const query = ref('')
const recent = ref(['ddl this week', 'homework', 'via meeting', 'boris'])

function includesText(value, q) {
  return String(value || '')
    .toLowerCase()
    .includes(q)
}

function commitRecent(value) {
  const v = String(value || '').trim()
  if (!v) return
  if (recent.value.includes(v)) {
    recent.value = [v, ...recent.value.filter((x) => x !== v)]
    return
  }
  recent.value = [v, ...recent.value].slice(0, 6)
}

function openSearch(initial = '') {
  query.value = initial
  open.value = true
}

function closeSearch() {
  if (query.value.trim()) commitRecent(query.value.trim())
  open.value = false
  query.value = ''
}

export function useGlobalSearch() {
  const { tasks } = useTasksStore()
  const { communities, members } = useCommunityStore()
  const { resources } = useStudyStore()
  const { visibleNotifications } = useNotificationStore()
  const q = computed(() => query.value.trim().toLowerCase())

  const resultTasks = computed(() =>
    tasks.value.filter((x) => {
      if (!q.value) return true
      return includesText(x.title, q.value) || includesText(x.subject, q.value) || includesText(x.description, q.value)
    })
  )

  const resultCommunities = computed(() =>
    communities.value.filter((x) => !q.value || includesText(x.name, q.value) || includesText(x.desc, q.value))
  )
  const resultMembers = computed(() =>
    members.value.filter((x) => !q.value || includesText(x.name, q.value) || includesText(x.interests, q.value))
  )
  const resultNotifications = computed(() =>
    visibleNotifications.value.filter((x) => !q.value || includesText(x.title, q.value) || includesText(x.type, q.value))
  )
  const resultResources = computed(() =>
    resources.value.filter((x) => !q.value || includesText(x.title, q.value) || includesText(x.by, q.value))
  )

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
  }
}
