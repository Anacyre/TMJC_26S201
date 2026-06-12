/** Normalise touch / mouse coordinates for swipe rows (H5 desktop + mobile). */
export function pointerXY(e) {
  const t = e.touches?.[0] || e.changedTouches?.[0]
  if (t) return { x: t.clientX, y: t.clientY }
  return { x: e.clientX ?? 0, y: e.clientY ?? 0 }
}
