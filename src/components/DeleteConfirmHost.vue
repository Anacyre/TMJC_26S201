<template>
  <!-- #ifdef H5 -->
  <Teleport to="body">
    <view
      v-if="isOpen"
      class="backdrop"
      :class="themeClass"
      @tap="cancelDeleteDialog"
      @click="onBackdropClick"
      @touchmove.stop.prevent
    >
      <view class="panel" @tap.stop @click.stop>
        <text class="title">{{ title }}</text>
        <text v-if="message" class="message">{{ message }}</text>
        <view class="actions">
          <view
            class="btn cancel tap"
            role="button"
            @tap.stop="cancelDeleteDialog"
            @click.stop="cancelDeleteDialog"
          >
            <text class="btnText">{{ cancelLabel }}</text>
          </view>
          <view
            class="btn danger tap"
            role="button"
            @tap.stop="acceptDeleteDialog"
            @click.stop="acceptDeleteDialog"
          >
            <text class="btnTextDanger">{{ confirmLabel }}</text>
          </view>
        </view>
      </view>
    </view>
  </Teleport>
  <!-- #endif -->
  <!-- #ifndef H5 -->
  <view
    v-if="isOpen"
    class="backdrop"
    :class="themeClass"
    @tap="cancelDeleteDialog"
    @touchmove.stop.prevent
  >
    <view class="panel" @tap.stop>
      <text class="title">{{ title }}</text>
      <text v-if="message" class="message">{{ message }}</text>
      <view class="actions">
        <view class="btn cancel tap" role="button" @tap.stop="cancelDeleteDialog">
          <text class="btnText">{{ cancelLabel }}</text>
        </view>
        <view class="btn danger tap" role="button" @tap.stop="acceptDeleteDialog">
          <text class="btnTextDanger">{{ confirmLabel }}</text>
        </view>
      </view>
    </view>
  </view>
  <!-- #endif -->
</template>

<script setup>
import { computed } from 'vue'
import {
  dialog,
  cancelDeleteDialog,
  acceptDeleteDialog,
} from '@/composables/useConfirmDelete'
import { useTheme } from '@/composables/useTheme'

const { themeClass } = useTheme()

const isOpen = computed(() => dialog.value.open)
const title = computed(() => dialog.value.title)
const message = computed(() => dialog.value.message)
const confirmLabel = computed(() => dialog.value.confirmLabel)
const cancelLabel = computed(() => dialog.value.cancelLabel)

function onBackdropClick(e) {
  if (e.target === e.currentTarget) cancelDeleteDialog()
}
</script>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 100060;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx 36rpx;
  background: rgba(8, 12, 24, 0.42);
  pointer-events: auto;
  touch-action: none;
  animation: fadeIn 180ms var(--ease-soft, ease) both;
}
.t-dark.backdrop {
  background: rgba(0, 0, 0, 0.58);
}

.panel {
  width: 100%;
  max-width: 560rpx;
  padding: 32rpx 28rpx 24rpx;
  border-radius: var(--radius-modal, 28rpx);
  background: var(--surface-overlay, rgba(255, 255, 255, 0.94));
  border: 1rpx solid var(--divider);
  box-shadow: 0 28rpx 80rpx rgba(12, 20, 40, 0.18);
  animation: panelIn 200ms cubic-bezier(0.34, 1.2, 0.64, 1) both;
  pointer-events: auto;
  position: relative;
  z-index: 1;
}
.t-dark .panel {
  background: rgba(26, 29, 33, 0.96);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 32rpx 88rpx rgba(0, 0, 0, 0.55);
}

.title {
  display: block;
  font-size: 30rpx;
  font-weight: var(--weight-bold, 740);
  color: var(--text-primary, rgba(16, 24, 40, 0.92));
  letter-spacing: 0.2rpx;
}
.message {
  display: block;
  margin-top: 12rpx;
  font-size: 24rpx;
  line-height: 1.45;
  color: var(--text-secondary, rgba(16, 24, 40, 0.58));
}

.actions {
  margin-top: 28rpx;
  display: flex;
  gap: 12rpx;
}
.btn {
  flex: 1;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  pointer-events: auto;
  transition: transform 140ms cubic-bezier(0.34, 1.2, 0.64, 1),
    background 160ms ease,
    border-color 160ms ease;
}
.btn:active {
  transform: scale(0.97);
}
.btn.cancel {
  background: rgba(16, 24, 40, 0.05);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
}
.t-dark .btn.cancel {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
}
.btn.danger {
  background: linear-gradient(180deg, rgba(255, 105, 105, 0.98), rgba(220, 70, 85, 0.98));
  border: 1rpx solid rgba(220, 70, 85, 0.35);
  box-shadow: 0 12rpx 32rpx rgba(220, 70, 85, 0.28);
}
.t-dark .btn.danger {
  background: linear-gradient(180deg, rgba(255, 95, 110, 0.92), rgba(200, 55, 72, 0.95));
  border-color: rgba(255, 120, 130, 0.22);
  box-shadow: 0 14rpx 36rpx rgba(180, 40, 60, 0.35);
}

.btnText {
  font-size: 24rpx;
  font-weight: var(--weight-semibold, 680);
  color: var(--text-primary, rgba(16, 24, 40, 0.88));
  pointer-events: none;
}
.btnTextDanger {
  font-size: 24rpx;
  font-weight: var(--weight-semibold, 680);
  color: #fff;
  pointer-events: none;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes panelIn {
  from {
    opacity: 0;
    transform: scale(0.94) translateY(8rpx);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
