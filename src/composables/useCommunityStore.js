import { computed, ref, shallowRef } from 'vue'
import * as communityApi from '@/api/community'
import { getMembers, getProfile } from '@/api/profile'
import { filterMaterialPosts, isMaterialPost, sortCommunitiesWithPinned } from '@/lib/communityMaterials'

const communities = ref([])
const members = shallowRef([])
const posts = shallowRef([])
const commentsByPost = ref({})
const loading = ref(false)
let _postsLoaded = false

// ─── Data fetch ────────────────────────────────────────────────────

async function fetchCommunities() {
  const { data, error } = await communityApi.fetchCommunities()
  if (!error) communities.value = data
}

async function fetchMembers() {
  const { data, error } = await getMembers()
  if (!error && data) {
    members.value = data.map((p) => ({
      id: p.id,
      username: p.username || '',
      display_name: p.display_name || p.name || '',
      name: p.display_name || p.name || '',
      birthday: p.birthday || '',
      mbti: p.mbti || '',
      interests: p.interests || '',
      bio: p.bio || '',
      links: p.links || [],
      role: p.role || 'student',
      is_admin: !!p.is_admin,
      email: p.email || '',
      avatar: p.avatar_url || '',
    }))
  }
}

async function fetchPosts(options = {}) {
  loading.value = true
  try {
    const { data, error } = await communityApi.fetchPosts(options)
    if (!error) {
      posts.value = data
      _postsLoaded = true
    } else console.error('[useCommunityStore] fetchPosts:', error.message)
  } finally {
    loading.value = false
  }
}

async function ensurePostsLoaded() {
  if (_postsLoaded) return
  await fetchPosts()
}

async function fetchComments(postId, { force = false } = {}) {
  if (!postId) return
  if (!force && commentsByPost.value[postId]?.length) return
  const { data, error } = await communityApi.fetchComments(postId)
  if (!error) commentsByPost.value[postId] = data
}

export function resetCommunityPostsCache() {
  _postsLoaded = false
}

export { members, fetchMembers, addCommunity, communities }

// ─── Indexes ───────────────────────────────────────────────────────

const postsByCommunityMap = computed(() => {
  const map = new Map()
  for (const p of posts.value) {
    const key = String(p.communityId || '')
    if (!map.has(key)) map.set(key, [])
    map.get(key).push(p)
  }
  return map
})

const regularPostCountByCommunity = computed(() => {
  const map = new Map()
  for (const p of posts.value) {
    if (isMaterialPost(p)) continue
    const key = String(p.communityId || '')
    map.set(key, (map.get(key) || 0) + 1)
  }
  return map
})

const materialPostCountByCommunity = computed(() => {
  const map = new Map()
  for (const p of posts.value) {
    if (!isMaterialPost(p)) continue
    const key = String(p.communityId || '')
    map.set(key, (map.get(key) || 0) + 1)
  }
  return map
})

const membersById = computed(() => {
  const map = new Map()
  for (const m of members.value) map.set(m.id, m)
  return map
})

const communitiesById = computed(() => {
  const map = new Map()
  for (const c of communities.value) map.set(c.id, c)
  return map
})

const postsById = computed(() => {
  const map = new Map()
  for (const p of posts.value) map.set(p.id, p)
  return map
})

// ─── Read helpers ────────────────────────────────────────────────────

function getCommunityById(id) {
  return communitiesById.value.get(id) || null
}

function getMemberById(id) {
  return membersById.value.get(id) || members.value[0] || null
}

function getPostById(id) {
  return postsById.value.get(id) || posts.value[0] || null
}

function getPostsByCommunity(communityId) {
  return postsByCommunityMap.value.get(String(communityId || '')) || []
}

function getRegularPostCount(communityId) {
  return regularPostCountByCommunity.value.get(String(communityId || '')) || 0
}

function getMaterialPostCount(communityId) {
  return materialPostCountByCommunity.value.get(String(communityId || '')) || 0
}

function getComments(postId) {
  return commentsByPost.value[postId] || []
}

// ─── Writes ──────────────────────────────────────────────────────

function communityIdMatch(a, b) {
  return String(a || '') === String(b || '')
}

