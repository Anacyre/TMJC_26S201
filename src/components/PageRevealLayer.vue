<template>
  <view
    ref="rootRef"
    class="revealLayer"
    :class="[themeClass, layerClass, { ready: contentVisible }]"
    :style="layerStyle"
  >
    <slot />
  </view>
</template>

<script setup>
import { computed, nextTick, onUpdated, ref, watch } from 'vue'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({
  contentVisible: { type: Boolean, default: true },
  animateReveal: { type: Boolean, default: false },
  direction: { type: String, default: 'neutral' },
  durationMs: { type: Number, default: 200 },
})

const { themeClass } = useTheme()
const rootRef = ref(null)
const cardCount = ref(0)

const layerClass = computed(() => {
  if (!props.animateReveal) return 'static'
  return `dir-${props.direction || 'neutral'}`
})

const layerStyle = computed(() => ({
  '--reveal-dur': `${props.durationMs}ms`,
  '--reveal-stagger': `${staggerMs.value}ms`,
}))

const staggerMs = computed(() => {
  const n = Math.max(1, cardCount.value)
  return Math.min(36, Math.floor(props.durationMs / (n + 2)))
})

function countCards() {
  // #ifdef H5
  const el = rootRef.value?.$el || rootRef.value
  if (!el?.querySelectorAll) return
  let cards = el.querySelectorAll('[data-reveal-card]')
  if (!cards.length) cards = el.querySelectorAll('.revealLayer > *')
  cardCount.value = cards.length || 1
  // #endif
  // #ifndef H5
  cardCount.value = 1
  // #endif
}

watch(
  () => [props.contentVisible, props.animateReveal],
  async () => {
    if (!props.animateReveal) return
    await nextTick()
    countCards()
  },
  { immediate: true }
)

onUpdated(() => {
  if (props.animateReveal && props.contentVisible) countCards()
})
</script>

<style scoped>
.revealLayer {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
}

.revealLayer.static,
.revealLayer.ready {
  opacity: 1;
}

/* PPT-style per-card enter — no mask / blur */
.revealLayer.dir-forward:not(.ready) :deep([data-reveal-card]),
.revealLayer.dir-forward:not(.ready) > :deep(*) {
  opacity: 0;
  transform: translateX(36rpx) scale(0.94);
}

.revealLayer.dir-back:not(.ready) :deep([data-reveal-card]),
.revealLayer.dir-back:not(.ready) > :deep(*) {
  opacity: 0;
  transform: translateX(-36rpx) scale(0.94);
}

.revealLayer.dir-neutral:not(.ready) :deep([data-reveal-card]),
.revealLayer.dir-neutral:not(.ready) > :deep(*) {
  opacity: 0;
  transform: translateY(20rpx) scale(0.96);
}

.revealLayer.dir-forward.ready :deep([data-reveal-card]),
.revealLayer.dir-forward.ready > :deep(*) {
  animation: revealForward var(--reveal-dur, 200ms) cubic-bezier(0.22, 0.68, 0.32, 1) both;
  animation-delay: calc(var(--reveal-i, 0) * var(--reveal-stagger, 24ms));
}

.revealLayer.dir-back.ready :deep([data-reveal-card]),
.revealLayer.dir-back.ready > :deep(*) {
  animation: revealBack var(--reveal-dur, 200ms) cubic-bezier(0.22, 0.68, 0.32, 1) both;
  animation-delay: calc(var(--reveal-i, 0) * var(--reveal-stagger, 24ms));
}

.revealLayer.dir-neutral.ready :deep([data-reveal-card]),
.revealLayer.dir-neutral.ready > :deep(*) {
  animation: revealNeutral var(--reveal-dur, 200ms) cubic-bezier(0.22, 0.68, 0.32, 1) both;
  animation-delay: calc(var(--reveal-i, 0) * var(--reveal-stagger, 24ms));
}

.revealLayer.ready :deep([data-reveal-card]:nth-child(1)) { --reveal-i: 0; }
.revealLayer.ready :deep([data-reveal-card]:nth-child(2)) { --reveal-i: 1; }
.revealLayer.ready :deep([data-reveal-card]:nth-child(3)) { --reveal-i: 2; }
.revealLayer.ready :deep([data-reveal-card]:nth-child(4)) { --reveal-i: 3; }
.revealLayer.ready :deep([data-reveal-card]:nth-child(5)) { --reveal-i: 4; }
.revealLayer.ready :deep([data-reveal-card]:nth-child(6)) { --reveal-i: 5; }
.revealLayer.ready :deep([data-reveal-card]:nth-child(7)) { --reveal-i: 6; }
.revealLayer.ready :deep([data-reveal-card]:nth-child(8)) { --reveal-i: 7; }
.revealLayer.ready > :deep(*:nth-child(1)) { --reveal-i: 0; }
.revealLayer.ready > :deep(*:nth-child(2)) { --reveal-i: 1; }
.revealLayer.ready > :deep(*:nth-child(3)) { --reveal-i: 2; }
.revealLayer.ready > :deep(*:nth-child(4)) { --reveal-i: 3; }
.revealLayer.ready > :deep(*:nth-child(5)) { --reveal-i: 4; }
.revealLayer.ready > :deep(*:nth-child(6)) { --reveal-i: 5; }

@keyframes revealForward {
  from {
    opacity: 0;
    transform: translateX(36rpx) scale(0.94);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes revealBack {
  from {
    opacity: 0;
    transform: translateX(-36rpx) scale(0.94);
  }
  to {
    opacity: 1;
    transform: translateX(0) scale(1);
  }
}

@keyframes revealNeutral {
  from {
    opacity: 0;
    transform: translateY(20rpx) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}
</style>
