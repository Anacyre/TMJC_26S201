import { computed, watch } from 'vue'
import { useFocusStore } from '@/composables/useFocusStore'

let bound = false

function tierFromMinutes(minutes) {
  if (minutes >= 90) return 3
  if (minutes >= 60) return 2
  if (minutes >= 30) return 1
  return 0
}

function applyFocusVars(tier) {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  const tiers = [
    { hue: 220, warmth: 0, glow: 0, depth: 0 },
    { hue: 228, warmth: 0.06, glow: 0.04, depth: 0.02 },
    { hue: 235, warmth: 0.1, glow: 0.06, depth: 0.04 },
    { hue: 242, warmth: 0.14, glow: 0.08, depth: 0.06 },
  ]
  const t = tiers[tier] || tiers[0]
  root.style.setProperty('--focus-hue', String(t.hue))
  root.style.setProperty('--focus-warmth', String(t.warmth))
  root.style.setProperty('--focus-glow', String(t.glow))
  root.style.setProperty('--focus-depth', String(t.depth))
  root.dataset.focusTier = String(tier)
}

export function useFocusTheme() {
  const { weekMinutes } = useFocusStore()
  const tier = computed(() => tierFromMinutes(weekMinutes.value))

  if (!bound) {
    bound = true
    watch(tier, (v) => applyFocusVars(v), { immediate: true })
  }

  return { tier }
}
