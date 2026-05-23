import { supabase } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'
import { authLoginEmail } from '@/lib/classMembers'

const USE_MOCK = mock.USE_MOCK

export { hasStoredSession } from '@/lib/mockBackend'

export async function hasActiveSession() {
  if (USE_MOCK) return mock.hasStoredSession()
  const { data: { session } } = await supabase.auth.getSession()
  return !!session?.user
}

export function resolveAccountToEmail(input) {
  if (USE_MOCK) return mock.resolveAccountToEmail(input)
  return ''
}

export async function resolveAccountToEmailAsync(input) {
  if (USE_MOCK) return mock.resolveAccountToEmail(input)
  const trimmed = String(input || '').trim().toLowerCase()
  if (!trimmed) return ''
  if (trimmed.includes('@')) return trimmed

  const { data } = await supabase
    .from('profiles')
    .select('username, role')
    .ilike('username', trimmed)
    .maybeSingle()
  if (data?.username) return authLoginEmail(data.username, data.role || 'student')

  const { data: byName } = await supabase
    .from('profiles')
    .select('username, role')
    .ilike('display_name', trimmed)
    .maybeSingle()
  if (byName?.username) return authLoginEmail(byName.username, byName.role || 'student')

  return authLoginEmail(trimmed, 'student')
}

/**
 * 用户登录
 * @param {string} email
 * @param {string} password
 * @returns {{ data, error }}
 */
export async function login(email, password) {
  if (USE_MOCK) return mock.login(email, password)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) return { data, error }

  const { data: profile } = await supabase
    .from('profiles')
    .select('must_change_password')
    .eq('id', data.user.id)
    .maybeSingle()

  const mustChangePassword =
    profile?.must_change_password === true ||
    data.user?.app_metadata?.must_change_password === true

  return { data: { ...data, mustChangePassword }, error: null }
}

/**
 * 用户注册
 * @param {string} email
 * @param {string} password
 * @param {string} displayName
 * @returns {{ data, error }}
 */
export async function register(email, password, displayName) {
  if (USE_MOCK) return mock.register(email, password, displayName)
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName },
    },
  })
  return { data, error }
}

/**
 * 退出登录
 */
export async function logout() {
  if (USE_MOCK) return mock.logout()
  const { error } = await supabase.auth.signOut()
  return { error }
}

/**
 * 获取当前登录用户（含 profile）
 * @returns {{ user, profile, error }}
 */
export async function getCurrentUser() {
  if (USE_MOCK) return mock.getCurrentUser()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return { user: null, profile: null, error: authError }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  return { user, profile, error: profileError }
}

/**
 * 忘记密码（发送重置邮件）
 * @param {string} email
 */
export async function forgotPassword(email) {
  if (USE_MOCK) return mock.forgotPassword(email)
  const { error } = await supabase.auth.resetPasswordForEmail(email)
  return { error }
}

/**
 * Change password (mock: admin-created accounts)
 */
export async function changePassword(newPassword) {
  if (USE_MOCK) {
    const { user } = await mock.getCurrentUser()
    if (!user?.id) return { error: new Error('Not signed in') }
    return mock.changePassword(user.id, newPassword)
  }
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return { error: userError || new Error('Not signed in') }

  const { error } = await supabase.auth.updateUser({ password: newPassword })
  if (error) return { error }

  await supabase
    .from('profiles')
    .update({ must_change_password: false })
    .eq('id', user.id)

  return { error: null }
}

/**
 * 监听登录状态变化
 * @param {Function} callback - (session) => void
 */
export function onAuthStateChange(callback) {
  if (USE_MOCK) return mock.onAuthStateChange(callback)
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
}
