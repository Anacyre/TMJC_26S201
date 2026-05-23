import { supabase } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

const USE_MOCK = mock.USE_MOCK

/**
 * 用户登录
 * @param {string} email
 * @param {string} password
 * @returns {{ data, error }}
 */
export async function login(email, password) {
  if (USE_MOCK) return mock.login(email, password)
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  return { data, error }
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
    .single()

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
 * 监听登录状态变化
 * @param {Function} callback - (session) => void
 */
export function onAuthStateChange(callback) {
  if (USE_MOCK) return mock.onAuthStateChange(callback)
  return supabase.auth.onAuthStateChange((_event, session) => {
    callback(session)
  })
}
