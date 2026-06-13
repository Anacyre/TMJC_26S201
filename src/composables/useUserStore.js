import { ref } from 'vue'
import { getCurrentUser, hasActiveSession } from '@/api/auth'
import { updateProfile as apiUpdateProfile } from '@/api/profile'
import { isAdminMember } from '@/lib/classMembers'
import { resetAdminMode, syncAdminModeForUser } from '@/composables/adminModeState'

const currentUser = ref({
  id: '',
  username: '',
  name: '',
  display_name: '',
  role: 'student',
  is_admin: false,
  mbti: '',
  interests: '',
  bio: '',
  links: [],
  birthdayVisibility: 'Friends',
  avatar: '',
})

const EMPTY_USER = {
  id: '',
  username: '',
  name: '',
  display_name: '',
  role: 'student',
  is_admin: false,
  mbti: '',
  interests: '',
  bio: '',
  links: [],
  birthdayVisibility: 'Friends',
  avatar: '',
}

const loading = ref(false)

function resetCurrentUser() {
  currentUser.value = { ...EMPTY_USER }
  resetAdminMode()
}

/**
 * Load current user from Supabase
 */
async function fetchCurrentUser() {
  loading.value = true
  try {
    const { user, profile, error } = await getCurrentUser()
    if (error || !user) {
      const stillActive = await hasActiveSession()
      if (!stillActive || !currentUser.value.id) {
        resetCurrentUser()
      }
      return
    }

    currentUser.value = {
      id: user.id,
      username: profile?.username || '',
      name: profile?.display_name || profile?.name || user.user_metadata?.display_name || '',
      display_name: profile?.display_name || profile?.name || user.user_metadata?.display_name || '',
      role: profile?.role || 'student',
      is_admin: isAdminMember(profile),
      mbti: profile?.mbti || '',
      interests: profile?.interests || '',
      bio: profile?.bio || '',
      links: profile?.links || [],
      birthdayVisibility: profile?.birthday_visibility || 'Friends',
      avatar: profile?.avatar_url || '',
    }
    syncAdminModeForUser(currentUser.value)
  } finally {
    loading.value = false
  }
}

/**
 * Update profile and sync to Supabase
 */
async function updateProfile(payload) {
  // Optimistic local update
  Object.assign(currentUser.value, {
    name: payload.name ?? currentUser.value.name,
    mbti: payload.mbti ?? currentUser.value.mbti,
    interests: payload.interests ?? currentUser.value.interests,
    bio: payload.bio ?? currentUser.value.bio,
    links: payload.links ?? currentUser.value.links,
    birthdayVisibility: payload.birthdayVisibility ?? currentUser.value.birthdayVisibility,
    avatar: payload.avatarUrl ?? payload.avatar ?? currentUser.value.avatar,
  })

  if (currentUser.value.id) {
    const { error } = await apiUpdateProfile(currentUser.value.id, {
      ...payload,
      avatarUrl: payload.avatarUrl ?? payload.avatar,
    })
    if (error) console.error('[useUserStore] updateProfile error:', error.message)
  }
}

export function useUserStore() {
  return { currentUser, loading, fetchCurrentUser, updateProfile, resetCurrentUser }
}

export { currentUser }
