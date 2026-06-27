import { bootstrapData, resetBootstrap } from '@/composables/useBootstrap'
import { resetCalculatorSession } from '@/composables/useCalculatorSession'
import { hasActiveSession, logout } from '@/api/auth'
import { useUserStore } from '@/composables/useUserStore'
import { resetAdminMode } from '@/composables/adminModeState'
import { getCurrentPageRoute } from '@/lib/pageTransition'

const REMEMBER_KEY = 'auth_remember_v1'
const LOGIN_URL = '/pages/login/login'
const HOME_URL = '/pages/index/index'
const LOGIN_ROUTE = 'pages/login/login'

export function getRememberPref() {
  try {
    const raw = uni.getStorageSync(REMEMBER_KEY)
    if (raw && typeof raw === 'object') return raw
  } catch (e) {}
  return { enabled: false, account: '' }
}

/** Remember me only pre-fills the login account field — not session lifetime. */
export function setRememberPref({ enabled, account = '' } = {}) {
  try {
    if (enabled) {
      uni.setStorageSync(REMEMBER_KEY, { enabled: true, account: String(account || '').trim() })
    } else {
      uni.removeStorageSync(REMEMBER_KEY)
    }
  } catch (e) {}
}

/** Default ON when the user has never set a preference. */
export function loadRememberMeToggle() {
  try {
    const raw = uni.getStorageSync(REMEMBER_KEY)
    if (raw && typeof raw === 'object') return !!raw.enabled
  } catch (e) {}
  return true
}

export function loadRememberedAccount() {
  const pref = getRememberPref()
  return pref.enabled ? String(pref.account || '').trim() : ''
}

/** Restore in-memory app state from a persisted auth session (any login). */
export async function restoreActiveSession() {
  if (!(await hasActiveSession())) return false
  const { currentUser } = useUserStore()
  if (!currentUser.value.id) {
    await bootstrapData({ force: true })
  }
  return !!currentUser.value.id
}

/** @deprecated use restoreActiveSession */
export async function tryRestoreSession() {
  return restoreActiveSession()
}

/** Clear in-memory auth state only — does not touch Remember Me prefs. */
export function clearAuthSession() {
  resetAdminMode()
  resetCalculatorSession()
  const { resetCurrentUser } = useUserStore()
  resetCurrentUser()
  resetBootstrap()
}

export async function signOut() {
  try {
    await logout()
  } catch (e) {}
  clearAuthSession()
  uni.reLaunch({ url: LOGIN_URL, animationType: 'none', animationDuration: 0 })
}

export function goLogin() {
  uni.reLaunch({ url: LOGIN_URL, animationType: 'none', animationDuration: 0 })
}

/**
 * On cold start: send unauthenticated users to login.
 * Does not run on every foreground resume (avoids false logouts on minimize / screen off).
 */
export async function ensureAuthOnLaunch() {
  const route = getCurrentPageRoute()
  const onLoginPage = !route || route === LOGIN_ROUTE
  const active = await hasActiveSession()

  if (active) {
    await bootstrapData({ force: false })
    if (onLoginPage) {
      uni.reLaunch({ url: HOME_URL, animationType: 'none', animationDuration: 0 })
    }
    return
  }

  if (!onLoginPage) {
    uni.reLaunch({ url: LOGIN_URL, animationType: 'none', animationDuration: 0 })
  }
}

/**
 * On foreground resume: keep session, re-bootstrap if memory was cleared.
 * Only redirects to login when the persisted session is actually gone.
 */
export async function resumeAuthSession() {
  const active = await hasActiveSession()
  const { currentUser } = useUserStore()

  if (active) {
    if (!currentUser.value.id) {
      await bootstrapData({ force: true })
    }
    return
  }

  if (currentUser.value.id) {
    clearAuthSession()
  }

  const route = getCurrentPageRoute()
  if (route && route !== LOGIN_ROUTE) {
    uni.reLaunch({ url: LOGIN_URL, animationType: 'none', animationDuration: 0 })
  }
}
