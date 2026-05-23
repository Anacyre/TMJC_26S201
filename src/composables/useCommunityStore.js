import { computed, ref } from 'vue'
import * as communityApi from '@/api/community'
import { getMembers, getProfile } from '@/api/profile'

const communities = ref([])
const members = ref([])
const posts = ref([])
const commentsByPost = ref({})
const loading = ref(false)

// ─── 数据获取 ────────────────────────────────────────────────────

async function fetchCommunities() {
  const { data, error } = await communityApi.fetchCommunities()
  if (!error) communities.value = data
}

async function fetchMembers() {
  const { data, error } = await getMembers()
  if (!error && data) {
    members.value = data.map((p) => ({
      id: p.id,
      name: p.name,
      mbti: p.mbti || '',
      interests: p.interests || '',
      bio: p.bio || '',
      links: p.links || [],
      role: p.role || 'member',
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

// ─── 读取工具 ────────────────────────────────────────────────────

function getCommunityById(id) {
  return communities.value.find((x) => x.id === id) || communities.value[0]
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

// ─── 写操作 ──────────────────────────────────────────────────────

async function addComment(postId, text, anonymous = false) {
  const { data, error } = await communityApi.addComment(postId, text, anonymous)
  if (!error && data) {
    if (!commentsByPost.value[postId]) commentsByPost.value[postId] = []
    commentsByPost.value[postId].unshift(data)
    // 更新帖子评论数
    const idx = posts.value.findIndex((p) => p.id === postId)
    if (idx >= 0) posts.value[idx].commentsCount = (posts.value[idx].commentsCount || 0) + 1
  }
}

async function addCommunity(payload) {
  const { data, error } = await communityApi.createCommunity(payload)
  if (!error && data) communities.value.unshift(data)
}

async function addPost(payload) {
  const { data, error } = await communityApi.createPost(payload)
  if (!error && data) {
    posts.value.unshift(data)
    return data
  }
  return null
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

// ─── 计算属性 ────────────────────────────────────────────────────

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
    addPost,
    togglePostLike,
  }
}
