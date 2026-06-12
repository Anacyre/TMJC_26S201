import { computed, ref } from 'vue'
import * as communityApi from '@/api/community'
import { getMembers, getProfile } from '@/api/profile'

const communities = ref([])
const members = ref([])
const posts = ref([])
const commentsByPost = ref({})
const loading = ref(false)

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
    if (!error) posts.value = data
    else console.error('[useCommunityStore] fetchPosts:', error.message)
  } finally {
    loading.value = false
  }
}

async function fetchComments(postId) {
  const { data, error } = await communityApi.fetchComments(postId)
  if (!error) commentsByPost.value[postId] = data
}

// ─── Read helpers ────────────────────────────────────────────────────

function getCommunityById(id) {
  return communities.value.find((x) => x.id === id) || null
}

function getMemberById(id) {
  return members.value.find((x) => x.id === id) || members.value[0]
}

function getPostById(id) {
  return posts.value.find((x) => x.id === id) || posts.value[0]
}

function getPostsByCommunity(communityId) {
  return posts.value.filter((x) => x.communityId === communityId)
}

function getComments(postId) {
  return commentsByPost.value[postId] || []
}

// ─── Writes ──────────────────────────────────────────────────────

async function addComment(postId, text, anonymous = false) {
  const { data, error } = await communityApi.addComment(postId, text, anonymous)
  if (!error && data) {
    if (!commentsByPost.value[postId]) commentsByPost.value[postId] = []
    commentsByPost.value[postId].unshift(data)
    // Update post comment count
    const idx = posts.value.findIndex((p) => p.id === postId)
    if (idx >= 0) posts.value[idx].commentsCount = (posts.value[idx].commentsCount || 0) + 1
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
  if (data) {
    const idx = communities.value.findIndex((c) => c.id === id)
    if (idx >= 0) {
      const next = [...communities.value]
      next[idx] = data
      communities.value = next
    }
  }
  return { data, error: null }
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
    posts.value[idx] = { ...post, liked, likesCount }
  }
}

async function deletePost(postId) {
  const { error } = await communityApi.deletePost(postId)
  if (error) return { error }
  const idx = posts.value.findIndex((p) => p.id === postId)
  if (idx >= 0) posts.value.splice(idx, 1)
  if (commentsByPost.value[postId]) {
    const next = { ...commentsByPost.value }
    delete next[postId]
    commentsByPost.value = next
  }
  return { error: null }
}

// ─── Computed ────────────────────────────────────────────────────

const hotPosts = computed(() => [...posts.value].sort((a, b) => b.likesCount - a.likesCount))
const newPosts = computed(() => posts.value)
const topPosts = computed(() => [...posts.value].sort((a, b) => b.commentsCount - a.commentsCount))

export function useCommunityStore() {
  return {
    communities,
    members,
    posts,
    loading,
    hotPosts,
    newPosts,
    topPosts,
    fetchCommunities,
    fetchMembers,
    fetchPosts,
    fetchComments,
    getCommunityById,
    getMemberById,
    getPostById,
    getPostsByCommunity,
    getComments,
    addComment,
    addCommunity,
    updateCommunity,
    addPost,
    togglePostLike,
    deletePost,
  }
}
