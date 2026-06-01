import { ref } from 'vue'

const queue = ref([])
let nextId = 0
let dismissTimer = null

export const UNDO_TOAST_DURATION = 6000
const DEFAULT_DURATION = 1800

function clearDismissTimer() {
  if (dismissTimer) {
    clearTimeout(dismissTimer)
    dismissTimer = null
  }
}

function scheduleDismiss(id, duration) {
  clearDismissTimer()
  dismissTimer = setTimeout(() => dismiss(id), duration)
}

function show(message, { duration = DEFAULT_DURATION, undo, undoLabel = 'Undo' } = {}) {
  const id = ++nextId
  const item = {
    id,
    message,
    leaving: false,
    undoLabel: undo ? undoLabel : '',
    onUndo: undo || null,
  }
  queue.value = [{ ...item }]
  scheduleDismiss(id, undo ? UNDO_TOAST_DURATION : duration)
  return id
}

export function showUndoToast(message, onUndo) {
  return show(message, { undo: onUndo, undoLabel: 'Undo', duration: UNDO_TOAST_DURATION })
}

export function dismissToast(id) {
  dismiss(id)
}

function dismiss(id) {
  clearDismissTimer()
  const item = queue.value.find((t) => t.id === id)
  if (!item) {
    queue.value = []
    return
  }
  item.leaving = true
  setTimeout(() => {
    queue.value = queue.value.filter((t) => t.id !== id)
  }, 150)
}

function handleUndo(item) {
  if (!item?.onUndo) return
  clearDismissTimer()
  const fn = item.onUndo
  dismiss(item.id)
  fn()
}

/** Short English confirmations after successful DB / storage writes */
export const toast = {
  show,
  showUndoToast,
  dismiss: dismissToast,
  handleUndo,
  error: (message) => show(message || 'Something went wrong'),

  taskCreated: () => show('Task created'),
  taskUpdated: () => show('Task updated'),
  taskDeleted: (onUndo) => (onUndo ? showUndoToast('Task deleted', onUndo) : show('Task deleted')),
  taskArchived: (onUndo) => (onUndo ? showUndoToast('Task archived', onUndo) : show('Task archived')),

  addedToPlanner: () => show('Added to planner'),
  alreadyInPlanner: () => show('Already in planner'),

  postPublished: () => show('Post published'),
  postDeleted: () => show('Post deleted'),
  commentAdded: () => show('Comment added'),

  noticePublished: () => show('Notice published'),
  noticeDeleted: () => show('Notice deleted'),
  noticeUpdated: () => show('Notice updated'),
  noticeHidden: () => show('Notice hidden'),

  communityCreated: () => show('Space created'),
  subjectCreated: () => show('Subject created'),
  resourceUploaded: () => show('Resource uploaded'),
  resourceUpdated: () => show('Resource updated'),

  focusSessionSaved: () => show('Focus session saved'),
  soundUploaded: () => show('Sound uploaded'),
  soundRemoved: () => show('Sound removed'),

  profileSaved: () => show('Profile saved'),
  memberAdded: () => show('Member added'),
  memberUpdated: () => show('Member updated'),

  loginSuccess: () => show('Logged in'),
  rememberMeEnabled: () => show('Remember me on'),
  copied: () => show('Copied'),
  hidden: () => show('Hidden'),

  saved: () => show('Saved'),
  added: () => show('Added'),
  updated: () => show('Updated'),
  removed: () => show('Removed'),
  published: () => show('Published'),
  deleted: () => show('Deleted'),
  archived: () => show('Archived'),
}

export function useToast() {
  return { queue, toast }
}

export { queue }
