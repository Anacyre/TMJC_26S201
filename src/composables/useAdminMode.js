import { computed } from 'vue'
import { useUserStore } from '@/composables/useUserStore'
import { isAdminMember } from '@/lib/classMembers'
import {
  adminModeEnabled,
  hydrateAdminMode,
  resetAdminMode,
  setAdminModeEnabled,
} from '@/composables/adminModeState'

export { resetAdminMode, setAdminModeEnabled, syncAdminModeForUser } from '@/composables/adminModeState'

export function useAdminMode() {
  hydrateAdminMode()
  const { currentUser } = useUserStore()

  const isRealAdmin = computed(() => isAdminMember(currentUser.value))
  const isAdminActive = computed(() => isRealAdmin.value && adminModeEnabled.value)

  function toggleAdminMode() {
    if (!isRealAdmin.value) {
      resetAdminMode()
      return
    }
    setAdminModeEnabled(!adminModeEnabled.value)
  }

  return {
    adminModeEnabled,
    isRealAdmin,
    isAdminActive,
    setAdminModeEnabled,
    toggleAdminMode,
  }
}
