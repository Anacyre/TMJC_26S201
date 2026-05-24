<template>
  <view class="dock" :class="themeClass">
    <view class="bar">
      <view
        v-for="tab in tabs"
        :key="tab.id"
        class="slot"
        :class="{ active: active === tab.id, pressed: pressed === tab.id }"
        role="button"
        :aria-label="tab.label"
        @touchstart="pressed = tab.id"
        @touchend="pressed = ''"
        @touchcancel="pressed = ''"
        @tap="go(tab.id)"
      >
        <view class="glyph" :class="'g-' + tab.id">
          <template v-if="tab.id === 'tasks'">
            <view class="line top" />
            <view class="line bottom" />
          </template>
          <template v-else-if="tab.id === 'community'">
            <view class="dot a" />
            <view class="dot b" />
            <view class="bridge" />
          </template>
          <template v-else-if="tab.id === 'home'">
            <view class="roof" />
            <view class="base" />
          </template>
          <template v-else-if="tab.id === 'study'">
            <view class="sheet a" />
            <view class="sheet b" />
          </template>
          <template v-else>
            <view class="gridDot" />
            <view class="gridDot" />
            <view class="gridDot" />
            <view class="gridDot" />
          </template>
        </view>
        <view class="activeDot" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { navTab } from '@/lib/navigation'

const props = defineProps({ active: { type: String, default: 'home' } })
const { themeClass } = useTheme()
const pressed = ref('')

const tabs = [
  { id: 'tasks', label: 'Tasks' },
  { id: 'community', label: 'Community' },
  { id: 'home', label: 'Home' },
  { id: 'study', label: 'Study' },
  { id: 'other', label: 'Other' },
]

function go(key) {
  if (key === props.active) return
  navTab(key, props.active)
}
</script>

<style scoped>
.dock {
  position: fixed;
  left: var(--shell-bar-inset, 16rpx);
  right: var(--shell-bar-inset, 16rpx);
  bottom: calc(var(--shell-bar-inset, 16rpx) + env(safe-area-inset-bottom));
  z-index: 40;
  height: var(--shell-bar-height, 116rpx);
}

.bar {
  height: 100%;
  border-radius: 34rpx;
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  align-items: center;
  padding: 0 10rpx;
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

.slot {
  position: relative;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10rpx;
  opacity: 0.46;
  transition: opacity 180ms ease, transform 140ms cubic-bezier(0.34, 1.2, 0.64, 1);
}

.slot.active {
  opacity: 1;
}

.slot.pressed {
  transform: scale(0.88);
}

.glyph {
  position: relative;
  width: 44rpx;
  height: 40rpx;
  transition: transform 200ms cubic-bezier(0.34, 1.2, 0.64, 1);
}

.slot.active .glyph {
  transform: scale(1.08);
}

/* tasks */
.g-tasks .line {
  position: absolute;
  left: 0;
  right: 0;
  border-radius: 10rpx;
  border: 2.4rpx solid rgba(16, 24, 40, 0.55);
  transition: border-color 180ms ease;
}
.g-tasks .top { top: 2rpx; height: 10rpx; }
.g-tasks .bottom { bottom: 2rpx; left: 6rpx; right: -6rpx; height: 10rpx; }

/* community */
.g-community .dot {
  position: absolute;
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  border: 2.4rpx solid rgba(16, 24, 40, 0.55);
  transition: border-color 180ms ease;
}
.g-community .a { left: 2rpx; top: 10rpx; }
.g-community .b { right: 2rpx; top: 10rpx; }
.g-community .bridge {
  position: absolute;
  left: 10rpx;
  right: 10rpx;
  top: 16rpx;
  height: 2.4rpx;
  background: rgba(16, 24, 40, 0.55);
  transition: background 180ms ease;
}

/* home */
.g-home .roof {
  position: absolute;
  top: 4rpx;
  left: 50%;
  width: 28rpx;
  height: 16rpx;
  margin-left: -14rpx;
  border-top: 2.6rpx solid rgba(16, 24, 40, 0.55);
  border-left: 2.6rpx solid rgba(16, 24, 40, 0.55);
  border-right: 2.6rpx solid rgba(16, 24, 40, 0.55);
  border-top-left-radius: 8rpx;
  border-top-right-radius: 8rpx;
  transition: border-color 180ms ease;
}
.g-home .base {
  position: absolute;
  bottom: 2rpx;
  left: 6rpx;
  right: 6rpx;
  height: 14rpx;
  border: 2.6rpx solid rgba(16, 24, 40, 0.55);
  border-top: none;
  border-bottom-left-radius: 6rpx;
  border-bottom-right-radius: 6rpx;
  transition: border-color 180ms ease;
}

/* study */
.g-study .sheet {
  position: absolute;
  border-radius: 8rpx;
  border: 2.4rpx solid rgba(16, 24, 40, 0.55);
  transition: border-color 180ms ease;
}
.g-study .sheet.a { inset: 0 8rpx 6rpx 0; }
.g-study .sheet.b { inset: 6rpx 0 0 8rpx; }

/* other grid */
.g-other {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6rpx;
  width: 32rpx;
  height: 32rpx;
  margin: 4rpx auto 0;
}
.gridDot {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: rgba(16, 24, 40, 0.55);
  transition: background 180ms ease;
}

.t-dark .g-tasks .line,
.t-dark .g-community .dot,
.t-dark .g-study .sheet,
.t-dark .g-home .roof,
.t-dark .g-home .base {
  border-color: rgba(245, 247, 255, 0.58);
}
.t-dark .g-community .bridge { background: rgba(245, 247, 255, 0.58); }
.t-dark .gridDot { background: rgba(245, 247, 255, 0.58); }

.slot.active .g-tasks .line,
.slot.active .g-community .dot,
.slot.active .g-study .sheet,
.slot.active .g-home .roof,
.slot.active .g-home .base {
  border-color: rgba(46, 99, 255, 0.95);
}
.slot.active .g-community .bridge { background: rgba(46, 99, 255, 0.95); }
.slot.active .gridDot { background: rgba(46, 99, 255, 0.95); }

.activeDot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: transparent;
  transform: scale(0);
  transition: transform 200ms cubic-bezier(0.34, 1.2, 0.64, 1), background 180ms ease;
}

.slot.active .activeDot {
  background: rgba(46, 99, 255, 0.95);
  transform: scale(1);
}

.t-dark .slot.active .activeDot {
  background: rgba(170, 200, 255, 0.96);
}
</style>
