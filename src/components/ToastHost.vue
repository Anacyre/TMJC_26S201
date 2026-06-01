<template>
  <!-- #ifdef H5 -->
  <Teleport to="body">
    <view class="host" :class="themeClass">
      <view
        v-for="t in queue"
        :key="t.id"
        class="toast"
        :class="{ leaving: t.leaving, withUndo: !!t.onUndo }"
      >
        <text class="toastText">{{ t.message }}</text>
        <view
          v-if="t.onUndo"
          class="undoBtn tap"
          role="button"
          @tap.stop="onUndoTap(t)"
        >
          <text class="undoText">{{ t.undoLabel || 'Undo' }}</text>
        </view>
      </view>
    </view>
  </Teleport>
  <!-- #endif -->
  <!-- #ifndef H5 -->
  <view class="host" :class="themeClass">
    <view
      v-for="t in queue"
      :key="t.id"
      class="toast"
      :class="{ leaving: t.leaving, withUndo: !!t.onUndo }"
    >
      <text class="toastText">{{ t.message }}</text>
      <view
        v-if="t.onUndo"
        class="undoBtn tap"
        role="button"
        @tap.stop="onUndoTap(t)"
      >
        <text class="undoText">{{ t.undoLabel || 'Undo' }}</text>
      </view>
    </view>
  </view>
  <!-- #endif -->
</template>

<script setup>
import { queue } from '@/composables/useToast'
import { toast } from '@/composables/useToast'
import { useTheme } from '@/composables/useTheme'

const { themeClass } = useTheme()

function onUndoTap(item) {
  if (!item?.onUndo) return
  toast.handleUndo(item)
}
</script>

<style scoped>
.host {
  position: fixed;
  left: 0;
  right: 0;
  bottom: calc(140rpx + env(safe-area-inset-bottom));
  z-index: 10001;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
}

.toast {
  padding: 16rpx 20rpx 16rpx 28rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.78);
  border: 1rpx solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(18px);
  box-shadow: 0 12rpx 40rpx rgba(12, 20, 40, 0.1);
  animation: ds-toast-in 150ms cubic-bezier(0.34, 1.2, 0.64, 1) both;
  display: flex;
  align-items: center;
  gap: 14rpx;
  max-width: 92vw;
}
.toast.withUndo {
  pointer-events: auto;
  padding-right: 12rpx;
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

.undoBtn {
  flex-shrink: 0;
  height: 52rpx;
  padding: 0 20rpx;
  border-radius: 999rpx;
  background: rgba(46, 99, 255, 0.12);
  border: 1rpx solid rgba(46, 99, 255, 0.22);
  display: flex;
  align-items: center;
  justify-content: center;
}
.t-dark .undoBtn {
  background: rgba(46, 99, 255, 0.2);
  border-color: rgba(120, 160, 255, 0.28);
}
.undoBtn:active {
  transform: scale(0.96);
}
.undoText {
  font-size: 22rpx;
  font-weight: 700;
  color: rgba(46, 99, 255, 0.96);
}
.t-dark .undoText {
  color: rgba(170, 200, 255, 0.96);
}
</style>