function applyCommunityRow(id, row, payload = {}) {
  const key = String(id || row?.id || '')
  if (!key || !row) return null

  const idx = communities.value.findIndex((c) => communityIdMatch(c.id, key))
  const prev = idx >= 0 ? communities.value[idx] : null
  const merged = {
    ...(prev || {}),
    ...row,
    id: row.id || prev?.id || key,
    createdByName: row.createdByName || prev?.createdByName || '',
  }

  const next = [...communities.value]
  if (idx >= 0) next[idx] = merged
  else next.push(merged)
  communities.value = next

  if (payload.name !== undefined) {
    const name = merged.name
    posts.value = posts.value.map((p) =>
      communityIdMatch(p.communityId, key) ? { ...p, communityName: name } : p
    )
  }

  return merged
}

async function addComment(postId, text, anonymous = false) {
  const { data, error } = await communityApi.addComment(postId, text, anonymous)
  if (!error && data) {
    if (!commentsByPost.value[postId]) commentsByPost.value[postId] = []
    commentsByPost.value[postId].unshift(data)
    const idx = posts.value.findIndex((p) => p.id === postId)
    if (idx >= 0) {
      const post = posts.value[idx]
      const next = [...posts.value]
      next[idx] = { ...post, commentsCount: (post.commentsCount || 0) + 1 }
      posts.value = next
    }
  }
}

async function addCommunity(payload) {
  const { data, error } = await communityApi.createCommunity(payload)
  if (error) return { data: null, error }
  if (data) communities.value.unshift(data)
  return { data, error: null }
}

async function updateCommunity(id, payload) {
  const { data, error } = await communityApi.updateCommunity(id, payload)
  if (error) return { data: null, error }
  const merged = data ? applyCommunityRow(id, data, payload) : null
  if (!merged && !error) {
    await fetchCommunities()
    return {
      data: getCommunityById(id),
      error: null,
    }
  }
  return { data: merged, error: null }
}

async function addPost(payload) {
  const { data, error } = await communityApi.createPost(payload)
  if (error) return { data: null, error }
  if (data) posts.value.unshift(data)
  return { data, error: null }
}

async function togglePostLike(postId) {
  const idx = posts.value.findIndex((p) => p.id === postId)
  if (idx < 0) return
  const post = posts.value[idx]
  const { liked, likesCount, error } = await communityApi.togglePostLike(
    postId, post.liked, post.likesCount
  )
  if (!error) {
    const next = [...posts.value]
    next[idx] = { ...post, liked, likesCount }
    posts.value = next
  }
}

async function deletePost(postId) {
  const { error } = await communityApi.deletePost(postId)
  if (error) return { error }
  const idx = posts.value.findIndex((p) => p.id === postId)
  if (idx >= 0) posts.value = posts.value.filter((p) => p.id !== postId)
  if (commentsByPost.value[postId]) {
    const next = { ...commentsByPost.value }
    delete next[postId]
    commentsByPost.value = next
  }
  return { error: null }
}

// ─── Computed ────────────────────────────────────────────────────

const regularPosts = computed(() => posts.value.filter((p) => !isMaterialPost(p)))

const hotPosts = computed(() =>
  [...regularPosts.value].sort((a, b) => b.likesCount - a.likesCount)
)
const newPosts = regularPosts
const topPosts = computed(() =>
  [...regularPosts.value].sort((a, b) => b.commentsCount - a.commentsCount)
)
const materialPosts = computed(() => filterMaterialPosts(posts.value))
const totalMaterialCount = computed(() => {
  let count = 0
  for (const p of posts.value) {
    if (isMaterialPost(p)) count += 1
  }
  return count
})
const sortedCommunities = computed(() => sortCommunitiesWithPinned(communities.value))

export function useCommunityStore() {
  return {
    communities,
    members,
    posts,
    loading,
    hotPosts,
    newPosts,
    topPosts,
    materialPosts,
    totalMaterialCount,
    sortedCommunities,
    fetchCommunities,
    fetchMembers,
    fetchPosts,
    ensurePostsLoaded,
    fetchComments,
    getCommunityById,
    getMemberById,
    getPostById,
    getPostsByCommunity,
    getRegularPostCount,
    getMaterialPostCount,
    getComments,
    addComment,
    addCommunity,
    updateCommunity,
    addPost,
    togglePostLike,
    deletePost,
  }
}
