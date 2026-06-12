<template>
  <view class="headerWrap">
    <view class="shell" :class="[themeClass, navMode]">
    <view class="bar">
      <view class="side left">
        <view v-if="navMode === 'brand'" class="brand">
          <view
            ref="logoHitRef"
            class="logoHit"
            :class="{ pressing: logoPressing }"
            role="button"
            aria-label="Tap to go home, hold to open undo"
            @longpress.stop="onLogoLongPress"
            <!-- #ifndef H5 -->
            @touchstart.stop="onLogoPressStart"
            @touchend.stop="onLogoPressEnd"
            @touchcancel.stop="onLogoPressEnd"
            <!-- #endif -->
          >
            <ClassLogo size="lg" />
          </view>
          <text class="brandText tap" role="button" @tap.stop="goHome">26S201</text>
        </view>
        <BackButton v-else />
      </view>

      <view class="center">
        <view
          v-if="navMode === 'back' && title"
          class="titleUndoHit"
          role="button"
          aria-label="Open undo menu (long press)"
          @longpress.stop="onLogoLongPress"
          @touchstart.stop="onLogoPressStart"
          @touchend.stop="onLogoPressEnd"
          @touchcancel.stop="onLogoPressEnd"
          @mousedown.stop="onLogoPressStart"
          @mouseup.stop="onLogoPressEnd"
          @mouseleave.stop="onLogoPressEnd"
        >
          <text class="title" :number-of-lines="1">{{ title }}</text>
        </view>
      </view>

      <view class="side right">
        <AdminToggle v-if="isRealAdmin" />
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
    <view class="spacer" aria-hidden="true" />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useGlobalSearch } from '@/composables/useGlobalSearch'
import { useUserStore } from '@/composables/useUserStore'
import { useAdminMode } from '@/composables/useAdminMode'
import { navTo, pageAnim } from '@/lib/navigation'
import ThemeToggle from '@/components/ThemeToggle.vue'
import AdminToggle from '@/components/AdminToggle.vue'
import ClassLogo from '@/components/ClassLogo.vue'
import BackButton from '@/components/BackButton.vue'
import { useLogoUndoPress } from '@/composables/useLogoUndoPress'

const props = defineProps({
  title: { type: String, default: '' },
  navMode: { type: String, default: 'brand' },
  showAvatar: { type: Boolean, default: true },
})

const { themeClass } = useTheme()
const { openSearch } = useGlobalSearch()
const { currentUser } = useUserStore()
const { isRealAdmin } = useAdminMode()
const logoHitRef = ref(null)
const { logoPressing, onLogoLongPress, onLogoPressStart, onLogoPressEnd } = useLogoUndoPress(goHome, logoHitRef)

const initials = computed(() =>
  (currentUser.value.name || '?')
    .split(' ')
    .map((x) => x[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
)
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
.headerWrap {
  width: 100%;
}

.shell {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 100;
  width: 100%;
  padding: calc(env(safe-area-inset-top) + var(--shell-bar-margin-top, 12rpx)) var(--shell-bar-inset, 20rpx) 0;
  box-sizing: border-box;
}

.spacer {
  height: var(--shell-header-offset);
  width: 100%;
  flex-shrink: 0;
}

.bar {
  height: var(--shell-bar-height, 116rpx);
  width: 100%;
  border-radius: 28rpx;
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.68);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  box-shadow: 0 12rpx 40rpx rgba(12, 20, 40, 0.06);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  transition: background 240ms ease, border-color 240ms ease;
}

.t-dark .bar {
  background: rgba(26, 29, 33, 0.78);
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.35);
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
  max-width: 42%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 8rpx;
}
.logoHit {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12rpx;
  margin: -12rpx;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  cursor: pointer;
  border-radius: 20rpx;
  transition: transform 0.16s ease, background 0.16s ease;
}
.logoHit::after {
  content: '';
  position: absolute;
  inset: 4rpx;
  border-radius: 18rpx;
  border: 2rpx solid transparent;
  pointer-events: none;
  transition: border-color 0.16s ease, opacity 0.16s ease;
}
.logoHit.pressing {
  transform: scale(0.9);
  background: rgba(46, 99, 255, 0.1);
}
.logoHit.pressing::after {
  border-color: rgba(46, 99, 255, 0.45);
  opacity: 1;
}
.t-dark .logoHit.pressing {
  background: rgba(120, 160, 255, 0.14);
}
.t-dark .logoHit.pressing::after {
  border-color: rgba(120, 160, 255, 0.5);
}
.logoHit :deep(.logoMark) {
  pointer-events: none;
}
.brandText {
  font-size: 26rpx;
  font-weight: 740;
  letter-spacing: 0.6rpx;
  color: rgba(16, 24, 40, 0.78);
}
.t-dark .brandText { color: rgba(245, 247, 255, 0.84); }

.titleUndoHit {
  max-width: 100%;
  padding: 12rpx 16rpx;
  margin: -12rpx -8rpx;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
  pointer-events: auto;
}
.title {
  font-size: 26rpx;
  font-weight: 640;
  color: rgba(16, 24, 40, 0.66);
  letter-spacing: 0.2rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  text-align: center;
  display: block;
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
</style>
