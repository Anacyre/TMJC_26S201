/** Full swipe / tap on delete should confirm before row vanish animation. */
export function shouldVanishBeforeAction(actionId) {
  return actionId !== 'delete'
}
