import { computed, ref, watch } from 'vue'

const THEME_KEY = 'ui_theme'
const theme = ref('light')
let hydrated = false
let sideEffectsBound = false

function applyDocumentTheme(value) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (root) {
    root.dataset.theme = value
    root.style.colorScheme = value === 'dark' ? 'dark' : 'light'
  }
  if (document.body) {
    document.body.dataset.theme = value
  }
}

function applyNativeBars(value) {
  try {
    const isDark = value === 'dark'
    uni.setNavigationBarColor?.({
      frontColor: isDark ? '#ffffff' : '#000000',
      backgroundColor: isDark ? '#111315' : '#f8faff',
      animation: { duration: 220, timingFunc: 'easeIn' },
    })
    uni.setBackgroundColor?.({
      backgroundColor: isDark ? '#111315' : '#f8faff',
      backgroundColorTop: isDark ? '#111315' : '#f8faff',
      backgroundColorBottom: isDark ? '#0e1014' : '#f1f4fa',
    })
  } catch (e) {}
}

function bindSideEffects() {
  if (sideEffectsBound) return
  sideEffectsBound = true
  applyDocumentTheme(theme.value)
  applyNativeBars(theme.value)
  watch(theme, (v) => {
    applyDocumentTheme(v)
    applyNativeBars(v)
  })
}

function hydrateThemeOnce() {
  if (hydrated) return
  hydrated = true
  try {
    const t = uni.getStorageSync(THEME_KEY)
    if (t === 'light' || t === 'dark') theme.value = t
  } catch (e) {}
  if (!uni.getStorageSync?.(THEME_KEY)) {
    const sys = uni.getSystemInfoSync?.()
    if (sys?.theme === 'dark' || sys?.theme === 'light') {
      theme.value = sys.theme
    }
  }
  try {
    uni.setStorageSync(THEME_KEY, theme.value)
  } catch (e) {}
  bindSideEffects()
}

function setTheme(next) {
  theme.value = next === 'dark' ? 'dark' : 'light'
  try {
    uni.setStorageSync(THEME_KEY, theme.value)
  } catch (e) {}
}

function toggleTheme() {
  setTheme(theme.value === 'dark' ? 'light' : 'dark')
}

export function useTheme() {
  hydrateThemeOnce()
  const themeClass = computed(() => (theme.value === 'dark' ? 't-dark' : 't-light'))
  const isDark = computed(() => theme.value === 'dark')
  return {
    theme,
    themeClass,
    isDark,
    setTheme,
    toggleTheme,
  }
}
