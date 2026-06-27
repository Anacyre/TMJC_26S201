import { supabase } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'
import { isAdminMember } from '@/lib/classMembers'

const USE_MOCK = mock.USE_MOCK

// ─── Communities ────────────────────────────────────────────────

export async function fetchCommunities() {
  if (USE_MOCK) return mock.fetchCommunities()
  const { data, error } = await supabase
    .from('communities')
    .select('*')
    .order('is_pinned', { ascending: false })
    .order('pinned_at', { ascending: false, nullsFirst: false })
    .order('name')
  return {
    data: error ? [] : (data || []).map(rowToCommunity),
    error,
  }
}

export async function createCommunity(payload) {
  if (USE_MOCK) return mock.createCommunity(payload)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Not signed in') }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) return { data: null, error: profileError }
  if (!isAdminMember(profile)) return { data: null, error: new Error('Admins only') }

  const { data, error } = await supabase
    .from('communities')
    .insert({
      icon: payload.icon || '◉',
      name: payload.name,
      desc: payload.desc || '',
      created_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single()
  return { data: data ? rowToCommunity(data) : null, error }
}

export async function updateCommunity(id, payload) {
  if (USE_MOCK) return mock.updateCommunity(id, payload)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Not signed in') }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, is_admin')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) return { data: null, error: profileError }
  if (!isAdminMember(profile)) return { data: null, error: new Error('Admins only') }

  const patch = {}
  if (payload.name !== undefined) patch.name = String(payload.name).trim()
  if (payload.desc !== undefined) patch.desc = String(payload.desc).trim()
  if (payload.icon !== undefined) patch.icon = String(payload.icon).trim() || '◉'
  if (payload.pinned !== undefined) {
    patch.is_pinned = !!payload.pinned
    patch.pinned_at = payload.pinned ? new Date().toISOString() : null
  }
  patch.updated_at = new Date().toISOString()

  const { data, error } = await supabase
    .from('communities')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    if (error.code === '23505') {
      return { data: null, error: new Error('A space with this name already exists') }
    }
    return { data: null, error }
  }

  return { data: data ? rowToCommunity(data) : null, error: null }
}

function rowToCommunity(row) {
  const creator = row.profiles || row.creator || null
  const creatorName =
    creator?.display_name ||
    creator?.name ||
    row.created_by_name ||
    ''
  return {
    id: row.id,
    icon: row.icon || '◉',
    name: row.name || '',
    desc: row.desc || '',
    createdBy: row.created_by || '',
    createdByName: creatorName,
    createdAt: row.created_at || '',
    updatedAt: row.updated_at || row.created_at || '',
    pinned: !!row.is_pinned,
    pinnedAt: row.pinned_at || '',
  }
}

// ─── Posts ──────────────────────────────────────────────────────

/**
 * Map a database row to a frontend Post object
 */
function rowToPost(row) {
  return {
    id: row.id,
    communityId: row.community_id,
    communityName: row.communities?.name || '',
    title: row.title,
    content: row.content || '',
    author: row.anonymous ? 'Anonymous' : (row.profiles?.name || 'Unknown'),
    authorId: row.user_id || null,
    anonymous: row.anonymous || false,
    likesCount: row.likes_count || 0,
    commentsCount: row.comments_count || 0,
    image: row.image || '',
    attachment: row.attachment || '',
    attachmentUrl: row.attachment_url || '',
    fileKey: row.file_key || '',
    liked: row.liked || false,
    postType: row.post_type || 'regular',
    fileSize: row.file_size || 0,
    createdAt: row.created_at,
  }
}

/**
 * Fetch posts
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
  if (options.postType) query = query.eq('post_type', options.postType)

  if (options.sort === 'hot') {
    query = query.order('likes_count', { ascending: false })
  } else if (options.sort === 'top') {
    query = query.order('comments_count', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) return { data: [], error }

  // Fetch current user's like state
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
 * Create a post
 */
