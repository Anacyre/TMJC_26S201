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
      <PageRevealLayer
        :content-visible="contentVisible"
        :animate-reveal="animateReveal"
        :direction="direction"
        :duration-ms="durationMs"
      >
        <slot />
      </PageRevealLayer>
    </view>

    <view v-else-if="$slots.default" class="tabPageChrome">
      <slot />
    </view>
  </view>
</template>

<script setup>
import PageRevealLayer from '@/components/PageRevealLayer.vue'
import { usePageEnter } from '@/composables/usePageEnter'

const props = defineProps({
  tabId: { type: String, default: '' },
  /** Static pages (e.g. Other) — no data wipe/reveal layer */
  chromeOnly: { type: Boolean, default: false },
})

const { contentVisible, animateReveal, direction, durationMs } = usePageEnter(props.tabId)
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

.tabDataShell.waiting {
  overflow: hidden;
}
</style>
