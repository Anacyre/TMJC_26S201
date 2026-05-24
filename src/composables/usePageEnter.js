import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { PAGE_ENTER_KEY, PAGE_TRANSITION_MS, setCurrentTab } from '@/lib/navigation'

function peekEnterPending() {
  try {
    return !!uni.getStorageSync(PAGE_ENTER_KEY)
  } catch {
    return false
  }
}

export function usePageEnter(tabId = '') {
  const animateReveal = ref(false)
  const contentVisible = ref(!peekEnterPending())

  function runEnter() {
    if (tabId) setCurrentTab(tabId)

    let pending = false
    try {
      pending = !!uni.getStorageSync(PAGE_ENTER_KEY)
      if (pending) uni.removeStorageSync(PAGE_ENTER_KEY)
    } catch {
      /* ignore */
    }

    if (!pending) {
      animateReveal.value = false
      contentVisible.value = true
      return
    }

    animateReveal.value = true
    contentVisible.value = false
    setTimeout(() => {
      contentVisible.value = true
    }, PAGE_TRANSITION_MS)
  }

  onShow(runEnter)

  return { contentVisible, animateReveal }
}
