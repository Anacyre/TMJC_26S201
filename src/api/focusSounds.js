import * as mock from '@/lib/mockBackend'

const USE_MOCK = mock.USE_MOCK
const SHARED_KEY = 'focus_shared_sounds_v1'

function loadSharedFallback() {
  try {
    const raw = uni.getStorageSync(SHARED_KEY)
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

function saveSharedFallback(list) {
  try {
    uni.setStorageSync(SHARED_KEY, list)
  } catch {}
}

export async function fetchSharedSounds() {
  if (USE_MOCK) return mock.fetchFocusSounds()
  return { data: loadSharedFallback(), error: null }
}

export async function addSharedSound(record) {
  if (USE_MOCK) return mock.addFocusSound(record)
  const list = loadSharedFallback()
  list.unshift(record)
  saveSharedFallback(list)
  return { data: record, error: null }
}

export async function removeSharedSound(id) {
  if (USE_MOCK) return mock.removeFocusSound(id)
  const list = loadSharedFallback().filter((s) => s.id !== id)
  saveSharedFallback(list)
  return { error: null }
}
