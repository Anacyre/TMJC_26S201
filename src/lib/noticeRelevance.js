/** Whether a notice should appear in the user's inbox / unread badge. */
export function isNoticeRelevantToUser(notice, userId = '') {
  if (!notice?.id || notice.hidden || notice.inPlanner) return false
  const authorId = String(notice.createdBy || notice.created_by || '').trim()
  if (authorId && userId && authorId === userId) return false
  return true
}

export function countUnreadRelevantNotices(notices, userId = '') {
  return (notices || []).filter((n) => isNoticeRelevantToUser(n, userId) && !n.read).length
}
