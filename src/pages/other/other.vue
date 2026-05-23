<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader title="Other" nav-mode="back" :show-avatar="false" />

    <view class="safe">
      <view class="card pad">
        <text class="title">Low-frequency tools</text>
        <text class="sub">A calm place for settings and archives.</text>

        <view class="list">
          <view v-for="x in entries" :key="x.key" class="row tap" @tap="openEntry(x)">
            <view class="left">
            <view class="icon"><text class="menuIcon">{{ x.icon }}</text></view>
              <view class="text">
                <text class="rowTitle">{{ x.title }}</text>
                <text class="rowSub">{{ x.sub }}</text>
              </view>
            </view>
            <text class="chev">›</text>
          </view>
        </view>
      </view>
    </view>

    <BottomNav active="other" />
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import BottomNav from '@/components/BottomNav.vue'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import { useTheme } from '@/composables/useTheme'

const { themeClass } = useTheme()

const entries = ref([
  { key: 'saved', title: 'Saved Items', sub: 'Bookmarks and quick access', icon: '⌁' },
  { key: 'hidden', title: 'Hidden Notifications', sub: 'Restore hidden updates', icon: '⟂' },
  { key: 'calendar', title: 'Calendar', sub: 'Schedule overview', icon: '▦' },
  { key: 'appearance', title: 'Appearance', sub: 'Theme and visual style', icon: '◐' },
  { key: 'memories', title: 'Events & Memories', sub: 'Timeline highlights', icon: '◷' },
  { key: 'about', title: 'About', sub: 'Class Operating System info', icon: 'i' },
])

function back() {
  uni.navigateBack()
}

function openEntry(x) {
  if (x.key === 'memories') return uni.navigateTo({ url: '/pages/other/events-memories' })
  if (x.key === 'hidden') return uni.navigateTo({ url: '/pages/notifications/hidden' })
  uni.showToast({ title: `${x.title} (demo)`, icon: 'none' })
}

onLoad(() => {})
onShow(() => {})
</script>

<style scoped>
.page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.18), transparent 60%),
    radial-gradient(900rpx 700rpx at 70% 30%, rgba(120, 180, 255, 0.14), transparent 65%),
    linear-gradient(180deg, rgba(248, 250, 255, 1), rgba(241, 244, 250, 1));
}

.t-dark .bg {
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%),
    radial-gradient(900rpx 700rpx at 70% 30%, rgba(100, 160, 255, 0.08), transparent 62%),
    linear-gradient(180deg, #111315, #0e1014);
}

.safe {
  position: relative;
  z-index: 1;
  padding: 8rpx 28rpx 180rpx;
}

.card {
  border-radius: 34rpx;
  background: rgba(255, 255, 255, 0.74);
  border: 1rpx solid rgba(255, 255, 255, 0.60);
  box-shadow: 0 22rpx 70rpx rgba(12, 20, 40, 0.10);
  backdrop-filter: blur(14px);
}

.t-dark .card {
  background: #1a1d21;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 22rpx 70rpx rgba(0, 0, 0, 0.4);
}

.pad {
  padding: 22rpx 22rpx;
}

.title {
  font-size: 30rpx;
  font-weight: 780;
  color: rgba(16, 24, 40, 0.92);
}

.t-dark .title {
  color: rgba(245, 247, 255, 0.92);
}

.sub {
  margin-top: 8rpx;
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.56);
}

.t-dark .sub {
  color: rgba(245, 247, 255, 0.50);
}

.list {
  margin-top: 18rpx;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14rpx 14rpx;
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
  transition: transform 180ms ease;
}

.t-dark .row {
  background: #23272d;
  border-color: rgba(255, 255, 255, 0.04);
}

.tap:active {
  transform: scale(0.985);
}

.left {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.icon {
  width: 46rpx;
  height: 46rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(46, 99, 255, 0.1);
  border: 1rpx solid rgba(46, 99, 255, 0.18);
}
.t-dark .icon {
  background: rgba(120, 160, 255, 0.16);
  border-color: rgba(120, 160, 255, 0.22);
}
.t-dark .menuIcon {
  color: rgba(170, 200, 255, 0.95);
}

.menuIcon {
  font-size: 22rpx;
  color: rgba(46, 99, 255, 0.95);
}

.text {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.rowTitle {
  font-size: 24rpx;
  font-weight: 720;
  color: rgba(16, 24, 40, 0.90);
}

.t-dark .rowTitle {
  color: rgba(245, 247, 255, 0.90);
}

.rowSub {
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.52);
}

.t-dark .rowSub {
  color: rgba(245, 247, 255, 0.48);
}

.chev {
  font-size: 30rpx;
  color: rgba(16, 24, 40, 0.32);
}

.t-dark .chev {
  color: rgba(245, 247, 255, 0.28);
}
</style>

