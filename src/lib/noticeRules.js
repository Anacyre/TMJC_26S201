/** Notices of this type cannot be added to the task planner. */
export function canAddNoticeToTasks(notice) {
  return String(notice?.type || '').trim() !== 'General'
}

/** Publisher or real admin (admin mode toggle not required). */
export function canDeleteNotice(notice, { userId, isRealAdmin }) {
  if (!userId || !notice?.id) return false
  if (isRealAdmin) return true
  const authorId = String(notice.createdBy || notice.created_by || '').trim()
  return !!authorId && authorId === userId
}
