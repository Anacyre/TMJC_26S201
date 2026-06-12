const LOCK_CLASS = 'modal-open'

let lockDepth = 0

function applyLock() {
  document.body.classList.add(LOCK_CLASS)
  document.body.style.overflow = 'hidden'
  const app = document.getElementById('app')
  if (app) app.style.pointerEvents = 'none'
}

function removeLock() {
  document.body.classList.remove(LOCK_CLASS)
  document.body.style.overflow = ''
  const app = document.getElementById('app')
  if (app) app.style.pointerEvents = ''
}

/** Block pointer/scroll on page content while a full-screen modal is open (H5). Ref-counted. */
export function lockPageInteraction() {
  if (typeof document === 'undefined') return
  lockDepth += 1
  if (lockDepth === 1) applyLock()
}

export function unlockPageInteraction() {
  if (typeof document === 'undefined') return
  lockDepth = Math.max(0, lockDepth - 1)
  if (lockDepth === 0) removeLock()
}
