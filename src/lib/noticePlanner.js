import { canAddNoticeToTasks } from '@/lib/noticeRules'

/**
 * Add notice to planner (task + in_planner + hide) with toast undo.
 */
export async function addNoticeToPlanner(
  n,
  { addTaskFromNotice, deleteTask, setInPlanner, setHidden, toast },
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

  const writes = [setInPlanner(n.id, true)]
  if (hide) writes.push(setHidden(n.id, true))
  await Promise.all(writes)

  toast.showUndoToast('Added to planner', async () => {
    if (task?.id) await deleteTask(task.id)
    const undos = [setInPlanner(n.id, prevInPlanner)]
    if (hide) undos.push(setHidden(n.id, prevHidden))
    await Promise.all(undos)
  })
}
