/** Swipe actions that need a confirmation dialog must not vanish until the parent approves. */
export function shouldVanishBeforeAction(actionId) {
  return actionId !== 'delete' && actionId !== 'restore'
}
