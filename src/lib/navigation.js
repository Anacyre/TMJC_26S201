import { PAGE_MS } from '@/lib/pageTransition'
import { writePageTransition } from '@/lib/pageTransitionStore'

/** Unified transition length (0.2s from click) */
export const PAGE_ANIM_MS = PAGE_MS
export const PAGE_TRANSITION_MS = PAGE_MS
export const PAGE_REVEAL_MS = PAGE_MS
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

/** Native stack motion — short; volatile content uses PageContent crossfade */
export const pageAnim = {
  none: { animationType: 'none', animationDuration: 0 },
  fade: { animationType: 'fade-in', animationDuration: PAGE_ANIM_MS },
  slide: { animationType: 'slide-in-right', animationDuration: PAGE_ANIM_MS },
  slideLeft: { animationType: 'slide-in-left', animationDuration: PAGE_ANIM_MS },
  pop: { animationType: 'pop-in', animationDuration: PAGE_ANIM_MS },
}

let currentTabId = 'home'

export function setCurrentTab(tabId) {
  if (TAB_ORDER.includes(tabId)) currentTabId = tabId
}

export function getCurrentTab() {
  return currentTabId
}

function markPageEnterPending(meta = {}) {
  writePageTransition({ clickedAt: Date.now(), ...meta })
  try {
    uni.setStorageSync(PAGE_ENTER_KEY, '1')
  } catch {
    /* ignore */
  }
}

function tabDirection(fromTabId, toTabId) {
  const from = TAB_ORDER.indexOf(fromTabId)
  const to = TAB_ORDER.indexOf(toTabId)
  if (from < 0 || to < 0 || from === to) return 'neutral'
  return to > from ? 'forward' : 'back'
}

/** Tab switch — keep shell instant; animate only data layer via TabPageContent */
export function navTab(toTabId, fromTabId = currentTabId) {
  const url = TAB_PATHS[toTabId]
  if (!url || toTabId === fromTabId) return Promise.resolve()

  currentTabId = toTabId
  markPageEnterPending({
    kind: 'tab',
    direction: tabDirection(fromTabId, toTabId),
    from: fromTabId,
    to: toTabId,
  })

  return new Promise((resolve, reject) => {
    uni.redirectTo({
      url,
      ...pageAnim.none,
      success: resolve,
      fail: () => {
        uni.reLaunch({
          url,
          ...pageAnim.none,
          success: resolve,
          fail: reject,
        })
      },
    })
  })
}

/** Child page — content crossfade; header stays structurally stable */
export function navChild(url) {
  markPageEnterPending({ kind: 'child', direction: 'forward', to: url })
  return uni.navigateTo({ url, ...pageAnim.none })
}

export function navSibling(url) {
  markPageEnterPending({ kind: 'sibling', direction: 'forward', to: url })
  return uni.navigateTo({ url, ...pageAnim.none })
}

export function navBack(delta = 1) {
  markPageEnterPending({ kind: 'back', direction: 'back' })
  return uni.navigateBack({ delta })
}

export function navTo(url, anim = pageAnim.none) {
  markPageEnterPending({ kind: 'custom', direction: 'forward', to: url })
  return uni.navigateTo({ url, ...anim })
}
