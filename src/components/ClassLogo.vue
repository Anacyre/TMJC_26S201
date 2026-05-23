<template>
  <view class="logoMark" :class="[size, themeClass, { brand: brand }]" role="img" aria-label="26S201">
    <view class="ring outer" />
    <view class="ring inner" />
    <view class="centerLine" />
  </view>
</template>

<script setup>
import { useTheme } from '@/composables/useTheme'

defineProps({
  size: { type: String, default: 'md' },
  brand: { type: Boolean, default: false },
})

const { themeClass } = useTheme()
</script>

<style scoped>
.logoMark {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.logoMark.sm { width: 28rpx; height: 28rpx; }
.logoMark.md { width: 36rpx; height: 36rpx; }
.logoMark.lg { width: 56rpx; height: 56rpx; }

.ring {
  position: absolute;
  border-radius: 50%;
  border: 1.4rpx solid rgba(16, 24, 40, 0.62);
  transition: border-color 240ms ease, transform 240ms ease;
}
.ring.outer { inset: 0; }
.ring.inner {
  inset: 26%;
  border-style: solid;
  border-color: rgba(16, 24, 40, 0) rgba(16, 24, 40, 0.62) rgba(16, 24, 40, 0.62) rgba(16, 24, 40, 0);
  transform: rotate(-32deg);
}

.centerLine {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 36%;
  height: 1.4rpx;
  background: rgba(16, 24, 40, 0.4);
  transform: translate(-50%, -50%) rotate(28deg);
  transform-origin: center;
  border-radius: 999rpx;
}

.t-dark .ring,
.t-dark.logoMark .ring { border-color: rgba(245, 247, 255, 0.62); }
.t-dark .ring.inner,
.t-dark.logoMark .ring.inner {
  border-color: rgba(245, 247, 255, 0) rgba(245, 247, 255, 0.62) rgba(245, 247, 255, 0.62) rgba(245, 247, 255, 0);
}
.t-dark .centerLine,
.t-dark.logoMark .centerLine { background: rgba(245, 247, 255, 0.4); }
</style>
