import { computed, onMounted, onUnmounted, ref } from 'vue'

function detectDesktop() {
  if (typeof window === 'undefined') return false
  const fine = window.matchMedia?.('(pointer: fine)')?.matches
  const wide = window.innerWidth >= 768
  return !!(fine && wide)
}

const isDesktop = ref(detectDesktop())

function refresh() {
  isDesktop.value = detectDesktop()
}

if (typeof window !== 'undefined') {
  window.addEventListener('resize', refresh, { passive: true })
}

export function useDevice() {
  onMounted(refresh)
  onUnmounted(() => {
    if (typeof window !== 'undefined') window.removeEventListener('resize', refresh)
  })
  return {
    isDesktop: computed(() => isDesktop.value),
  }
}
