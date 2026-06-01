import { supabase } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'
import { isAdminMember, mergeProfilesWithClassRoster } from '@/lib/classMembers'

const USE_MOCK = mock.USE_MOCK

async function requireAdminCaller() {
  if (USE_MOCK) {
    const { error } = await mock.requireAdminCaller()
    return error
  }
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return new Error('Not signed in')
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, is_admin')
    .eq('id', user.id)
    .maybeSingle()
  if (error) return error
  if (!isAdminMember(profile)) return new Error('Admins only')
  return null
}

/**
 * Fetch a user's profile
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
 * Fetch all class members
 */
export async function getMembers() {
  if (USE_MOCK) return mock.getMembers()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, name, birthday, email, role, is_admin, mbti, interests, bio, links, avatar_url')
    .order('display_name')
  if (error) return { data, error }
  return { data: mergeProfilesWithClassRoster(data || []), error: null }
}

/**
 * Update the current user's profile
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
  const denied = await requireAdminCaller()
  if (denied) return { data: null, error: denied }
  const { data, error } = await supabase.functions.invoke('admin-add-member', { body: payload })
  if (error) return { data: null, error }
  if (data?.error) return { data: null, error: new Error(data.error) }
  return { data: data?.data ?? data, error: null }
}

export async function adminSetRole(userId, role) {
  if (USE_MOCK) return mock.adminSetRole(userId, role)
  const denied = await requireAdminCaller()
  if (denied) return { data: null, error: denied }
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