async function hydratePostRow(row, userId) {
  if (!row) return null
  let authorName = 'Unknown'
  const { data: prof } = await supabase
    .from('profiles')
    .select('name, display_name')
    .eq('id', userId)
    .maybeSingle()
  if (prof) authorName = prof.display_name || prof.name || authorName

  let communityName = ''
  if (row.community_id) {
    const { data: comm } = await supabase
      .from('communities')
      .select('name')
      .eq('id', row.community_id)
      .maybeSingle()
    communityName = comm?.name || ''
  }

  return rowToPost({
    ...row,
    profiles: { name: authorName },
    communities: { name: communityName },
  })
}

export async function createPost(payload) {
  if (USE_MOCK) return mock.createPost(payload)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Not signed in') }
  if (!payload.communityId) return { data: null, error: new Error('Missing community') }

  const { data, error } = await supabase
    .from('posts')
    .insert({
      community_id: payload.communityId,
      user_id: user.id,
      title: payload.title,
      content: payload.content || payload.title || '',
      anonymous: payload.anonymous || false,
      image: payload.image || '',
      attachment: payload.attachment || '',
      attachment_url: payload.attachmentUrl || '',
      file_key: payload.fileKey || '',
      post_type: payload.postType || 'regular',
      file_size: payload.fileSize || 0,
      likes_count: 0,
      comments_count: 0,
    })
    .select('*')
    .single()

  if (error) return { data: null, error }
  return { data: await hydratePostRow(data, user.id), error: null }
}

/**
 * Delete a post (author or admin; RLS enforced)
 */
export async function deletePost(postId) {
  if (USE_MOCK) return mock.deletePost(postId)
  const { data: row, error: fetchError } = await supabase
    .from('posts')
    .select('id, file_key')
    .eq('id', postId)
    .maybeSingle()
  if (fetchError) return { error: fetchError }
  if (!row) return { error: new Error('Post not found') }

  const { error } = await supabase.from('posts').delete().eq('id', postId)
  if (error) return { error }

  if (row.file_key) {
    await supabase.storage.from('class-os-files').remove([row.file_key])
  }
  return { error: null }
}

/**
 * Toggle post like (atomic on the database)
 */
export async function togglePostLike(postId, currentLiked, currentCount) {
  if (USE_MOCK) return mock.togglePostLike(postId, currentLiked, currentCount)
  const { data, error } = await supabase.rpc('toggle_post_like', { p_post_id: postId })
  if (error) return { error }
  const row = Array.isArray(data) ? data[0] : data
  return { liked: !!row?.liked, likesCount: row?.likes_count ?? currentCount, error: null }
}

// ─── Comments ───────────────────────────────────────────────────

function rowToComment(row, authorName = 'Unknown') {
  return {
    id: row.id,
    postId: row.post_id,
    author: row.anonymous ? 'Anonymous' : authorName,
    authorId: row.user_id || null,
    anonymous: row.anonymous || false,
    text: row.text,
    createdAt: row.created_at,
  }
}

async function hydrateCommentRows(rows = []) {
  if (!rows.length) return []
  const userIds = [...new Set(rows.map((row) => row.user_id).filter(Boolean))]
  const nameById = new Map()
  if (userIds.length) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name, display_name')
      .in('id', userIds)
    for (const profile of profiles || []) {
      nameById.set(profile.id, profile.display_name || profile.name || 'Unknown')
    }
  }
  return rows.map((row) => rowToComment(row, nameById.get(row.user_id) || 'Unknown'))
}

/**
 * Fetch post comments
 */
export async function fetchComments(postId) {
  if (USE_MOCK) return mock.fetchComments(postId)
  const { data, error } = await supabase
    .from('comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: false })

  if (error) return { data: [], error }
  return { data: await hydrateCommentRows(data || []), error: null }
}

/**
 * Add a comment
 */
export async function addComment(postId, text, anonymous = false) {
  if (USE_MOCK) return mock.addComment(postId, text, anonymous)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Not signed in') }

  const { data, error } = await supabase
    .from('comments')
    .insert({
      post_id: postId,
      user_id: user.id,
      text: text.trim(),
      anonymous,
    })
    .select('*')
    .single()

  if (error) return { data: null, error }
  const [comment] = await hydrateCommentRows(data ? [data] : [])
  return { data: comment || null, error: null }
}
