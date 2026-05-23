<template>
  <view class="host" :class="themeClass">
    <view
      v-for="t in queue"
      :key="t.id"
      class="toast"
      :class="{ leaving: t.leaving }"
    >
      <text class="toastText">{{ t.message }}</text>
    </view>
  </view>
</template>

<script setup>
import { useToast } from '@/composables/useToast'
import { useTheme } from '@/composables/useTheme'

const { queue } = useToast()
const { themeClass } = useTheme()
</script>

<style scoped>
.host {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(140rpx + env(safe-area-inset-bottom));
  z-index: 999;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}

.toast {
  padding: 16rpx 28rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.78);
  border: 1rpx solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(18px);
  box-shadow: 0 12rpx 40rpx rgba(12, 20, 40, 0.1);
  animation: ds-toast-in 150ms cubic-bezier(0.34, 1.2, 0.64, 1) both;
}
.t-dark .toast {
  background: rgba(30, 33, 38, 0.82);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.4);
}
.toast.leaving {
  animation: ds-toast-out 150ms cubic-bezier(0.22, 0.61, 0.36, 1) both;
}

.toastText {
  font-size: 24rpx;
  font-weight: 640;
  color: rgba(16, 24, 40, 0.88);
  letter-spacing: 0.2rpx;
}
.t-dark .toastText {
  color: rgba(245, 247, 255, 0.88);
}
</style>
