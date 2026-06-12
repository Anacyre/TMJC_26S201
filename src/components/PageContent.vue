<template>
  <view class="pageContentShell">
    <view v-if="$slots.chrome" class="pageContentChrome">
      <slot name="chrome" />
    </view>

    <view
      class="pageDataShell"
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
  </view>
</template>

<script setup>
import PageRevealLayer from '@/components/PageRevealLayer.vue'
import { usePageEnter } from '@/composables/usePageEnter'

const { contentVisible, animateReveal, direction, durationMs } = usePageEnter('')
</script>

<style scoped>
.pageContentShell {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
  z-index: 1;
}

.pageContentChrome {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.pageDataShell {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  width: 100%;
}

.pageDataShell.waiting {
  overflow: hidden;
}
</style>
