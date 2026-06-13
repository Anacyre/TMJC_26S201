import { computed, ref, shallowRef } from 'vue'
import * as studyApi from '@/api/study'

const subjects = shallowRef([])
const resources = shallowRef([])
const loading = ref(false)
let _resourcesLoaded = false

// ─── Data fetch ────────────────────────────────────────────────────

async function fetchSubjects() {
  const { data, error } = await studyApi.fetchSubjects()
  if (!error) subjects.value = data
  else console.error('[useStudyStore] fetchSubjects:', error.message)
}

async function fetchResources(options = {}) {
  loading.value = true
  try {
    const { data, error } = await studyApi.fetchResources(options)
    if (!error) {
      resources.value = data
      _resourcesLoaded = true
    } else console.error('[useStudyStore] fetchResources:', error.message)
  } finally {
    loading.value = false
  }
}

async function ensureResourcesLoaded() {
  if (_resourcesLoaded) return
  await fetchResources()
}

export function resetStudySession() {
  subjects.value = []
  resources.value = []
  _resourcesLoaded = false
}

// ─── Indexes ───────────────────────────────────────────────────────

const subjectsById = computed(() => {
  const map = new Map()
  for (const s of subjects.value) map.set(s.id, s)
  return map
})

const resourcesById = computed(() => {
  const map = new Map()
  for (const r of resources.value) map.set(r.id, r)
  return map
})

const resourcesBySubjectId = computed(() => {
  const map = new Map()
  for (const r of resources.value) {
    const key = String(r.subjectId || '')
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(r)
  }
  return map
})

// ─── Read helpers ────────────────────────────────────────────────────

function getSubjectById(id) {
  return subjectsById.value.get(id) || subjects.value[0] || null
}

function getResourceById(id) {
  return resourcesById.value.get(id) || resources.value[0] || null
}

function getResourcesBySubject(subjectId) {
  return resourcesBySubjectId.value.get(String(subjectId || '')) || []
}

// ─── Writes ──────────────────────────────────────────────────────

async function addSubject(payload) {
  const { data, error } = await studyApi.createSubject(payload)
  if (error) return { data: null, error }
  if (data) subjects.value = [data, ...subjects.value]
  return { data, error: null }
}

async function uploadResource(payload) {
  const { data, error } = await studyApi.createResource(payload)
  if (error) return { data: null, error }
  if (data) {
    resources.value = [data, ...resources.value]
    const subIdx = subjects.value.findIndex((s) => s.id === data.subjectId)
    if (subIdx >= 0) {
      const next = [...subjects.value]
      next[subIdx] = {
        ...next[subIdx],
        filesCount: (next[subIdx].filesCount || 0) + 1,
        updatedAt: data.createdAt || new Date().toISOString(),
      }
      subjects.value = next
    }
    return { data, error: null }
  }
  return { data: null, error: new Error('Upload failed') }
}

async function toggleResourceLike(resourceId) {
  const idx = resources.value.findIndex((r) => r.id === resourceId)
  if (idx < 0) return
  const resource = resources.value[idx]
  const { liked, likesCount, error } = await studyApi.toggleResourceLike(
    resourceId, resource.liked, resource.likesCount
  )
  if (!error) {
    const next = [...resources.value]
    next[idx] = { ...resource, liked, likesCount }
    resources.value = next
  }
}

async function downloadResource(resourceId) {
  return studyApi.downloadResource(resourceId)
}

// ─── Computed ────────────────────────────────────────────────────

const latestResources = computed(() => resources.value)

export function useStudyStore() {
  return {
    subjects,
    resources,
    loading,
    latestResources,
    fetchSubjects,
    fetchResources,
    ensureResourcesLoaded,
    getSubjectById,
    getResourceById,
    getResourcesBySubject,
    addSubject,
    uploadResource,
    toggleResourceLike,
    downloadResource,
  }
}
