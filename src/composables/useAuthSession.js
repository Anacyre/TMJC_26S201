import { bootstrapData } from '@/composables/useBootstrap'
import { hasActiveSession } from '@/api/auth'
import { useUserStore } from '@/composables/useUserStore'

const REMEMBER_KEY = 'auth_remember_v1'

export function getRememberPref() {
  try {
    const raw = uni.getStorageSync(REMEMBER_KEY)
    if (raw && typeof raw === 'object') return raw
  } catch (e) {}
  return { enabled: false, account: '' }
}

export function setRememberPref({ enabled, account = '' } = {}) {
  try {
    if (enabled) {
      uni.setStorageSync(REMEMBER_KEY, { enabled: true, account: String(account || '').trim() })
    } else {
      uni.removeStorageSync(REMEMBER_KEY)
    }
  } catch (e) {}
}

export function loadRememberMeToggle() {
  return !!getRememberPref().enabled
}

export async function tryRestoreSession() {
  const pref = getRememberPref()
  if (!pref.enabled) return false
  if (!(await hasActiveSession())) return false
  await bootstrapData({ force: true })
  const { currentUser } = useUserStore()
  return !!currentUser.value.id
}

export function clearAuthSession() {
  setRememberPref({ enabled: false })
}
