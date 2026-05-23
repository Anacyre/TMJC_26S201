<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader title="Hidden notices" nav-mode="back" />

    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
      <view v-if="!list.length" class="empty">
        <EmptyState
          variant="notifications"
          title="Nothing hidden"
        />
      </view>

      <view v-for="n in list" :key="n.id" class="row">
        <view class="main">
          <text class="title" :number-of-lines="2">{{ n.title }}</text>
          <text class="meta">{{ n.subject }} · {{ n.type }}</text>
        </view>
        <view class="acts">
          <view class="iconBtn" role="button" @tap="restore(n.id)">
            <text class="glyph">↺</text>
          </view>
          <view class="iconBtn danger" role="button" @tap="remove(n.id)">
            <text class="glyph">×</text>
          </view>
        </view>
      </view>
      <view class="gap" />
    </scroll-view>

    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useTheme } from '@/composables/useTheme'
import { useNotificationStore } from '@/composables/useNotificationStore'
import { toast } from '@/composables/useToast'

const { themeClass } = useTheme()
const { hiddenNotifications, unhide, removeNotification } = useNotificationStore()

const list = computed(() => hiddenNotifications.value)

function restore(id) {
  unhide(id)
  toast.updated()
}

function remove(id) {
  removeNotification(id)
  toast.removed()
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  position: relative;
}
.bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(900rpx 600rpx at 50% 0%, rgba(40, 110, 255, 0.06), transparent 55%),
    linear-gradient(180deg, #f4f6fa, #eceef4);
}
.t-dark .bg {
  background: radial-gradient(900rpx 600rpx at 50% 0%, rgba(60, 120, 255, 0.08), transparent 55%),
    linear-gradient(180deg, #111315, #0e1014);
}
.scroll {
  position: relative;
  z-index: 1;
  height: calc(100vh - 200rpx);
  padding: 12rpx 24rpx 40rpx;
}
.hint {
  display: block;
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.42);
  padding: 0 4rpx 16rpx;
}
.t-dark .hint {
  color: rgba(245, 247, 255, 0.38);
}
.empty {
  padding: 80rpx 20rpx;
  text-align: center;
}
.emptyText {
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.4);
}
.t-dark .emptyText {
  color: rgba(245, 247, 255, 0.36);
}
.row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-top: 10rpx;
  padding: 14rpx 14rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.55);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  opacity: 0.92;
}
.t-dark .row {
  background: #1a1d21;
  border-color: rgba(255, 255, 255, 0.06);
}
.main {
  flex: 1;
  min-width: 0;
}
.title {
  font-size: 22rpx;
  font-weight: 680;
  color: rgba(16, 24, 40, 0.72);
}
.t-dark .title {
  color: rgba(245, 247, 255, 0.68);
}
.meta {
  display: block;
  margin-top: 6rpx;
  font-size: 18rpx;
  color: rgba(16, 24, 40, 0.42);
}
.t-dark .meta {
  color: rgba(245, 247, 255, 0.38);
}
.acts {
  display: flex;
  gap: 8rpx;
  flex-shrink: 0;
}
.iconBtn {
  width: 52rpx;
  height: 52rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 24, 40, 0.05);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
}
.t-dark .iconBtn {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
}
.iconBtn.danger {
  border-color: rgba(220, 80, 80, 0.2);
}
.glyph {
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.55);
  font-weight: 500;
}
.t-dark .glyph {
  color: rgba(245, 247, 255, 0.5);
}
.iconBtn.danger .glyph {
  color: rgba(200, 90, 90, 0.95);
}
.gap {
  height: 32rpx;
}
</style>
