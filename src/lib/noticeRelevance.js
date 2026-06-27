/** Whether a notice should appear in the user's inbox / unread badge. */
export function isNoticeRelevantToUser(notice, userId = '') {
  if (!notice?.id || notice.hidden || notice.inPlanner) return false
  const authorId = String(notice.createdBy || notice.created_by || '').trim()
  if (authorId && userId && authorId === userId) return false
  return true
}

/**
 * Unread badge / dot: not explicitly read, and created after the user last opened
 * the notice inbox (see noticeInboxSeen.js).
 */
export function isNoticeUnreadForUser(notice, userId = '', lastSeenAt = 0) {
  if (!isNoticeRelevantToUser(notice, userId)) return false
  if (notice.read) return false
  const created = new Date(notice.createdAt || 0).getTime()
  if (!Number.isFinite(created)) return false
  return created > lastSeenAt
}

export function countUnreadRelevantNotices(notices, userId = '', lastSeenAt = 0) {
  return (notices || []).filter((n) => isNoticeUnreadForUser(n, userId, lastSeenAt)).length
}
