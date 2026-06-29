import { mergeNoticeChecklistIntoTask, noticeChecklistsDiffer } from '@/lib/checklist'
import { parseDueDateKey, resolveTaskStatusFromForm } from '@/lib/taskDueDate'
import {
  noticeDeadlineSource,
  resolveNoticeDeadlineIso,
  taskDeadlineFromNotice,
} from '@/lib/noticeTaskDeadline'

/** Build task patch fields from an updated notice row. */
export function taskPatchFromNotice(notice, task) {
  const src = noticeDeadlineSource(notice)
  const deadline = taskDeadlineFromNotice(src)
  const deadlineDate = resolveNoticeDeadlineIso(src)
  const checklist = mergeNoticeChecklistIntoTask(notice.checklist, task.checklist)
  return {
    title: String(notice.title || task.title || '').trim() || 'From notice',
    subject: String(notice.subject || task.subject || 'General').trim() || 'General',
    description: String(notice.description ?? task.description ?? '').trim(),
    deadline,
    checklist,
    relatedNotice: { id: notice.id, title: notice.title || task.title || 'Notice' },
    status: resolveTaskStatusFromForm({ deadlineDate, done: !!task.done }),
  }
}

/** True when a linked task should receive notice field updates. */
export function noticeTaskFieldsDiffer(notice, task) {
  const patch = taskPatchFromNotice(notice, task)
  const deadlineKey = parseDueDateKey(task.deadline)
  const nextKey = parseDueDateKey(patch.deadline)
  return (
    patch.title !== (task.title || '') ||
    patch.subject !== (task.subject || '') ||
    patch.description !== (task.description || '') ||
    deadlineKey !== nextKey ||
    patch.relatedNotice?.title !== (task.relatedNotice?.title || '') ||
    noticeChecklistsDiffer(notice.checklist, task.checklist)
  )
}
