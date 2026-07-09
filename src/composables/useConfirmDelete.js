import { nextTick, ref } from 'vue'
import { lockPageInteraction, unlockPageInteraction } from '@/lib/pageInteractionLock'

export const dialog = ref({
  open: false,
  title: 'Delete?',
  message: '',
  confirmLabel: 'Delete',
  cancelLabel: 'Cancel',
  resolve: null,
})

/**
 * Show a themed delete confirmation dialog. Resolves true if confirmed.
 * @param {{ title?: string, message?: string, confirmLabel?: string, cancelLabel?: string }} options
 * @returns {Promise<boolean>}
 */
export function confirmDelete(options = {}) {
  return new Promise((resolve) => {
    dialog.value.resolve = resolve
    dialog.value.title = options.title ?? 'Delete?'
    dialog.value.message = options.message ?? 'This cannot be undone.'
    dialog.value.confirmLabel = options.confirmLabel ?? 'Delete'
    dialog.value.cancelLabel = options.cancelLabel ?? 'Cancel'
    dialog.value.open = true
    lockPageInteraction()
    nextTick()
  })
}

export const deleteConfirm = {
  post: (options = {}) =>
    confirmDelete({
      title: 'Delete post?',
      message: 'This cannot be undone.',
      ...options,
    }),
  notice: (options = {}) =>
    confirmDelete({
      title: 'Delete notice?',
      message: 'This cannot be undone.',
      ...options,
    }),
  task: (options = {}) =>
    confirmDelete({
      title: 'Delete task?',
      message: '',
      ...options,
    }),
  focusNoise: (name = '', options = {}) =>
    confirmDelete({
      title: 'Remove sound?',
      message: name,
      confirmLabel: 'Remove',
      ...options,
    }),
  feedback: (options = {}) =>
    confirmDelete({
      title: 'Delete feedback?',
      message: 'This thread and all messages will be removed.',
      ...options,
    }),
}

export const restoreConfirm = {
  notice: (options = {}) =>
    confirmDelete({
      title: 'Restore notice?',
      message: 'This notice will reappear in your feed.',
      confirmLabel: 'Restore',
      ...options,
    }),
}

function settle(confirmed) {
  const resolve = dialog.value.resolve
  dialog.value.open = false
  dialog.value.resolve = null
  unlockPageInteraction()
  resolve?.(confirmed)
}

export function cancelDeleteDialog() {
  settle(false)
}

export function acceptDeleteDialog() {
  settle(true)
}

export function useConfirmDelete() {
  return { dialog, cancelDeleteDialog, acceptDeleteDialog }
}
