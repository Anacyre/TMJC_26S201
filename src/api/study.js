import { supabase } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

const USE_MOCK = mock.USE_MOCK

// ─── Subjects ───────────────────────────────────────────────────

export async function fetchSubjects() {
  if (USE_MOCK) return mock.fetchSubjects()
  const { data, error } = await supabase
    .from('subjects')
    .select('*, resources(count)')
    .order('name')

  const mapped = (data || []).map((row) => ({
    id: row.id,
    icon: row.icon || '',
    name: row.name,
    filesCount: row.resources?.[0]?.count ?? 0,
    updatedAt: row.updated_at,
  }))

  return { data: mapped, error }
}

// ─── Resources ──────────────────────────────────────────────────

function rowToResource(row, likedSet = new Set()) {
  return {
    id: row.id,
    subjectId: row.subject_id,
    subjectName: row.subjects?.name || '',
    type: row.type || 'PDF',
    title: row.title,
    uploaderId: row.user_id,
    uploaderName: row.profiles?.name || 'Unknown',
    downloadsCount: row.downloads_count || 0,
    likesCount: row.likes_count || 0,
    liked: likedSet.has(row.id),
    fileUrl: row.file_url || '',
    fileKey: row.file_key || '',
    fileSize: row.file_size || 0,
    createdAt: row.created_at,
  }
}

/**
 * 获取所有资源（支持按科目筛选、排序）
 * @param {{ subjectId?: string, sort?: 'latest'|'downloads'|'likes' }} options
 */
export async function fetchResources(options = {}) {
  if (USE_MOCK) return mock.fetchResources(options)
  const { data: { user } } = await supabase.auth.getUser()

  let query = supabase
    .from('resources')
    .select(`*, subjects(name), profiles(name)`)

  if (options.subjectId) query = query.eq('subject_id', options.subjectId)

  if (options.sort === 'downloads') {
    query = query.order('downloads_count', { ascending: false })
  } else if (options.sort === 'likes') {
    query = query.order('likes_count', { ascending: false })
  } else {
    query = query.order('created_at', { ascending: false })
  }

  const { data, error } = await query
  if (error) return { data: [], error }

  let likedSet = new Set()
  if (user && data.length > 0) {
    const ids = data.map((r) => r.id)
    const { data: likes } = await supabase
      .from('resource_likes')
      .select('resource_id')
      .eq('user_id', user.id)
      .in('resource_id', ids)
    if (likes) likes.forEach((l) => likedSet.add(l.resource_id))
  }

  return { data: data.map((row) => rowToResource(row, likedSet)), error: null }
}

/**
 * 上传学习资源（先通过 upload.js 上传文件，再调此接口）
 */
export async function createResource(payload) {
  if (USE_MOCK) return mock.createResource(payload)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('未登录') }

  const { data, error } = await supabase
    .from('resources')
    .insert({
      subject_id: payload.subjectId,
      user_id: user.id,
      type: payload.type || 'PDF',
      title: payload.title,
      file_key: payload.fileKey || '',
      file_url: payload.fileUrl || '',
      file_size: payload.fileSize || 0,
      downloads_count: 0,
      likes_count: 0,
    })
    .select(`*, subjects(name), profiles(name)`)
    .single()

  return { data: data ? rowToResource(data) : null, error }
}

/**
 * 切换点赞资源（数据库端原子操作）
 */
export async function toggleResourceLike(resourceId, currentLiked, currentCount) {
  if (USE_MOCK) return mock.toggleResourceLike(resourceId, currentLiked, currentCount)
  const { data, error } = await supabase.rpc('toggle_resource_like', { p_resource_id: resourceId })
  if (error) return { error }
  const row = Array.isArray(data) ? data[0] : data
  return { liked: !!row?.liked, likesCount: row?.likes_count ?? currentCount, error: null }
}

/**
 * 记录下载并返回下载 URL（原子 +1）
 */
export async function downloadResource(resourceId) {
  if (USE_MOCK) return mock.downloadResource(resourceId)
  const { data, error } = await supabase.rpc('record_resource_download', { p_resource_id: resourceId })
  if (error) return { downloadUrl: '', error }
  const row = Array.isArray(data) ? data[0] : data
  return { downloadUrl: row?.download_url || '', error: null }
}
