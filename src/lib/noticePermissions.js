function noticeAuthorId(notice) {
  return String(notice?.createdBy || notice?.created_by || '').trim()
}

/** Publisher may always edit/delete; admins only when admin mode is active. */
export function canEditNotice(notice, { userId, isAdminActive } = {}) {
  const uid = String(userId || '').trim()
  if (!notice?.id || !uid) return false
  const authorId = noticeAuthorId(notice)
  if (authorId !== '' && authorId === uid) return true
  return !!isAdminActive
}

export function canDeleteNotice(notice, ctx = {}) {
  return canEditNotice(notice, ctx)
}

export { noticeAuthorId }
