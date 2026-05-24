/** Shared page transition timing (ms) — slide/zoom then data reveal */
export const PAGE_ANIM_MS = 50
export const PAGE_TRANSITION_MS = 50
export const PAGE_REVEAL_MS = 250
/** @deprecated use PAGE_TRANSITION_MS */
export const TAB_SLIDE_MS = PAGE_TRANSITION_MS
/** @deprecated use PAGE_REVEAL_MS */
export const TAB_REVEAL_MS = PAGE_REVEAL_MS
export const PAGE_ENTER_KEY = 'page_enter_pending'
/** @deprecated use PAGE_ENTER_KEY */
export const TAB_ENTER_KEY = PAGE_ENTER_KEY

export const TAB_ORDER = ['tasks', 'community', 'home', 'study', 'other']

export const TAB_PATHS = {
  tasks: '/pages/tasks/index',
  community: '/pages/community/index',
  home: '/pages/index/index',
  study: '/pages/study/index',
  other: '/pages/other/other',
}

export const pageAnim = {
  slide: { animationType: 'slide-in-right', animationDuration: PAGE_ANIM_MS },
  slideLeft: { animationType: 'slide-in-left', animationDuration: PAGE_ANIM_MS },
  fade: { animationType: 'fade-in', animationDuration: PAGE_ANIM_MS },
  pop: { animationType: 'pop-in', animationDuration: PAGE_ANIM_MS },
}

let currentTabId = 'home'

export function setCurrentTab(tabId) {
  if (TAB_ORDER.includes(tabId)) currentTabId = tabId
}

export function getCurrentTab() {
  return currentTabId
}

function markPageEnterPending() {
  try {
    uni.setStorageSync(PAGE_ENTER_KEY, '1')
  } catch {
    /* ignore */
  }
}

function tabSlideAnim(fromTabId, toTabId) {
  const fromIdx = TAB_ORDER.indexOf(fromTabId)
  const toIdx = TAB_ORDER.indexOf(toTabId)
  if (fromIdx < 0 || toIdx < 0 || fromIdx === toIdx) return pageAnim.slide
  return toIdx > fromIdx ? pageAnim.slide : pageAnim.slideLeft
}

/** Push a child page — pop-in zoom + data reveal. */
export function navChild(url) {
  markPageEnterPending()
  return uni.navigateTo({ url, ...pageAnim.pop })
}

/** Push a same-level page — slide + data reveal. */
export function navSibling(url) {
  markPageEnterPending()
  return uni.navigateTo({ url, ...pageAnim.slide })
}

/** Generic navigate — slide by default, with data reveal on enter. */
export function navTo(url, anim = pageAnim.slide) {
  markPageEnterPending()
  return uni.navigateTo({ url, ...anim })
}

/** Bottom bar tab switch — slide 50ms, then content reveal 250ms. */
export function navTab(toTabId, fromTabId = currentTabId) {
  const url = TAB_PATHS[toTabId]
  if (!url || toTabId === fromTabId) return Promise.resolve()

  const anim = tabSlideAnim(fromTabId, toTabId)
  currentTabId = toTabId
  markPageEnterPending()

  return new Promise((resolve, reject) => {
    uni.redirectTo({
      url,
      ...anim,
      success: resolve,
      fail: () => {
        uni.reLaunch({
          url,
          ...anim,
          success: resolve,
          fail: reject,
        })
      },
    })
  })
}
