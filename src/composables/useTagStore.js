import { computed, ref } from 'vue'

const TAGS_KEY = 'global_subject_tags_v1'

const DEFAULT_TAGS = [
  { id: 'sub_math', name: 'Math', color: 'blue', system: true },
  { id: 'sub_phys', name: 'Physics', color: 'violet', system: true },
  { id: 'sub_chem', name: 'Chemistry', color: 'green', system: true },
  { id: 'sub_econ', name: 'Economics', color: 'amber', system: true },
  { id: 'sub_gp', name: 'GP', color: 'rose', system: true },
  { id: 'sub_general', name: 'General', color: 'slate', system: true },
]

function loadTags() {
  try {
    const raw = uni.getStorageSync(TAGS_KEY)
    if (Array.isArray(raw) && raw.length) return raw
  } catch (e) {}
  return DEFAULT_TAGS.slice()
}

function saveTags(list) {
  try { uni.setStorageSync(TAGS_KEY, list) } catch (e) {}
}

const tags = ref(loadTags())

const tagNames = computed(() => tags.value.map((t) => t.name))

function findByName(name) {
  if (!name) return null
  return tags.value.find((t) => t.name.toLowerCase() === String(name).toLowerCase()) || null
}

function addTag(name, color = 'slate') {
  const clean = String(name || '').trim()
  if (!clean) return null
  if (findByName(clean)) return findByName(clean)
  const tag = {
    id: `sub_${clean.toLowerCase().replace(/\s+/g, '_')}_${Date.now().toString(36)}`,
    name: clean,
    color,
    system: false,
  }
  tags.value = [...tags.value, tag]
  saveTags(tags.value)
  return tag
}

function removeTag(id) {
  const target = tags.value.find((t) => t.id === id)
  if (!target || target.system) return false
  tags.value = tags.value.filter((t) => t.id !== id)
  saveTags(tags.value)
  return true
}

export function useTagStore() {
  return {
    tags,
    tagNames,
    findByName,
    addTag,
    removeTag,
  }
}
