import { computed } from 'vue'
import { useAppearancePrefs } from '@/composables/useAppearancePrefs'

/**
 * Global swipe handedness (Appearance setting).
 * true  = 左藏右删 — swipe left → hide/archive, swipe right → delete
 * false = 左删右藏 — swipe left → delete, swipe right → hide/archive
 */
export function useSwipeLayout() {
  const { swipeLeftHideRightDelete } = useAppearancePrefs()

  const leftHideRightDelete = computed(() => swipeLeftHideRightDelete.value)

  const noticePositiveAction = computed(() =>
    leftHideRightDelete.value ? 'delete' : 'hide'
  )
  const noticeNegativeAction = computed(() =>
    leftHideRightDelete.value ? 'hide' : 'delete'
  )

  const taskPositiveAction = computed(() =>
    leftHideRightDelete.value ? 'delete' : 'secondary'
  )
  const taskNegativeAction = computed(() =>
    leftHideRightDelete.value ? 'secondary' : 'delete'
  )

  const swipeLayoutHint = computed(() =>
    leftHideRightDelete.value
      ? 'Swipe left to hide · swipe right to delete'
      : 'Swipe left to delete · swipe right to hide'
  )

  const swipeLayoutToggleHint = computed(() =>
    leftHideRightDelete.value
      ? 'Left hides · right deletes (tasks archive on the left)'
      : 'Left deletes · right hides or archives'
  )

  return {
    leftHideRightDelete,
    noticePositiveAction,
    noticeNegativeAction,
    taskPositiveAction,
    taskNegativeAction,
    swipeLayoutHint,
    swipeLayoutToggleHint,
  }
}
