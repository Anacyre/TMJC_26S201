import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { setCurrentTab, PAGE_ENTER_KEY } from '@/lib/navigation'
import { getCurrentPageRoute, shouldSkipPageEnterTransition, PAGE_MS } from '@/lib/pageTransition'
import { readPageTransition, getTransitionDurationMs } from '@/lib/pageTransitionStore'
import { isPageTransitionsEnabled } from '@/composables/useAppearancePrefs'

export function usePageEnter(tabId = '') {
  const animateReveal = ref(false)
  const contentVisible = ref(true)
  const direction = ref('neutral')
  const durationMs = ref(PAGE_MS)

  function runEnter() {
    if (tabId) setCurrentTab(tabId)

    if (shouldSkipPageEnterTransition(getCurrentPageRoute())) {
      animateReveal.value = false
      contentVisible.value = true
      direction.value = 'neutral'
      durationMs.value = PAGE_MS
      return
    }

    if (!isPageTransitionsEnabled()) {
      animateReveal.value = false
      contentVisible.value = true
      direction.value = 'neutral'
      durationMs.value = PAGE_MS
      return
    }

    let meta = readPageTransition()
    if (!meta) {
      try {
        if (uni.getStorageSync(PAGE_ENTER_KEY)) {
          uni.removeStorageSync(PAGE_ENTER_KEY)
          meta = { direction: 'neutral', clickedAt: Date.now() }
        }
      } catch {
        /* ignore */
      }
    }
    if (!meta) {
      animateReveal.value = false
      contentVisible.value = true
      direction.value = 'neutral'
      durationMs.value = PAGE_MS
      return
    }

    animateReveal.value = true
    contentVisible.value = false
    direction.value = meta.direction || 'neutral'
    durationMs.value = getTransitionDurationMs(meta.clickedAt)

    const reveal = () => {
      contentVisible.value = true
    }
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(reveal)
    } else {
      setTimeout(reveal, 16)
    }
  }

  onShow(runEnter)

  return { contentVisible, animateReveal, direction, durationMs }
}
