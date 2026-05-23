import { ref } from 'vue'
import { getCurrentUser } from '@/api/auth'
import { updateProfile as apiUpdateProfile } from '@/api/profile'

const currentUser = ref({
  id: '',
  name: '',
  role: 'member',
  mbti: '',
  interests: '',
  bio: '',
  links: [],
  birthdayVisibility: 'Friends',
  avatar: '',
})

const loading = ref(false)

/**
 * 从 Supabase 加载当前用户信息
 */
async function fetchCurrentUser() {
  loading.value = true
  try {
    const { user, profile, error } = await getCurrentUser()
    if (error || !user) return

    currentUser.value = {
      id: user.id,
      name: profile?.name || user.user_metadata?.display_name || '',
      role: profile?.role || 'member',
      mbti: profile?.mbti || '',
      interests: profile?.interests || '',
      bio: profile?.bio || '',
      links: profile?.links || [],
      birthdayVisibility: profile?.birthday_visibility || 'Friends',
      avatar: profile?.avatar_url || '',
    }
  } finally {
    loading.value = false
  }
}

/**
 * 更新用户资料并同步到 Supabase
 */
async function updateProfile(payload) {
  // 乐观更新本地状态
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
  return { currentUser, loading, fetchCurrentUser, updateProfile }
}
