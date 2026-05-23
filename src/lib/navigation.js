/** Shared page transition timing (ms) */
export const PAGE_ANIM_MS = 40

export const pageAnim = {
  slide: { animationType: 'slide-in-right', animationDuration: PAGE_ANIM_MS },
  fade: { animationType: 'fade-in', animationDuration: PAGE_ANIM_MS },
  pop: { animationType: 'pop-in', animationDuration: PAGE_ANIM_MS },
}

export function navTo(url, anim = pageAnim.slide) {
  return uni.navigateTo({ url, ...anim })
}
