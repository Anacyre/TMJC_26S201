import { computed, ref } from 'vue'
import { useUserStore } from '@/composables/useUserStore'
import { isAdminMember } from '@/lib/classMembers'

const ADMIN_MODE_KEY = 'ui_admin_mode_enabled'
const adminModeEnabled = ref(false)
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

function setAdminModeEnabled(next) {
  adminModeEnabled.value = !!next
  try {
    uni.setStorageSync(ADMIN_MODE_KEY, adminModeEnabled.value)
  } catch (e) {}
}

function toggleAdminMode() {
  setAdminModeEnabled(!adminModeEnabled.value)
}

export function useAdminMode() {
  hydrateOnce()
  const { currentUser } = useUserStore()

  const isRealAdmin = computed(() => isAdminMember(currentUser.value))
  const isAdminActive = computed(() => isRealAdmin.value && adminModeEnabled.value)

  return {
    adminModeEnabled,
    isRealAdmin,
    isAdminActive,
    setAdminModeEnabled,
    toggleAdminMode,
  }
}
