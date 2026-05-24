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

/**
 * Create a subject (admin only — enforced by RLS)
 */
export async function createSubject(payload) {
  if (USE_MOCK) return mock.createSubject(payload)
  const { data, error } = await supabase
    .from('subjects')
    .insert({
      icon: payload.icon || '📘',
      name: payload.name,
    })
    .select('*')
    .single()

  if (error) return { data: null, error }

  return {
    data: {
      id: data.id,
      icon: data.icon || '',
      name: data.name,
      filesCount: 0,
      updatedAt: data.updated_at,
    },
    error: null,
  }
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
 * Fetch resources (optionally filtered/sorted by subject)
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
 * Create a study resource (upload file via upload.js first)
 */
async function hydrateResourceRow(row, userId) {
  if (!row) return null
  let authorName = 'Unknown'
  const { data: prof } = await supabase
    .from('profiles')
    .select('name, display_name')
    .eq('id', userId)
    .maybeSingle()
  if (prof) authorName = prof.display_name || prof.name || authorName

  let subjectName = row.subjects?.name || ''
  if (!subjectName && row.subject_id) {
    const { data: sub } = await supabase
      .from('subjects')
      .select('name')
      .eq('id', row.subject_id)
      .maybeSingle()
    subjectName = sub?.name || ''
  }

  return rowToResource({
    ...row,
    profiles: { name: authorName },
    subjects: { name: subjectName },
  })
}

export async function createResource(payload) {
  if (USE_MOCK) return mock.createResource(payload)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { data: null, error: new Error('Not signed in') }
  if (!payload.subjectId) return { data: null, error: new Error('Missing subject') }

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
    .select('*')
    .single()

  if (error) return { data: null, error }
  return { data: await hydrateResourceRow(data, user.id), error: null }
}

/**
 * Toggle resource like (atomic on the database)
 */
export async function toggleResourceLike(resourceId, currentLiked, currentCount) {
  if (USE_MOCK) return mock.toggleResourceLike(resourceId, currentLiked, currentCount)
  const { data, error } = await supabase.rpc('toggle_resource_like', { p_resource_id: resourceId })
  if (error) return { error }
  const row = Array.isArray(data) ? data[0] : data
  return { liked: !!row?.liked, likesCount: row?.likes_count ?? currentCount, error: null }
}

/**
 * Record a download and return the download URL (atomic +1)
 */
export async function downloadResource(resourceId) {
  if (USE_MOCK) return mock.downloadResource(resourceId)
  const { data, error } = await supabase.rpc('record_resource_download', { p_resource_id: resourceId })
  if (error) return { downloadUrl: '', error }
  const row = Array.isArray(data) ? data[0] : data
  return { downloadUrl: row?.download_url || '', error: null }
}
