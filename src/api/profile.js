import { supabase } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

const USE_MOCK = mock.USE_MOCK

/**
 * 获取指定用户的 profile
 * @param {string} userId
 */
export async function getProfile(userId) {
  if (USE_MOCK) return mock.getProfile(userId)
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

/**
 * 获取全班成员列表
 */
export async function getMembers() {
  if (USE_MOCK) return mock.getMembers()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, name, birthday, email, role, is_admin, mbti, interests, bio, links, avatar_url')
    .order('display_name')
  return { data, error }
}

/**
 * 更新当前用户的 profile
 * @param {string} userId
 * @param {object} payload - { name, mbti, interests, bio, links, birthdayVisibility, avatarUrl }
 */
export async function updateProfile(userId, payload) {
  if (USE_MOCK) return mock.updateProfile(userId, payload)
  const { data, error } = await supabase
    .from('profiles')
    .update({
      name: payload.name,
      mbti: payload.mbti,
      interests: payload.interests,
      bio: payload.bio,
      links: payload.links,
      birthday_visibility: payload.birthdayVisibility,
      avatar_url: payload.avatarUrl ?? payload.avatar ?? '',
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()
  return { data, error }
}

export async function adminAddMember(payload) {
  if (USE_MOCK) return mock.adminAddMember(payload)
  const { data, error } = await supabase.functions.invoke('admin-add-member', { body: payload })
  if (error) return { data: null, error }
  if (data?.error) return { data: null, error: new Error(data.error) }
  return { data: data?.data ?? data, error: null }
}

export async function adminSetRole(userId, role) {
  if (USE_MOCK) return mock.adminSetRole(userId, role)
  const isAdmin = role === 'admin' || role === 'teacher_admin'
  const nextRole = isAdmin ? role : 'student'
  const { data, error } = await supabase
    .from('profiles')
    .update({ role: nextRole, is_admin: isAdmin })
    .eq('id', userId)
    .select()
    .single()
  return { data, error }
}
