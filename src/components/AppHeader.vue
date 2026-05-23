<template>
  <view class="header" :class="[themeClass, navMode]">
    <view class="side left">
      <view v-if="navMode === 'brand'" class="brand" role="button" @tap="goHome">
        <ClassLogo size="md" />
        <text class="brandText">26S201</text>
      </view>
      <BackButton v-else />
    </view>

    <view class="center">
      <text v-if="navMode === 'back' && title" class="title" :number-of-lines="1">{{ title }}</text>
    </view>

    <view class="side right">
      <view v-if="isAdmin" class="adminBadge"><text class="adminBadgeText">ADMIN</text></view>
      <view class="iconBtn" role="button" @tap="onOpenSearch">
        <view class="searchGlyph">
          <view class="searchRing" />
          <view class="searchHandle" />
        </view>
      </view>
      <ThemeToggle />
      <view v-if="resolvedShowAvatar" class="avatar" role="button" @tap="openProfile">
        <text class="avatarText">{{ initials }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useGlobalSearch } from '@/composables/useGlobalSearch'
import { useUserStore } from '@/composables/useUserStore'
import { isAdminMember } from '@/lib/classMembers'
import { navTo, pageAnim } from '@/lib/navigation'
import ThemeToggle from '@/components/ThemeToggle.vue'
import ClassLogo from '@/components/ClassLogo.vue'
import BackButton from '@/components/BackButton.vue'

const props = defineProps({
  title: { type: String, default: 'Dashboard' },
  /** brand: home-style logo bar. back: chevron + centered title. */
  navMode: { type: String, default: 'brand' },
  showAvatar: { type: Boolean, default: true },
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
const isAdmin = computed(() => isAdminMember(currentUser.value))
const resolvedShowAvatar = computed(() => props.showAvatar)

function goHome() {
  navTo('/pages/index/index', pageAnim.fade)
}
function onOpenSearch() {
  openSearch()
}
function openProfile() {
  navTo(`/pages/member/profile?id=${currentUser.value.id}`, pageAnim.slide)
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

.side {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
  z-index: 1;
}
.side.left {
  justify-content: flex-start;
}
.side.right {
  justify-content: flex-end;
  gap: 8rpx;
}

.center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  max-width: 42%;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 10rpx;
  padding: 8rpx 16rpx 8rpx 10rpx;
  border-radius: 999rpx;
  transition: transform 180ms ease;
}
.brand:active {
  transform: scale(0.985);
}
.brandText {
  font-size: 22rpx;
  font-weight: 740;
  letter-spacing: 0.6rpx;
  color: rgba(16, 24, 40, 0.78);
}
.t-dark .brandText {
  color: rgba(245, 247, 255, 0.84);
}

.title {
  font-size: 22rpx;
  font-weight: 640;
  color: rgba(16, 24, 40, 0.66);
  letter-spacing: 0.2rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-align: center;
}
.t-dark .title {
  color: rgba(245, 247, 255, 0.7);
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
.searchGlyph {
  position: relative;
  width: 22rpx;
  height: 22rpx;
}
.searchRing {
  position: absolute;
  top: 0;
  left: 0;
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  border: 1.5rpx solid rgba(16, 24, 40, 0.7);
}
.t-dark .searchRing { border-color: rgba(245, 247, 255, 0.78); }
.searchHandle {
  position: absolute;
  bottom: 0rpx;
  right: 0rpx;
  width: 9rpx;
  height: 1.6rpx;
  background: rgba(16, 24, 40, 0.7);
  border-radius: 999rpx;
  transform: rotate(45deg);
}
.t-dark .searchHandle { background: rgba(245, 247, 255, 0.78); }

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
  background: rgba(46, 99, 255, 0.14);
  border: 1rpx solid rgba(46, 99, 255, 0.22);
}
.adminBadgeText {
  font-size: 16rpx;
  font-weight: 800;
  letter-spacing: 0.8rpx;
  color: rgba(46, 99, 255, 0.96);
}
.t-dark .adminBadge {
  background: rgba(120, 160, 255, 0.18);
  border-color: rgba(120, 160, 255, 0.32);
}
.t-dark .adminBadgeText {
  color: rgba(170, 200, 255, 0.96);
}
</style>
