<template>
  <view class="globalHosts" aria-hidden="true">
    <FocusAmbient />
    <!-- #ifndef H5 -->
    <GlobalOverlayHost />
    <!-- #endif -->
  </view>
</template>

<script setup>
import FocusAmbient from '@/components/FocusAmbient.vue'
import GlobalOverlayHost from '@/components/GlobalOverlayHost.vue'
</script>

<style scoped>
.globalHosts {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}
</style>
