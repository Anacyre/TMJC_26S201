import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useUndoMenu } from '@/composables/useUndoMenu'

/** Hold duration before the undo sheet opens */
const LOGO_LONG_PRESS_MS = 450
const SHORT_TAP_MAX_MS = 380
const TOUCH_MOUSE_GUARD_MS = 700
/** Block accidental home navigation right after the sheet opens */
const SUPPRESS_HOME_MS = 700

function resolveDomNode(refVal) {
  if (!refVal) return null
  if (refVal instanceof HTMLElement) return refVal
  const el = refVal.$el ?? refVal.$?.vnode?.el
  if (el instanceof HTMLElement) return el
  return null
}

function hapticLongPress() {
  try {
    uni.vibrateShort?.({ type: 'light' })
  } catch {
    /* optional */
  }
}

function bindNativeLogoPress(el, { onShortTap, onLongPress, onPressChange }) {
  let timer = null
  let startAt = 0
  let longDone = false
  let lastTouchAt = 0
  let suppressHomeUntil = 0

  const clearTimer = () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const setPressing = (v) => onPressChange?.(v)

  const fireLong = () => {
    if (longDone) return
    longDone = true
    clearTimer()
    setPressing(false)
    suppressHomeUntil = Date.now() + SUPPRESS_HOME_MS
    hapticLongPress()
    onLongPress()
  }

  const onStart = (e) => {
    const type = e?.type || ''
    if (type.startsWith('touch')) lastTouchAt = Date.now()
    if (type === 'mousedown' && Date.now() - lastTouchAt < TOUCH_MOUSE_GUARD_MS) return

    longDone = false
    startAt = Date.now()
    setPressing(true)
    clearTimer()
    timer = setTimeout(fireLong, LOGO_LONG_PRESS_MS)
  }

  const onEnd = (e) => {
    const type = e?.type || ''
    if (type === 'mouseup' && Date.now() - lastTouchAt < TOUCH_MOUSE_GUARD_MS) return

    const elapsed = Date.now() - startAt
    clearTimer()
    setPressing(false)

    if (!longDone && elapsed >= LOGO_LONG_PRESS_MS) fireLong()

    const suppressHome = Date.now() < suppressHomeUntil
    if (!longDone && !suppressHome && elapsed < SHORT_TAP_MAX_MS) onShortTap?.()
    longDone = false
  }

  el.addEventListener('touchstart', onStart, { passive: true })
  el.addEventListener('touchend', onEnd)
  el.addEventListener('touchcancel', onEnd)
  el.addEventListener('mousedown', onStart)
  el.addEventListener('mouseup', onEnd)
  el.addEventListener('mouseleave', onEnd)

  return () => {
    clearTimer()
    setPressing(false)
    el.removeEventListener('touchstart', onStart)
    el.removeEventListener('touchend', onEnd)
    el.removeEventListener('touchcancel', onEnd)
    el.removeEventListener('mousedown', onStart)
    el.removeEventListener('mouseup', onEnd)
    el.removeEventListener('mouseleave', onEnd)
  }
}

/**
 * Logo press: tap → home; hold → global undo menu.
 * @param {Function} onShortTap
 * @param {import('vue').Ref} targetRef - ref on .logoHit (H5 uses native DOM listeners)
 */
export function useLogoUndoPress(onShortTap, targetRef) {
  const { openUndoMenu } = useUndoMenu()
  const logoPressing = ref(false)
  let pressTimer = null
  let pressStartAt = 0
  let pressGeneration = 0
  let longPressHandled = false
  let lastTouchStartAt = 0
  let suppressHomeUntil = 0
  let nativeDetach = null
  const lock = ref(false)

  function clearPressTimer() {
    if (pressTimer) {
      clearTimeout(pressTimer)
      pressTimer = null
    }
  }

  function onLongPress() {
    if (lock.value || longPressHandled) return
    clearPressTimer()
    longPressHandled = true
    logoPressing.value = false
    lock.value = true
    suppressHomeUntil = Date.now() + SUPPRESS_HOME_MS
    hapticLongPress()
    openUndoMenu()
    setTimeout(() => {
      lock.value = false
    }, 450)
  }

  function onPressStart(e) {
    if (nativeDetach) return
    const t = e?.type || ''
    if ((t === 'mousedown' || t === 'mouseup') && Date.now() - lastTouchStartAt < TOUCH_MOUSE_GUARD_MS) return
    if (t.startsWith('touch')) lastTouchStartAt = Date.now()

    const gen = ++pressGeneration
    pressStartAt = Date.now()
    longPressHandled = false
    logoPressing.value = true
    clearPressTimer()
    pressTimer = setTimeout(() => {
      if (gen !== pressGeneration) return
      onLongPress()
    }, LOGO_LONG_PRESS_MS)
  }

  function onPressEnd(e) {
    if (nativeDetach) return
    const t = e?.type || ''
    if ((t === 'mousedown' || t === 'mouseup') && Date.now() - lastTouchStartAt < TOUCH_MOUSE_GUARD_MS) return

    const elapsed = Date.now() - pressStartAt
    logoPressing.value = false
    if (elapsed < 100) return

    pressGeneration += 1
    clearPressTimer()

    if (!longPressHandled && elapsed >= LOGO_LONG_PRESS_MS) onLongPress()

    const suppressHome = Date.now() < suppressHomeUntil
    if (!longPressHandled && !suppressHome && elapsed < SHORT_TAP_MAX_MS) onShortTap?.()
    longPressHandled = false
  }

  onMounted(async () => {
    if (typeof document === 'undefined') return
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await nextTick()
      const el = resolveDomNode(targetRef?.value)
      if (el) {
        nativeDetach = bindNativeLogoPress(el, {
          onShortTap,
          onLongPress,
          onPressChange: (v) => {
            logoPressing.value = v
          },
        })
        return
      }
      await new Promise((r) => setTimeout(r, 40))
    }
  })

  onBeforeUnmount(() => {
    nativeDetach?.()
    nativeDetach = null
    logoPressing.value = false
  })

  return {
    logoPressing,
    onLogoLongPress: onLongPress,
    onLogoPressStart: onPressStart,
    onLogoPressEnd: onPressEnd,
  }
}
