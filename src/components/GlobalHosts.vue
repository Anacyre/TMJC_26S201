<template>
  <view class="globalHosts" aria-hidden="true">
    <FocusAmbient v-show="!overlayInteractive" />
    <view class="overlayLayer" :class="{ interactive: overlayInteractive }">
      <GlobalOverlayHost />
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import FocusAmbient from '@/components/FocusAmbient.vue'
import GlobalOverlayHost from '@/components/GlobalOverlayHost.vue'
import { useUndoMenu } from '@/composables/useUndoMenu'
import { dialog } from '@/composables/useConfirmDelete'

const { undoMenuOpen } = useUndoMenu()
const overlayInteractive = computed(() => undoMenuOpen.value || dialog.value.open)
</script>

<style scoped>
.globalHosts {
  position: fixed;
  inset: 0;
  pointer-events: none;
}
.overlayLayer {
  position: fixed;
  inset: 0;
  pointer-events: none;
}
.overlayLayer.interactive {
  pointer-events: auto;
}
</style>
