export const POST_TYPE_REGULAR = 'regular'
export const POST_TYPE_MATERIAL = 'material'

export function isMaterialPost(post) {
  return post?.postType === POST_TYPE_MATERIAL
}

export function formatMaterialFileSize(bytes) {
  const n = Number(bytes) || 0
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(n < 10240 ? 1 : 0)} KB`
  return `${(n / (1024 * 1024)).toFixed(n < 1024 * 10240 ? 1 : 0)} MB`
}

export function materialFileKind(post) {
  const name = String(post?.attachment || post?.title || '').toLowerCase()
  if (/\.(pdf)$/.test(name)) return 'pdf'
  if (/\.(doc|docx)$/.test(name)) return 'doc'
  if (/\.(ppt|pptx)$/.test(name)) return 'ppt'
  if (/\.(xls|xlsx|csv)$/.test(name)) return 'sheet'
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(name)) return 'image'
  if (/\.(zip|rar|7z)$/.test(name)) return 'archive'
  if (/\.(mp4|mov|avi|mkv)$/.test(name)) return 'video'
  return 'file'
}

export function materialFileIconLabel(kind) {
  const labels = {
    pdf: 'PDF',
    doc: 'DOC',
    ppt: 'PPT',
    sheet: 'XLS',
    image: 'IMG',
    archive: 'ZIP',
    video: 'VID',
    file: 'FILE',
  }
  return labels[kind] || 'FILE'
}

export function filterMaterialPosts(posts, { communityId = '' } = {}) {
  let items = (posts || []).filter(isMaterialPost)
  if (communityId) items = items.filter((p) => p.communityId === communityId)
  return items
}

export function sortMaterialPosts(posts, { sortBy = 'time', order = 'desc' } = {}) {
  const dir = order === 'asc' ? 1 : -1
  return [...posts].sort((a, b) => {
    if (sortBy === 'size') {
      const diff = (a.fileSize || 0) - (b.fileSize || 0)
      if (diff !== 0) return dir * diff
      return String(a.title || '').localeCompare(String(b.title || ''))
    }
    const ta = new Date(a.createdAt || 0).getTime()
    const tb = new Date(b.createdAt || 0).getTime()
    if (ta !== tb) return dir * (ta - tb)
    return String(a.title || '').localeCompare(String(b.title || ''))
  })
}

export function sortCommunitiesWithPinned(communities) {
  return [...(communities || [])].sort((a, b) => {
    const pa = a.pinned ? 1 : 0
    const pb = b.pinned ? 1 : 0
    if (pa !== pb) return pb - pa
    if (pa && pb) {
      const ta = new Date(a.pinnedAt || 0).getTime()
      const tb = new Date(b.pinnedAt || 0).getTime()
      if (ta !== tb) return tb - ta
    }
    return String(a.name || '').localeCompare(String(b.name || ''))
  })
}
