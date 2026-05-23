import { supabase } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

const USE_MOCK = mock.USE_MOCK

// ─── Communities ────────────────────────────────────────────────

export async function fetchCommunities() {
  if (USE_MOCK) return mock.fetchCommunities()
  const { data, error } = await supabase
    .from('communities')
    .select('*')
    .order('name')
  return { data: data || [], error }
}

export async function createCommunity(payload) {
  if (USE_MOCK) return mock.createCommunity(payload)
  const { data, error } = await supabase
    .from('communities')
    .insert({
      icon: payload.icon || '◉',
      name: payload.name,
      desc: payload.desc || '',
    })
    .select()
    .single()
  return { data, error }
}

// ─── Posts ──────────────────────────────────────────────────────

/**
 * 将数据库行映射为前端 Post 对象
 */
function rowToPost(row) {
  return {
    id: row.id,
    communityId: row.community_id,
    communityName: row.communities?.name || '',
    title: row.title,
    content: row.content || '',
    author: row.anonymous ? 'Anonymous' : (row.profiles?.name || 'Unknown'),
    authorId: row.anonymous ? null : row.user_id,
    anonymous: row.anonymous || false,
    likesCount: row.likes_count || 0,
    commentsCount: row.comments_count || 0,
    image: row.image || '',
    liked: row.liked || false,
    createdAt: row.created_at,
  }
}

/**
 * 获取帖子列表
 * @param {{ communityId?: string, sort?: 'hot'|'new'|'top' }} options
 */
export async function fetchPosts(options = {}) {
  if (USE_MOCK) return mock.fetchPosts(options)
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('posts')
    .select(`
      *,
      communities ( name ),
      profiles ( name )
    `)

  if (options.communityId) query = query.eq('community_id', options.communityId)

  if (options.sort === 'hot') {
    query = query.order('likes_count', { ascending: false })
  } else if (options.sort === 'top') {
    query = query.order('comments_count', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) return { data: [], error }

  // 查询当前用户的点赞状态
  let likedSet = new Set()
  if (user && data.length > 0) {
    const postIds = data.map((p) => p.id)
    const { data: likes } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', postIds)
    if (likes) likes.forEach((l) => likedSet.add(l.post_id))
  }

  return {
    data: data.map((row) => rowToPost({ ...row, liked: likedSet.has(row.id) })),
    error: null,
  }
}

/**
 * 创建帖子
 */
export async function createPost(payload) {
  if (USE_MOCK) return mock.createPost(payload)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('未登录') }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      community_id: payload.communityId,
      user_id: user.id,
      title: payload.title,
      content: payload.content || '',
      anonymous: payload.anonymous || false,
      image: payload.image || '',
      likes_count: 0,
      comments_count: 0,
    })
    .select(`*, communities(name), profiles(name)`)
    .single()

  return { data: data ? rowToPost(data) : null, error }
}

/**
 * 切换点赞帖子（数据库端原子操作，避免并发竞态）
 */
export async function togglePostLike(postId, currentLiked, currentCount) {
  if (USE_MOCK) return mock.togglePostLike(postId, currentLiked, currentCount)
  const { data, error } = await supabase.rpc('toggle_post_like', { p_post_id: postId })
  if (error) return { error }
  const row = Array.isArray(data) ? data[0] : data
  return { liked: !!row?.liked, likesCount: row?.likes_count ?? currentCount, error: null }
}

// ─── Comments ───────────────────────────────────────────────────

function rowToComment(row) {
  return {
    id: row.id,
    postId: row.post_id,
    author: row.anonymous ? 'Anonymous' : (row.profiles?.name || 'Unknown'),
    authorId: row.anonymous ? null : row.user_id,
    anonymous: row.anonymous || false,
    text: row.text,
    createdAt: row.created_at,
  }
}

/**
 * 获取帖子评论
 */
export async function fetchComments(postId) {
  if (USE_MOCK) return mock.fetchComments(postId)
  const { data, error } = await supabase
    .from('comments')
    .select(`*, profiles(name)`)
    .eq('post_id', postId)
    .order('created_at', { ascending: false })

  return { data: error ? [] : data.map(rowToComment), error }
}

/**
 * 发表评论
 */
export async function addComment(postId, text, anonymous = false) {
  if (USE_MOCK) return mock.addComment(postId, text, anonymous)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('未登录') }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: user.id,
      text: text.trim(),
      anonymous,
    })
    .select(`*, profiles(name)`)
    .single()

  return { data: data ? rowToComment(data) : null, error }
}
