import { supabase } from '@/lib/supabase'
import * as mock from '@/lib/mockBackend'

const USE_MOCK = mock.USE_MOCK

async function normalizeUploadBody(file) {
  if (!file) return null
  if (file instanceof Blob) return file
  if (file.file instanceof Blob) return file.file
  const path = file.path || file.tempFilePath || ''
  if (typeof path === 'string' && path) {
    const res = await fetch(path)
    const blob = await res.blob()
    if (file.name && !blob.name) {
      try {
        return new File([blob], file.name, { type: blob.type || file.type || 'application/octet-stream' })
      } catch {
        return blob
      }
    }
    return blob
  }
  return file
}

function fileDisplayName(file, fallback = 'file') {
  return file?.name || file?.path?.split('/')?.pop() || fallback
}

/**
 * Upload a file to Supabase Storage
 * @param {File|Blob|object} file - file object from uni.chooseFile
 * @param {'avatar'|'resource'|'attachment'|'focus-sound'|'post'} type - usage category
 * @returns {{ fileKey, fileName, fileUrl, fileSize, mimeType, error }}
 */
export async function uploadFile(file, type = 'resource') {
  if (USE_MOCK) return mock.uploadFile(file, type)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: new Error('Not signed in') }

  const body = await normalizeUploadBody(file)
  if (!body) return { error: new Error('No file selected') }

  const displayName = fileDisplayName(file)
  const ext = displayName.split('.').pop() || 'bin'
  const timestamp = Date.now()
  const fileKey = `${type}/${user.id}/${timestamp}.${ext}`
  const bucket = 'class-os-files'

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(fileKey, body, {
      cacheControl: '3600',
      upsert: false,
      contentType: body.type || file?.type || 'application/octet-stream',
    })

  if (uploadError) return { error: uploadError }

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileKey)

  return {
    fileKey,
    fileName: displayName,
    fileUrl: urlData?.publicUrl || '',
    fileSize: body.size || file?.size || 0,
    mimeType: body.type || file?.type || 'application/octet-stream',
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

export function inferResourceType(fileName = '') {
  const ext = String(fileName).split('.').pop()?.toLowerCase() || ''
  if (ext === 'pdf') return 'PDF'
  if (['doc', 'docx'].includes(ext)) return 'DOCX'
  if (['xls', 'xlsx'].includes(ext)) return 'XLSX'
  if (['png', 'jpg', 'jpeg', 'webp', 'gif'].includes(ext)) return 'Image'
  if (['ppt', 'pptx'].includes(ext)) return 'PPTX'
  if (['mp4', 'mov', 'webm'].includes(ext)) return 'Video'
  return ext ? ext.toUpperCase() : 'File'
}

export function choosePostFile() {
  return new Promise((resolve, reject) => {
    uni.chooseFile({
      count: 1,
      extension: [
        '.png', '.jpg', '.jpeg', '.webp', '.gif',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
        '.zip', '.txt', '.mp4', '.mov',
      ],
      success: (res) => {
        const file = res.tempFiles?.[0]
        if (file) {
          resolve({
            file: file.file || file,
            path: file.path || res.tempFilePaths?.[0] || '',
            name: file.name || '',
            size: file.size || 0,
            type: file.type || '',
          })
          return
        }
        const path = res.tempFilePaths?.[0]
        if (path) {
          resolve({ path, name: path.split('/').pop() || '', size: 0 })
          return
        }
        reject(new Error('No file selected'))
      },
      fail: (err) => reject(err || new Error('Pick cancelled')),
    })
  })
}

export function isPostImageFile(fileOrName, mimeType = '') {
  const name = String(fileOrName?.name || fileOrName || '').toLowerCase()
  const mime = String(mimeType || fileOrName?.type || '').toLowerCase()
  if (mime.startsWith('image/')) return true
  return /\.(png|jpe?g|webp|gif)$/i.test(name)
}

export function chooseStudyFile() {
  return new Promise((resolve, reject) => {
    uni.chooseFile({
      count: 1,
      extension: ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.png', '.jpg', '.jpeg', '.webp'],
      success: (res) => {
        const file = res.tempFiles?.[0]
        if (file) {
          resolve({
            file: file.file || file,
            path: file.path || res.tempFilePaths?.[0] || '',
            name: file.name || '',
            size: file.size || 0,
            type: file.type || '',
          })
          return
        }
        const path = res.tempFilePaths?.[0]
        if (path) {
          resolve({ path, name: path.split('/').pop() || '', size: 0 })
          return
        }
        reject(new Error('No file selected'))
      },
      fail: (err) => reject(err || new Error('Pick cancelled')),
    })
  })
}
