<template>
  <view class="header" :class="[themeClass, { back: navMode === 'back' }]">
    <view v-if="navMode === 'brand'" class="left brand" role="button" @tap="goHome">
      <view class="logoDot" />
      <text class="brandText">26S201</text>
    </view>
    <view v-else class="left backBtn" role="button" @tap="goBack">
      <text class="backChevron">‹</text>
      <text class="backLabel">Back</text>
    </view>

    <text v-if="navMode === 'back'" class="title">{{ title }}</text>
    <view v-else class="title spacer" />

    <view class="right">
      <view v-if="isAdmin" class="adminBadge"><text class="adminBadgeText">ADMIN</text></view>
      <view class="iconBtn" role="button" @tap="openSearch"><text class="iconText">⌕</text></view>
      <ThemeToggle />
      <view
        v-if="resolvedShowAvatar"
        class="avatar"
        role="button"
        @tap="openProfile"
      ><text class="avatarText">{{ initials }}</text></view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useGlobalSearch } from '@/composables/useGlobalSearch'
import { useUserStore } from '@/composables/useUserStore'
import ThemeToggle from '@/components/ThemeToggle.vue'

const props = defineProps({
  title: { type: String, default: 'Dashboard' },
  /** brand: home (logo + avatar). back: chevron + title (no avatar by default). */
  navMode: { type: String, default: 'brand' },
  showAvatar: { type: Boolean, default: null },
})

const { themeClass } = useTheme()
const { openSearch } = useGlobalSearch()
const { currentUser } = useUserStore()
const initials = computed(() =>
  (currentUser.value.name || '?')
    .split(' ')
    .map((x) => x[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
)
const isAdmin = computed(() => currentUser.value.role === 'admin')
const resolvedShowAvatar = computed(() =>
  props.showAvatar == null ? props.navMode === 'brand' : props.showAvatar
)

function goHome() {
  uni.navigateTo({ url: '/pages/index/index', animationType: 'fade-in', animationDuration: 200 })
}
function goBack() {
  const pages = getCurrentPages ? getCurrentPages() : []
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.reLaunch({ url: '/pages/index/index' })
  }
}
function openProfile() {
  uni.navigateTo({
    url: `/pages/member/profile?id=${currentUser.value.id}`,
    animationType: 'slide-in-right',
    animationDuration: 220,
  })
}
</script>

<style scoped>
.header {
  position: sticky;
  top: 0;
  z-index: 15;
  padding: 26rpx 24rpx 14rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  background: rgba(248, 250, 255, 0.62);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  transition: background 240ms ease, border-color 240ms ease;
}
.t-dark.header {
  background: rgba(15, 18, 22, 0.6);
}
.header.back {
  padding-top: 22rpx;
  padding-bottom: 12rpx;
}

.left {
  flex-shrink: 0;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8rpx;
  border-radius: 999rpx;
  transition: transform 180ms ease, background 220ms ease, border-color 220ms ease;
}
.left:active {
  transform: scale(0.985);
}

.brand {
  padding: 10rpx 14rpx;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(255, 255, 255, 0.55);
}
.t-dark .brand {
  background: rgba(255, 255, 255, 0.06);
  border: 1rpx solid rgba(255, 255, 255, 0.08);
}
.logoDot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: linear-gradient(180deg, #6aa6ff, #2e63ff);
  box-shadow: 0 0 0 6rpx rgba(83, 147, 255, 0.18);
}
.brandText {
  font-size: 20rpx;
  font-weight: 740;
  color: rgba(16, 24, 40, 0.86);
}
.t-dark .brandText {
  color: rgba(245, 247, 255, 0.9);
}

.backBtn {
  padding: 10rpx 14rpx 10rpx 10rpx;
  background: rgba(255, 255, 255, 0.55);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
}
.t-dark .backBtn {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}
.backChevron {
  font-size: 30rpx;
  font-weight: 300;
  color: rgba(46, 99, 255, 0.95);
  line-height: 1;
  margin-top: -2rpx;
}
.backLabel {
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.7);
}
.t-dark .backLabel {
  color: rgba(245, 247, 255, 0.74);
}

.title {
  flex: 1;
  text-align: center;
  font-size: 22rpx;
  font-weight: 640;
  color: rgba(16, 24, 40, 0.66);
  letter-spacing: 0.2rpx;
  padding: 0 8rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.t-dark .title {
  color: rgba(245, 247, 255, 0.7);
}
.title.spacer {
  flex: 1;
}

.right {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.iconBtn {
  width: 62rpx;
  height: 46rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(14px);
  transition: transform 180ms ease, background 220ms ease;
}
.t-dark .iconBtn {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
}
.iconBtn:active {
  transform: scale(0.94);
}
.iconText {
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.72);
}
.t-dark .iconText {
  color: rgba(245, 247, 255, 0.78);
}

.avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(46, 99, 255, 0.12);
  border: 1rpx solid rgba(46, 99, 255, 0.22);
  transition: transform 180ms ease;
}
.avatar:active {
  transform: scale(0.94);
}
.avatarText {
  font-size: 18rpx;
  font-weight: 760;
  color: rgba(46, 99, 255, 0.96);
}
.t-dark .avatar {
  background: rgba(120, 160, 255, 0.16);
  border-color: rgba(120, 160, 255, 0.32);
}
.t-dark .avatarText {
  color: rgba(170, 200, 255, 0.95);
}

.adminBadge {
  padding: 6rpx 12rpx;
  border-radius: 999rpx;
  background: linear-gradient(180deg, rgba(255, 184, 0, 0.95), rgba(255, 130, 0, 0.95));
  box-shadow: 0 6rpx 16rpx rgba(255, 140, 0, 0.32);
}
.adminBadgeText {
  font-size: 16rpx;
  font-weight: 800;
  letter-spacing: 0.8rpx;
  color: rgba(255, 255, 255, 0.98);
}
</style>
