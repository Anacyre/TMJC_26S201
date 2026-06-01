import { ref } from 'vue'
import { isAdminMember } from '@/lib/classMembers'

const ADMIN_MODE_KEY = 'ui_admin_mode_enabled'
export const adminModeEnabled = ref(false)
let hydrated = false

function hydrateOnce() {
  if (hydrated) return
  hydrated = true
  try {
    const stored = uni.getStorageSync(ADMIN_MODE_KEY)
    if (stored === true || stored === 'true') adminModeEnabled.value = true
    else if (stored === false || stored === 'false') adminModeEnabled.value = false
  } catch (e) {}
}

export function setAdminModeEnabled(next) {
  hydrateOnce()
  adminModeEnabled.value = !!next
  try {
    uni.setStorageSync(ADMIN_MODE_KEY, adminModeEnabled.value)
  } catch (e) {}
}

export function resetAdminMode() {
  setAdminModeEnabled(false)
}

export function syncAdminModeForUser(user) {
  hydrateOnce()
  if (!isAdminMember(user)) resetAdminMode()
}

export function hydrateAdminMode() {
  hydrateOnce()
}
