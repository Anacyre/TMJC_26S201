import { computed, ref } from 'vue'

const STORAGE_KEY = 'ui_appearance_prefs_v1'

const DEFAULT_PREFS = {
  showHomeTodayFocus: false,
  /** Show focus duration stats across home, apps, focus page, and profile */
  showFocusTime: false,
  /** true = 左藏右删; false = 左删右藏 */
  swipeLeftHideRightDelete: true,
  /** 页面进入时的内容层转换动画 */
  enablePageTransitions: false,
  /** Home "tasks today" metric: precise (recent + overdue) or focus (due today only) */
  homeTasksCountMode: 'precise',
  /** User chose home tasks count mode via long-press; skip auto on home entry */
  homeTasksCountModeUserSet: false,
  /** Hide notice-sourced P3 tasks in the tasks planner list */
  hideNoticeP3Tasks: false,
}

const prefs = ref({ ...DEFAULT_PREFS })
let hydrated = false

function hydrateOnce() {
  if (hydrated) return
  hydrated = true
  try {
    const raw = uni.getStorageSync(STORAGE_KEY)
    if (raw && typeof raw === 'object') {
      prefs.value = { ...DEFAULT_PREFS, ...raw }
    }
  } catch (e) {}
}

function persist() {
  try {
    uni.setStorageSync(STORAGE_KEY, prefs.value)
  } catch (e) {}
}

const showHomeTodayFocus = computed({
  get() {
    hydrateOnce()
    return !!prefs.value.showHomeTodayFocus
  },
  set(value) {
    hydrateOnce()
    prefs.value = { ...prefs.value, showHomeTodayFocus: !!value }
    persist()
  },
})

function setShowHomeTodayFocus(value) {
  showHomeTodayFocus.value = !!value
}

const showFocusTime = computed({
  get() {
    hydrateOnce()
    return !!prefs.value.showFocusTime
  },
  set(value) {
    hydrateOnce()
    prefs.value = { ...prefs.value, showFocusTime: !!value }
    persist()
  },
})

function setShowFocusTime(value) {
  showFocusTime.value = !!value
}

const swipeLeftHideRightDelete = computed({
  get() {
    hydrateOnce()
    return prefs.value.swipeLeftHideRightDelete !== false
  },
  set(value) {
    hydrateOnce()
    prefs.value = { ...prefs.value, swipeLeftHideRightDelete: !!value }
    persist()
  },
})

function setSwipeLeftHideRightDelete(value) {
  swipeLeftHideRightDelete.value = !!value
}

function isPageTransitionsEnabled() {
  hydrateOnce()
  return !!prefs.value.enablePageTransitions
}

const enablePageTransitions = computed({
  get() {
    hydrateOnce()
    return !!prefs.value.enablePageTransitions
  },
  set(value) {
    hydrateOnce()
    prefs.value = { ...prefs.value, enablePageTransitions: !!value }
    persist()
  },
})

function setEnablePageTransitions(value) {
  enablePageTransitions.value = !!value
}

const homeTasksCountMode = computed({
  get() {
    hydrateOnce()
    const mode = prefs.value.homeTasksCountMode
    return mode === 'focus' ? 'focus' : 'precise'
  },
  set(value) {
    hydrateOnce()
    prefs.value = { ...prefs.value, homeTasksCountMode: value === 'focus' ? 'focus' : 'precise' }
    persist()
  },
})

function setHomeTasksCountMode(value) {
  homeTasksCountMode.value = value === 'focus' ? 'focus' : 'precise'
}

const homeTasksCountModeUserSet = computed({
  get() {
    hydrateOnce()
    return !!prefs.value.homeTasksCountModeUserSet
  },
  set(value) {
    hydrateOnce()
    prefs.value = { ...prefs.value, homeTasksCountModeUserSet: !!value }
    persist()
  },
})

function markHomeTasksCountModeUserSet() {
  homeTasksCountModeUserSet.value = true
}

const hideNoticeP3Tasks = computed({
  get() {
    hydrateOnce()
    return !!prefs.value.hideNoticeP3Tasks
  },
  set(value) {
    hydrateOnce()
    prefs.value = { ...prefs.value, hideNoticeP3Tasks: !!value }
    persist()
  },
})

function setHideNoticeP3Tasks(value) {
  hideNoticeP3Tasks.value = !!value
}

export function useAppearancePrefs() {
  hydrateOnce()
  return {
    prefs,
    showHomeTodayFocus,
    setShowHomeTodayFocus,
    showFocusTime,
    setShowFocusTime,
    swipeLeftHideRightDelete,
    setSwipeLeftHideRightDelete,
    enablePageTransitions,
    setEnablePageTransitions,
    isPageTransitionsEnabled,
    homeTasksCountMode,
    setHomeTasksCountMode,
    homeTasksCountModeUserSet,
    markHomeTasksCountModeUserSet,
    hideNoticeP3Tasks,
    setHideNoticeP3Tasks,
  }
}

export { isPageTransitionsEnabled }
