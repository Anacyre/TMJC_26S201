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
  const existing = findByName(clean)
  if (existing) return existing
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

function renameTag(fromName, toName) {
  const from = findByName(fromName)
  const cleanTo = String(toName || '').trim()
  if (!from || !cleanTo || from.name === cleanTo) return false
  if (from.system) return false
  const conflict = tags.value.find(
    (t) => t.id !== from.id && t.name.toLowerCase() === cleanTo.toLowerCase()
  )
  if (conflict) return false
  tags.value = tags.value.map((t) => (t.id === from.id ? { ...t, name: cleanTo } : t))
  saveTags(tags.value)
  return true
}

function syncFromCommunities(communities = []) {
  let next = tags.value
  let dirty = false
  for (const community of communities) {
    const name = String(community?.name || '').trim()
    if (!name) continue
    const exists = next.find((t) => t.name.toLowerCase() === name.toLowerCase())
    if (exists) continue
    next = [
      ...next,
      {
        id: `sub_${name.toLowerCase().replace(/\s+/g, '_')}_${Date.now().toString(36)}`,
        name,
        color: 'slate',
        system: false,
      },
    ]
    dirty = true
  }
  if (dirty) {
    tags.value = next
    saveTags(next)
  }
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
    renameTag,
    syncFromCommunities,
  }
}
