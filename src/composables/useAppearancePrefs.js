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
  }
}

export { isPageTransitionsEnabled }
