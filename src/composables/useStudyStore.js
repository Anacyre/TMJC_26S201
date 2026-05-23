import { computed, ref } from 'vue'
import * as studyApi from '@/api/study'

const subjects = ref([])
const resources = ref([])
const loading = ref(false)

// ─── 数据获取 ────────────────────────────────────────────────────

async function fetchSubjects() {
  const { data, error } = await studyApi.fetchSubjects()
  if (!error) subjects.value = data
  else console.error('[useStudyStore] fetchSubjects:', error.message)
}

async function fetchResources(options = {}) {
  loading.value = true
  try {
    const { data, error } = await studyApi.fetchResources(options)
    if (!error) resources.value = data
    else console.error('[useStudyStore] fetchResources:', error.message)
  } finally {
    loading.value = false
  }
}

// ─── 读取工具 ────────────────────────────────────────────────────

function getSubjectById(id) {
  return subjects.value.find((x) => x.id === id) || subjects.value[0]
}

function getResourceById(id) {
  return resources.value.find((x) => x.id === id) || resources.value[0]
}

function getResourcesBySubject(subjectId) {
  return resources.value.filter((x) => x.subjectId === subjectId)
}

// ─── 写操作 ──────────────────────────────────────────────────────

async function uploadResource(payload) {
  const { data, error } = await studyApi.createResource(payload)
  if (!error && data) {
    resources.value.unshift(data)
    return data
  }
  if (error) console.error('[useStudyStore] uploadResource:', error.message)
  return null
}

async function toggleResourceLike(resourceId) {
  const idx = resources.value.findIndex((r) => r.id === resourceId)
  if (idx < 0) return
  const resource = resources.value[idx]
  const { liked, likesCount, error } = await studyApi.toggleResourceLike(
    resourceId, resource.liked, resource.likesCount
  )
  if (!error) {
    resources.value[idx] = { ...resource, liked, likesCount }
  }
}

async function downloadResource(resourceId) {
  return studyApi.downloadResource(resourceId)
}

// ─── 计算属性 ────────────────────────────────────────────────────

const latestResources = computed(() => resources.value)

export function useStudyStore() {
  return {
    subjects,
    resources,
    loading,
    latestResources,
    fetchSubjects,
    fetchResources,
    getSubjectById,
    getResourceById,
    getResourcesBySubject,
    uploadResource,
    toggleResourceLike,
    downloadResource,
  }
}
