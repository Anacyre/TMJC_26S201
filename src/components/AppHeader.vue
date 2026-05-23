<template>
  <view class="shell" :class="[themeClass, navMode]">
    <view class="bar">
      <view class="side left">
        <view v-if="navMode === 'brand'" class="brand" role="button" @tap="goHome">
          <ClassLogo size="lg" />
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
        <ThemeToggle size="lg" />
        <view v-if="resolvedShowAvatar" class="avatar" role="button" @tap="openProfile">
          <text class="avatarText">{{ initials }}</text>
        </view>
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
.shell {
  position: sticky;
  top: 0;
  z-index: 15;
  padding: calc(var(--shell-bar-inset, 16rpx) + env(safe-area-inset-top)) var(--shell-bar-inset, 16rpx) 12rpx;
}

.bar {
  height: var(--shell-bar-height, 116rpx);
  border-radius: 34rpx;
  display: flex;
  align-items: center;
  padding: 0 14rpx;
  background: rgba(255, 255, 255, 0.68);
  border: 1rpx solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 30rpx 80rpx rgba(12, 20, 40, 0.12);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: background 240ms ease, border-color 240ms ease;
}

.t-dark .bar {
  background: rgba(26, 29, 33, 0.78);
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 34rpx 100rpx rgba(0, 0, 0, 0.55);
}

.side {
  flex: 1;
  display: flex;
  align-items: center;
  min-width: 0;
  z-index: 1;
}
.side.left { justify-content: flex-start; }
.side.right {
  justify-content: flex-end;
  gap: 10rpx;
}

.center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  max-width: 38%;
  pointer-events: none;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 8rpx;
  transition: transform 180ms ease;
}
.brand:active { transform: scale(0.96); }
.brandText {
  font-size: 26rpx;
  font-weight: 740;
  letter-spacing: 0.6rpx;
  color: rgba(16, 24, 40, 0.78);
}
.t-dark .brandText { color: rgba(245, 247, 255, 0.84); }

.title {
  font-size: 26rpx;
  font-weight: 640;
  color: rgba(16, 24, 40, 0.66);
  letter-spacing: 0.2rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-align: center;
}
.t-dark .title { color: rgba(245, 247, 255, 0.7); }

.iconBtn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(255, 255, 255, 0.55);
  transition: transform 140ms cubic-bezier(0.34, 1.2, 0.64, 1), background 220ms ease;
}
.t-dark .iconBtn {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
}
.iconBtn:active { transform: scale(0.9); }

.searchGlyph {
  position: relative;
  width: 30rpx;
  height: 30rpx;
}
.searchRing {
  position: absolute;
  top: 0;
  left: 0;
  width: 22rpx;
  height: 22rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(16, 24, 40, 0.7);
}
.t-dark .searchRing { border-color: rgba(245, 247, 255, 0.78); }
.searchHandle {
  position: absolute;
  bottom: 2rpx;
  right: 2rpx;
  width: 12rpx;
  height: 2rpx;
  background: rgba(16, 24, 40, 0.7);
  border-radius: 999rpx;
  transform: rotate(45deg);
}
.t-dark .searchHandle { background: rgba(245, 247, 255, 0.78); }

.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(46, 99, 255, 0.12);
  border: 1rpx solid rgba(46, 99, 255, 0.22);
  transition: transform 140ms cubic-bezier(0.34, 1.2, 0.64, 1);
}
.avatar:active { transform: scale(0.9); }
.avatarText {
  font-size: 22rpx;
  font-weight: 760;
  color: rgba(46, 99, 255, 0.96);
}
.t-dark .avatar {
  background: rgba(120, 160, 255, 0.16);
  border-color: rgba(120, 160, 255, 0.32);
}
.t-dark .avatarText { color: rgba(170, 200, 255, 0.95); }

.adminBadge {
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(46, 99, 255, 0.14);
  border: 1rpx solid rgba(46, 99, 255, 0.22);
}
.adminBadgeText {
  font-size: 17rpx;
  font-weight: 800;
  letter-spacing: 0.8rpx;
  color: rgba(46, 99, 255, 0.96);
}
.t-dark .adminBadge {
  background: rgba(120, 160, 255, 0.18);
  border-color: rgba(120, 160, 255, 0.32);
}
.t-dark .adminBadgeText { color: rgba(170, 200, 255, 0.96); }
</style>
