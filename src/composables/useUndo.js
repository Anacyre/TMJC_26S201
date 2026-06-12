import { computed, ref } from 'vue'
import { showUndoToast, dismissToast, toast } from '@/composables/useToast'

/**
 * Global undo model:
 * - pushUndoable: optimistic UI + toast Undo (6s) + header undo menu (4 min) + delayed commit
 * - toast.showUndoToast alone: toast-only undo, not listed in the menu (avoid for new flows)
 */
export { UNDO_TOAST_DURATION as UNDO_TOAST_VISIBLE_MS } from '@/composables/useToast'

/** Global undo menu + delayed commit (independent of toast dismiss) */
export const UNDO_COMMIT_MS = 240000

/** Reactive undo queue — import this in UI for live updates */
export const undoStack = ref([])

let entrySeq = 0
const commitTimers = new Map()

export const pendingUndoEntries = computed(() =>
  undoStack.value.filter((e) => e.status === 'pending' && (!e.expiresAt || e.expiresAt > Date.now()))
)

export function getPendingUndoEntries() {
  return pendingUndoEntries.value
}

/**
 * Schedule a DB write after the undo window. Shows toast with Undo.
 */
export function pushUndoable({ message, menuLabel, undo, commit }) {
  const entry = {
    id: ++entrySeq,
    message,
    menuLabel: menuLabel || message,
    undo,
    commit,
    status: 'pending',
    toastId: null,
    createdAt: Date.now(),
    expiresAt: Date.now() + UNDO_COMMIT_MS,
  }

  undoStack.value = [entry, ...undoStack.value.filter((e) => e.status === 'pending')].slice(0, 12)

  entry.toastId = showUndoToast(message, () => runUndo(entry.id))

  const timer = setTimeout(async () => {
    commitTimers.delete(entry.id)
    if (entry.status !== 'pending') return
    entry.status = 'committed'
    removeEntry(entry.id)
    try {
      await commit?.()
    } catch (err) {
      console.error('[undo] commit failed:', err)
      toast.error('Could not complete action')
    }
  }, UNDO_COMMIT_MS)
  commitTimers.set(entry.id, timer)

  return entry
}

function removeEntry(id) {
  undoStack.value = undoStack.value.filter((e) => e.id !== id)
}

export async function runUndo(entryOrId) {
  const id = typeof entryOrId === 'object' ? entryOrId?.id : entryOrId
  const entry = undoStack.value.find((e) => e.id === id)
  if (!entry || entry.status !== 'pending') return false
  if (entry.expiresAt && entry.expiresAt <= Date.now()) return false

  const timer = commitTimers.get(entry.id)
  if (timer) clearTimeout(timer)
  commitTimers.delete(entry.id)

  entry.status = 'undone'
  removeEntry(entry.id)

  try {
    await Promise.resolve(entry.undo?.())
  } catch (err) {
    console.error('[undo] restore failed:', err)
    toast.error('Could not undo')
    return false
  }

  if (entry.toastId) dismissToast(entry.toastId)
  toast.show('Undone')
  return true
}

export function undoLast() {
  const pending = pendingUndoEntries.value
  if (!pending.length) {
    toast.show('Nothing to undo')
    return false
  }
  return runUndo(pending[0].id)
}

export function undoById(id) {
  return runUndo(id)
}
