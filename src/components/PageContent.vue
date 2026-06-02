<template>
  <view class="pageContentShell">
    <PageRevealLayer
      :content-visible="contentVisible"
      :animate-reveal="animateReveal"
      :direction="direction"
      :duration-ms="durationMs"
    >
      <slot />
    </PageRevealLayer>
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
</style>
