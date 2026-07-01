<template>
  <Teleport to="body">
    <view v-if="open" class="overlay" :class="[themeClass, { show: visible }]" @tap="close">
      <view class="sheet" @tap.stop>
        <view class="grabber" />
        <text class="title">Appearance</text>
        <text class="sub">Theme, layout, swipe gestures, and page motion</text>

        <view class="rows">
          <view class="row">
            <view class="rowText">
              <text class="rowTitle">Dark mode</text>
              <text class="rowHint">Switch light and dark theme</text>
            </view>
            <view
              class="toggle"
              :class="{ on: isDark }"
              role="switch"
              :aria-checked="isDark"
              @tap="onThemeToggle"
            >
              <view class="toggleKnob" />
            </view>
          </view>

          <view class="row">
            <view class="rowText">
              <text class="rowTitle">Swipe: left hide, right delete</text>
              <text class="rowHint">{{ swipeLayoutToggleHint }}</text>
            </view>
            <view
              class="toggle"
              :class="{ on: swipeLeftHideRightDelete }"
              role="switch"
              :aria-checked="swipeLeftHideRightDelete"
              @tap="onSwipeLayoutToggle"
            >
              <view class="toggleKnob" />
            </view>
          </view>

          <view class="row">
            <view class="rowText">
              <text class="rowTitle">Page transitions</text>
              <text class="rowHint">Slide and fade when opening pages or tabs</text>
            </view>
            <view
              class="toggle"
              :class="{ on: enablePageTransitions }"
              role="switch"
              :aria-checked="enablePageTransitions"
              @tap="onPageTransitionsToggle"
            >
              <view class="toggleKnob" />
            </view>
          </view>

          <view class="row">
            <view class="rowText">
              <text class="rowTitle">Show focus time</text>
              <text class="rowHint">Weekly totals on home, apps, focus, and profile</text>
            </view>
            <view
              class="toggle"
              :class="{ on: showFocusTime }"
              role="switch"
              :aria-checked="showFocusTime"
              @tap="onFocusTimeToggle"
            >
              <view class="toggleKnob" />
            </view>
          </view>

          <view class="row">
            <view class="rowText">
              <text class="rowTitle">Today's focus on home</text>
              <text class="rowHint">Show task list under Recent notices</text>
            </view>
            <view
              class="toggle"
              :class="{ on: showHomeTodayFocus }"
              role="switch"
              :aria-checked="showHomeTodayFocus"
              @tap="onTodayFocusToggle"
            >
              <view class="toggleKnob" />
            </view>
          </view>

          <view class="row">
            <view class="rowText">
              <text class="rowTitle">Hide low-priority notice tasks</text>
              <text class="rowHint">Hide P3 tasks added from notices in the tasks list</text>
            </view>
            <view
              class="toggle"
              :class="{ on: hideNoticeP3Tasks }"
              role="switch"
              :aria-checked="hideNoticeP3Tasks"
              @tap="onHideNoticeP3Toggle"
            >
              <view class="toggleKnob" />
            </view>
          </view>
        </view>
      </view>
    </view>
  </Teleport>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useAppearancePrefs } from '@/composables/useAppearancePrefs'
import { useSwipeLayout } from '@/composables/useSwipeLayout'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'close'])

const { themeClass, isDark, toggleTheme } = useTheme()
const {
  showHomeTodayFocus,
  setShowHomeTodayFocus,
  showFocusTime,
  setShowFocusTime,
  swipeLeftHideRightDelete,
  setSwipeLeftHideRightDelete,
  enablePageTransitions,
  setEnablePageTransitions,
  hideNoticeP3Tasks,
  setHideNoticeP3Tasks,
} = useAppearancePrefs()
const { swipeLayoutToggleHint } = useSwipeLayout()
const visible = ref(false)

watch(
  () => props.open,
  async (v) => {
    if (v) {
      await nextTick()
      if (typeof requestAnimationFrame === 'function') {
        requestAnimationFrame(() => { visible.value = true })
      } else {
        setTimeout(() => { visible.value = true }, 16)
      }
    } else {
      visible.value = false
    }
  },
)

function close() {
  visible.value = false
  setTimeout(() => {
    emit('update:open', false)
    emit('close')
  }, 200)
}

function onThemeToggle() {
  toggleTheme()
}

function onTodayFocusToggle() {
  setShowHomeTodayFocus(!showHomeTodayFocus.value)
}

function onFocusTimeToggle() {
  setShowFocusTime(!showFocusTime.value)
}

function onSwipeLayoutToggle() {
  setSwipeLeftHideRightDelete(!swipeLeftHideRightDelete.value)
}

function onPageTransitionsToggle() {
  setEnablePageTransitions(!enablePageTransitions.value)
}

function onHideNoticeP3Toggle() {
  setHideNoticeP3Tasks(!hideNoticeP3Tasks.value)
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 10002;
  opacity: 0;
  pointer-events: none;
  background: rgba(8, 12, 24, 0.42);
  backdrop-filter: blur(12px);
  transition: opacity 0.22s ease;
}
.overlay.show {
  opacity: 1;
  pointer-events: auto;
}
.t-dark.overlay {
  background: rgba(0, 0, 0, 0.55);
}

.sheet {
  position: absolute;
  left: 14rpx;
  right: 14rpx;
  bottom: calc(14rpx + env(safe-area-inset-bottom));
  padding: 22rpx 24rpx 28rpx;
  border-radius: 34rpx;
  background: rgba(255, 255, 255, 0.94);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  box-shadow: 0 30rpx 90rpx rgba(12, 20, 40, 0.18);
}
.t-dark .sheet {
  background: rgba(26, 29, 33, 0.96);
  border-color: rgba(255, 255, 255, 0.08);
}

.grabber {
  width: 64rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.12);
  margin: 0 auto 18rpx;
}
.t-dark .grabber {
  background: rgba(255, 255, 255, 0.14);
}

.title {
  display: block;
  font-size: 30rpx;
  font-weight: 740;
  color: rgba(16, 24, 40, 0.92);
}
.t-dark .title {
  color: rgba(245, 247, 255, 0.92);
}

.sub {
  display: block;
  margin-top: 6rpx;
  margin-bottom: 22rpx;
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.5);
}
.t-dark .sub {
  color: rgba(245, 247, 255, 0.48);
}

.rows {
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18rpx;
  padding: 18rpx 18rpx;
  border-radius: 24rpx;
  background: rgba(16, 24, 40, 0.03);
  border: 1rpx solid rgba(16, 24, 40, 0.05);
}
.t-dark .row {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}

.rowText {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.rowTitle {
  font-size: 26rpx;
  font-weight: 680;
  color: rgba(16, 24, 40, 0.9);
}
.t-dark .rowTitle {
  color: rgba(245, 247, 255, 0.9);
}

.rowHint {
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.48);
  line-height: 1.35;
}
.t-dark .rowHint {
  color: rgba(245, 247, 255, 0.45);
}

.toggle {
  width: 78rpx;
  height: 42rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.12);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  position: relative;
  flex-shrink: 0;
  transition: background 200ms ease, border-color 200ms ease;
}
.t-dark .toggle {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.08);
}
.toggle.on {
  background: rgba(46, 99, 255, 0.22);
  border-color: rgba(46, 99, 255, 0.35);
}

.toggleKnob {
  position: absolute;
  top: 4rpx;
  left: 4rpx;
  width: 32rpx;
  height: 32rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.95);
  transition: transform 200ms ease;
}
.toggle.on .toggleKnob {
  transform: translateX(36rpx);
}
</style>
