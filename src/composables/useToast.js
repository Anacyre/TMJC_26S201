import { ref } from 'vue'

const queue = ref([])
let nextId = 0

const DEFAULT_DURATION = 1800

function show(message, { duration = DEFAULT_DURATION } = {}) {
  const id = ++nextId
  queue.value = [{ id, message, leaving: false }]
  setTimeout(() => dismiss(id), duration)
}

function dismiss(id) {
  const item = queue.value.find((t) => t.id === id)
  if (!item) return
  item.leaving = true
  setTimeout(() => {
    queue.value = queue.value.filter((t) => t.id !== id)
  }, 150)
}

export const toast = {
  show,
  saved: () => show('Saved'),
  added: () => show('Added'),
  addedToPlanner: () => show('Added to planner'),
  hidden: () => show('Hidden'),
  noticeHidden: () => show('Notice hidden'),
  deleted: () => show('Deleted'),
  taskDeleted: () => show('Task deleted'),
  archived: () => show('Archived'),
  taskArchived: () => show('Task archived'),
  updated: () => show('Updated'),
  removed: () => show('Removed'),
  published: () => show('Published'),
  copied: () => show('Copied'),
}

export function useToast() {
  return { queue, toast }
}
