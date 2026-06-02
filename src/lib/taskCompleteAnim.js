/** Shared task completion animation timing (all completion paths). */
export const TASK_COMPLETE_STRIKE_MS = 420
export const TASK_COMPLETE_FADE_MS = 480
/** Done-list card leave + sibling reflow */
export const DONE_LIST_REFLOW_MS = 200

export function taskCompleteAnimTotalMs() {
  return TASK_COMPLETE_STRIKE_MS + TASK_COMPLETE_FADE_MS
}
