<template>
  <view
    class="contextWrap"
    @contextmenu="onContextMenu"
    @longpress="onLongPress"
  >
    <slot />
  </view>
</template>

<script setup>
import { useDevice } from '@/composables/useDevice'

const emit = defineEmits(['activate'])

const { isDesktop } = useDevice()

function trigger(e) {
  e?.preventDefault?.()
  e?.stopPropagation?.()
  emit('activate')
}

function onContextMenu(e) {
  if (!isDesktop.value) return
  trigger(e)
}

function onLongPress(e) {
  trigger(e)
}
</script>

<style scoped>
.contextWrap {
  width: 100%;
}
</style>
