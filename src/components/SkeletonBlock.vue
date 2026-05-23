<template>
  <view
    class="block skeleton-shimmer"
    :class="[themeClass, { circle: circle }]"
    :style="blockStyle"
  />
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({
  width: { type: String, default: '100%' },
  height: { type: String, default: '24rpx' },
  radius: { type: String, default: '12rpx' },
  circle: { type: Boolean, default: false },
})

const { themeClass } = useTheme()

const blockStyle = computed(() => ({
  width: props.width,
  height: props.height,
  borderRadius: props.circle ? '50%' : props.radius,
}))
</script>

<style scoped>
.block {
  flex-shrink: 0;
  opacity: 0.85;
}
</style>
