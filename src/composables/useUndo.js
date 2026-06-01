import { computed, ref } from 'vue'
import { showUndoToast, dismissToast, toast } from '@/composables/useToast'

export const UNDO_WINDOW_MS = 6000

/** Reactive undo queue — import this in UI for live updates */
export const undoStack = ref([])

let entrySeq = 0
const commitTimers = new Map()

export const pendingUndoEntries = computed(() =>
  undoStack.value.filter((e) => e.status === 'pending')
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
  }, UNDO_WINDOW_MS)
  commitTimers.set(entry.id, timer)

  return entry
}

function removeEntry(id) {
  undoStack.value = undoStack.value.filter((e) => e.id !== id)
}

export function runUndo(entryOrId) {
  const id = typeof entryOrId === 'object' ? entryOrId?.id : entryOrId
  const entry = undoStack.value.find((e) => e.id === id)
  if (!entry || entry.status !== 'pending') return false

  const timer = commitTimers.get(entry.id)
  if (timer) clearTimeout(timer)
  commitTimers.delete(entry.id)

  entry.status = 'undone'
  removeEntry(entry.id)

  try {
    entry.undo?.()
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
