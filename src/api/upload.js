import { supabase } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

const USE_MOCK = mock.USE_MOCK

/**
 * Upload a file to Supabase Storage
 * @param {File|Blob} file - file object
 * @param {'avatar'|'resource'|'attachment'} type - usage category
 * @returns {{ fileKey, fileName, fileUrl, fileSize, mimeType, error }}
 */
export async function uploadFile(file, type = 'resource') {
  if (USE_MOCK) return mock.uploadFile(file, type)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: new Error('Not signed in') }

  const ext = file.name?.split('.').pop() || 'bin'
  const timestamp = Date.now()
  const fileKey = `${type}/${user.id}/${timestamp}.${ext}`
  const bucket = 'class-os-files'

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileKey, file, { cacheControl: '3600', upsert: false })

  if (uploadError) return { error: uploadError }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileKey)

  return {
    fileKey,
    fileName: file.name || fileKey,
    fileUrl: urlData?.publicUrl || '',
    fileSize: file.size || 0,
    mimeType: file.type || 'application/octet-stream',
    error: null,
  }
}

/**
 * Upload avatar (updates profiles.avatar_url)
 * @param {File|Blob} file
 * @param {string} userId
 */
export async function uploadAvatar(file, userId) {
  if (USE_MOCK) return mock.uploadAvatar(file, userId)
  const result = await uploadFile(file, 'avatar')
  if (result.error) return result

  const { error } = await supabase
    .from('profiles')
    .update({ avatar_url: result.fileUrl })
    .eq('id', userId)

  return { ...result, error }
}
