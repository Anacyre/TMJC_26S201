import { computed } from 'vue'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { useUserStore } from '@/composables/useUserStore'

const ALIAS_KEY = 'login_alias_v1'

function isTestAccount(name) {
  if (!name) return false
  return String(name).trim().toLowerCase().startsWith('test')
}

function getAliasMap() {
  try {
    const raw = uni.getStorageSync(ALIAS_KEY)
    if (raw && typeof raw === 'object') return raw
  } catch (e) {}
  return {}
}

function setAliasMap(map) {
  try { uni.setStorageSync(ALIAS_KEY, map) } catch (e) {}
}

export function getQuickLoginAlias(userId) {
  return getAliasMap()[userId] || ''
}

export function setQuickLoginAlias(userId, alias) {
  const map = getAliasMap()
  const next = { ...map }
  if (!alias) {
    delete next[userId]
  } else {
    next[userId] = String(alias).trim()
  }
  setAliasMap(next)
}

export function resolveAliasToEmail(input) {
  const value = String(input || '').trim().toLowerCase()
  if (!value) return ''
  const map = getAliasMap()
  for (const [userId, alias] of Object.entries(map)) {
    if (String(alias).toLowerCase() === value) {
      try {
        const profiles = uni.getStorageSync('mock_backend_v1')?.authUsers || []
        const u = profiles.find((p) => p.id === userId)
        if (u?.email) return u.email
      } catch (e) {}
    }
  }
  return ''
}

export function useMemberStore() {
  const { members, fetchMembers, addCommunity } = useCommunityStore()
  const { currentUser } = useUserStore()

  const isAdmin = computed(() => currentUser.value.role === 'admin')

  const visibleMembers = computed(() => {
    if (isAdmin.value) return members.value
    return members.value.filter((m) => !isTestAccount(m.name))
  })

  return {
    members,
    visibleMembers,
    isAdmin,
    isTestAccount,
    fetchMembers,
    addCommunity,
  }
}
