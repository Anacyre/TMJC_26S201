/** Shared swipe row motion — keep Task / Notice rows in sync */

export const SWIPE_REVEAL = 84
export const SWIPE_COMMIT_EXTRA = 88
export const SWIPE_VISUAL_REVEAL = 112
export const SWIPE_ARCHIVED_REVEAL = 76
export const SWIPE_ARCHIVED_COMMIT_EXTRA = 72

export const SWIPE_TRACK_TRANSITION =
  'opacity 320ms cubic-bezier(0.34, 1.1, 0.58, 1), transform 360ms cubic-bezier(0.28, 1.06, 0.42, 1)'

export const SWIPE_SURFACE_SNAP_TRANSITION =
  'transform 360ms cubic-bezier(0.26, 1.08, 0.38, 1), box-shadow 280ms ease, opacity 240ms ease'

export const SWIPE_SURFACE_VANISH_TRANSITION =
  'transform 180ms cubic-bezier(0.22, 0.68, 0.32, 1), opacity 160ms ease, box-shadow 160ms ease'

export const SWIPE_BTN_TRANSITION =
  'transform 120ms cubic-bezier(0.34, 1.25, 0.64, 1), opacity 160ms ease, box-shadow 160ms ease'

export const SWIPE_VANISH_MS = 200
export const SWIPE_ACTION_MS = 200

/** Undamped finger travel required to trigger commit (damped offset peaks lower). */
export const SWIPE_RAW_COMMIT_MIN = SWIPE_REVEAL + Math.round(SWIPE_COMMIT_EXTRA * 0.5)

export function meetsPositiveSwipeCommit(dampedTotal, rawGesture) {
  const dampedMin = SWIPE_REVEAL + SWIPE_COMMIT_EXTRA * 0.52
  return dampedTotal >= dampedMin || rawGesture >= SWIPE_RAW_COMMIT_MIN
}

export function meetsNegativeSwipeCommit(dampedTotal, rawGesture) {
  const dampedMin = -(SWIPE_REVEAL + SWIPE_COMMIT_EXTRA * 0.52)
  return dampedTotal <= dampedMin || rawGesture <= -SWIPE_RAW_COMMIT_MIN
}

export function meetsPositiveSwipeCommitFor(dampedTotal, rawGesture, reveal, extra) {
  const dampedMin = reveal + extra * 0.58
  const rawMin = reveal + Math.round(extra * 0.42)
  return dampedTotal >= dampedMin || rawGesture >= rawMin
}

export function meetsNegativeSwipeCommitFor(dampedTotal, rawGesture, reveal, extra) {
  const dampedMin = -(reveal + extra * 0.58)
  const rawMin = reveal + Math.round(extra * 0.42)
  return dampedTotal <= dampedMin || rawGesture <= -rawMin
}

export function swipeEaseIn(p) {
  return p * p * p
}

export function swipeRubberBand(over, limit) {
  if (over <= 0) return 0
  return limit * (1 - Math.exp(-over / (limit * 0.22)))
}

export function swipeDampedPositive(raw, reveal = SWIPE_REVEAL, extra = SWIPE_COMMIT_EXTRA) {
  if (raw <= 0) return raw * 0.03
  if (raw <= reveal) {
    const ratio = raw / reveal
    return raw * (0.065 + ratio * 0.04)
  }
  return reveal + swipeRubberBand(raw - reveal, extra)
}

export function swipeDampedNegative(raw, reveal = SWIPE_REVEAL, extra = SWIPE_COMMIT_EXTRA) {
  if (raw >= 0) return raw * 0.03
  const abs = -raw
  if (abs <= reveal) {
    const ratio = abs / reveal
    return -(abs * (0.065 + ratio * 0.04))
  }
  return -(reveal + swipeRubberBand(abs - reveal, extra))
}
