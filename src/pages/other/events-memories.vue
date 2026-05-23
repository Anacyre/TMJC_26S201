<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader nav-mode="back" />
    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
      <view class="emptyWrap">
        <EmptyState
          variant="posts"
          title="No memories"
        />
      </view>
      <view class="gap" />
    </scroll-view>
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useTheme } from '@/composables/useTheme'
const { themeClass } = useTheme()
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; }
.bg { position: absolute; inset: 0; background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.16), transparent 60%), linear-gradient(180deg, #f8faff, #f1f4fa); }
.t-dark .bg { background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%), linear-gradient(180deg, #111315, #0e1014); }
.scroll { position: relative; z-index: 1; height: calc(100vh - var(--shell-header-offset, 148rpx)); padding: 6rpx 24rpx 40rpx; }
.emptyWrap { padding: 60rpx 0; }
.gap { height: 24rpx; }
</style>
