/** Notices of this type cannot be added to the task planner. */
export function canAddNoticeToTasks(notice) {
  return String(notice?.type || '').trim() !== 'General'
}
