<template>
  <view class="tabPageShell">
    <view v-if="$slots.chrome" class="tabPageChrome">
      <slot name="chrome" />
    </view>

    <view
      v-if="!chromeOnly"
      class="tabDataShell"
      :class="{ waiting: animateReveal && !contentVisible }"
    >
      <view
        class="tabDataReveal"
        :class="{ reveal: contentVisible, instant: !animateReveal }"
        :style="revealStyle"
      >
        <slot />
      </view>
    </view>

    <view v-else-if="$slots.default" class="tabPageChrome">
      <slot />
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { usePageEnter } from '@/composables/usePageEnter'
import { PAGE_REVEAL_MS } from '@/lib/navigation'

const props = defineProps({
  tabId: { type: String, default: '' },
  /** Static pages (e.g. Other) — no data wipe/reveal layer */
  chromeOnly: { type: Boolean, default: false },
})

const { contentVisible, animateReveal } = usePageEnter(props.tabId)

const revealStyle = computed(() => ({
  transitionDuration: `${PAGE_REVEAL_MS}ms`,
}))
</script>

<style scoped>
.tabPageShell {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
}

.tabPageChrome {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.tabDataShell {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
}

.tabDataReveal {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  opacity: 0;
  transform: translateY(-24rpx);
  -webkit-mask-image: linear-gradient(to bottom, #000 40%, transparent 40%);
  mask-image: linear-gradient(to bottom, #000 40%, transparent 40%);
  -webkit-mask-size: 100% 280%;
  mask-size: 100% 280%;
  -webkit-mask-position: 0 100%;
  mask-position: 0 100%;
  transition-property: opacity, transform, -webkit-mask-position, mask-position;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  pointer-events: none;
}

.tabDataReveal.reveal {
  opacity: 1;
  transform: translateY(0);
  -webkit-mask-position: 0 0;
  mask-position: 0 0;
  pointer-events: auto;
}

.tabDataReveal.instant {
  opacity: 1;
  transform: translateY(0);
  -webkit-mask-position: 0 0;
  mask-position: 0 0;
  transition: none;
  pointer-events: auto;
}

.tabDataShell.waiting .tabDataReveal:not(.reveal):not(.instant) {
  position: absolute;
  inset: 0;
  flex: none;
}
</style>
