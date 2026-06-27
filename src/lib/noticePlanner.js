import { canAddNoticeToTasks } from '@/lib/noticeRules'

/**
 * Add notice to planner (task + in_planner + hide) with toast undo.
 */
export async function addNoticeToPlanner(
  n,
  { addTaskFromNotice, deleteTask, setInPlanner, patchNotificationState, toast },
  { hide = true } = {}
) {
  if (!canAddNoticeToTasks(n)) {
    toast.show('General notices cannot be added to tasks')
    return
  }
  if (n.inPlanner) {
    toast.alreadyInPlanner()
    return
  }

  const task = await addTaskFromNotice({
    notice: n,
    noticeId: n.id,
    title: n.title,
    subject: n.subject,
    description: n.description,
    noticeTitle: n.title,
  })

  const prevInPlanner = !!n.inPlanner
  const prevHidden = !!n.hidden

  if (hide) {
    await patchNotificationState(n.id, { inPlanner: true, hidden: true })
  } else {
    await setInPlanner(n.id, true)
  }

  toast.showUndoToast('Added to planner', async () => {
    if (task?.id) await deleteTask(task.id)
    if (hide) {
      await patchNotificationState(n.id, { inPlanner: prevInPlanner, hidden: prevHidden })
    } else {
      await setInPlanner(n.id, prevInPlanner)
    }
  })
}
