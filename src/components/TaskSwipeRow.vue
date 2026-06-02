<template>
  <view class="taskSwipe" :class="[themeClass, 'mode-' + mode, { dragging, snapBack }]">
    <view class="trackLeft" :class="{ visible: leftVisible }" :style="leftTrackStyle">
      <view class="single">
        <view
          class="btn act-delete wide"
          :class="{ pulse: deletePulse }"
          :style="deleteBtnStyle"
          role="button"
          @tap="onTap('delete')"
        >
          <view class="actionIcon ic-trash" />
        </view>
      </view>
    </view>

    <view
      v-if="showRightTrack"
      class="trackRight"
      :class="{ visible: rightVisible }"
      :style="rightTrackStyle"
    >
      <view class="single end">
        <view
          v-if="mode === 'active'"
          class="btn act-archive wide"
          :style="archiveBtnStyle"
          role="button"
          @tap="onTap('archive')"
        >
          <view class="actionIcon ic-archive" />
        </view>
        <view
          v-else
          class="btn act-restore wide"
          :style="restoreBtnStyle"
          role="button"
          @tap="onTap('restore')"
        >
          <view class="actionIcon ic-restore" />
        </view>
      </view>
    </view>

    <view
      class="surface"
      :class="surfaceClass"
      :style="surfaceStyle"
      @touchstart="onTouchStart"
      @touchmove.stop="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
    >
      <slot />
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useDevice } from '@/composables/useDevice'

const props = defineProps({
  /** active = swipe right delete / swipe left archive; archived = swipe right delete / swipe left restore */
  mode: { type: String, default: 'active' },
})

const emit = defineEmits(['action', 'commit'])

const { themeClass } = useTheme()
const { isDesktop } = useDevice()

const ACTIVE_DELETE_REVEAL = 84
const ACTIVE_DELETE_COMMIT_EXTRA = 108
const ACTIVE_DELETE_VISUAL_REVEAL = 112
const ACTIVE_ARCHIVE_REVEAL = 84
const ACTIVE_ARCHIVE_COMMIT_EXTRA = 88
const ACTIVE_ARCHIVE_VISUAL_REVEAL = 112
const ARCHIVED_REVEAL = 76
const ARCHIVED_COMMIT_EXTRA = 72

const startX = ref(0)
const startY = ref(0)
const dragging = ref(false)
const lockedAxis = ref('')
const baseOffset = ref(0)
const dragOffset = ref(0)
const snapBack = ref(false)
const vanish = ref(false)
const vanishDirection = ref('right')

const showRightTrack = computed(() => props.mode === 'active' || props.mode === 'archived')

const revealRight = computed(() =>
  props.mode === 'active' ? ACTIVE_DELETE_REVEAL : ARCHIVED_REVEAL
)
const revealLeft = computed(() =>
  props.mode === 'active' ? ACTIVE_ARCHIVE_REVEAL : ARCHIVED_REVEAL
)
const commitExtraRight = computed(() =>
  props.mode === 'active' ? ACTIVE_DELETE_COMMIT_EXTRA : ARCHIVED_COMMIT_EXTRA
)
const commitExtraLeft = computed(() =>
  props.mode === 'active' ? ACTIVE_ARCHIVE_COMMIT_EXTRA : ARCHIVED_COMMIT_EXTRA
)

const openThresholdRight = computed(() => Math.round(revealRight.value * 0.64))
const openThresholdLeft = computed(() => Math.round(revealLeft.value * 0.58))
const commitAtRight = computed(() => revealRight.value + commitExtraRight.value * 0.64)
const commitAtLeft = computed(() => -(revealLeft.value + commitExtraLeft.value * 0.64))

const displayOffset = computed(() => baseOffset.value + dragOffset.value)

const visualRevealRight = computed(() =>
  props.mode === 'active' ? ACTIVE_DELETE_VISUAL_REVEAL : revealRight.value * 1.25
)
const visualRevealLeft = computed(() =>
  props.mode === 'active' ? ACTIVE_ARCHIVE_VISUAL_REVEAL : revealLeft.value * 1.25
)

const rightProgress = computed(() => {
  const o = displayOffset.value
  if (o <= 0) return 0
  return Math.min(1, o / visualRevealRight.value)
})

const leftProgress = computed(() => {
  const o = displayOffset.value
  if (o >= 0) return 0
  return Math.min(1, -o / visualRevealLeft.value)
})

const commitProgressRight = computed(() => {
  const o = displayOffset.value
  const extra = commitExtraRight.value
  if (o <= revealRight.value || extra <= 0) return 0
  return Math.min(1, (o - revealRight.value) / extra)
})

const commitProgressLeft = computed(() => {
  const o = displayOffset.value
  const extra = commitExtraLeft.value
  const abs = -o
  if (abs <= revealLeft.value || extra <= 0) return 0
  return Math.min(1, (abs - revealLeft.value) / extra)
})

const leftVisible = computed(() => rightProgress.value > 0.06 || baseOffset.value > 0)
const rightVisible = computed(() => leftProgress.value > 0.06 || baseOffset.value < 0)

const deletePulse = computed(() => commitProgressRight.value > 0.5)

const surfaceTransform = computed(() => {
  if (vanish.value) {
    const slide = Math.round(revealRight.value * 1.15)
    if (vanishDirection.value === 'left') return `translateX(${-slide}px) scale(0.98)`
    return `translateX(${slide}px) scale(0.98)`
  }
  const lift = dragging.value && Math.abs(displayOffset.value) > 4 ? 1.006 : 1
  return `translateX(${displayOffset.value}px) scale(${lift})`
})

const surfaceClass = computed(() => ({
  snap: snapBack.value && !vanish.value,
  vanish: vanish.value,
  lift: dragging.value && Math.abs(displayOffset.value) > 8,
}))

const surfaceStyle = computed(() => ({
  transform: surfaceTransform.value,
  boxShadow:
    dragging.value && Math.abs(displayOffset.value) > 6
      ? '0 12px 36px rgba(12, 20, 40, 0.14)'
      : 'none',
}))

function easeIn(p) {
  return p * p * p
}

const leftTrackStyle = computed(() => {
  const p = easeIn(rightProgress.value)
  const cp = commitProgressRight.value
  return {
    opacity: Math.min(1, p * 1.1 + cp * 0.2),
    pointerEvents: p > 0.38 ? 'auto' : 'none',
    transform: `translateX(${Math.round((1 - p) * -14)}px) scale(${0.92 + p * 0.08 + cp * 0.04})`,
  }
})

const rightTrackStyle = computed(() => {
  const p = easeIn(leftProgress.value)
  const cp = commitProgressLeft.value
  return {
    opacity: Math.min(1, p * 1.1 + cp * 0.2),
    pointerEvents: p > 0.38 ? 'auto' : 'none',
    transform: `translateX(${Math.round((1 - p) * 14)}px) scale(${0.92 + p * 0.08 + cp * 0.04})`,
  }
})

const deleteBtnStyle = computed(() => {
  const cp = commitProgressRight.value
  const scale = 1 + cp * 0.62
  const stretchY = 1 + cp * 0.18
  return {
    transform: `scale(${scale}, ${stretchY})`,
    opacity: 1,
  }
})

const archiveBtnStyle = computed(() => {
  const cp = commitProgressLeft.value
  const scale = 1 + cp * 0.35
  return {
    transform: `scale(${scale})`,
    opacity: 1,
  }
})

const restoreBtnStyle = computed(() => {
  const cp = commitProgressLeft.value
  const scale = 1 + cp * 0.38
  return {
    transform: `scale(${scale})`,
    opacity: 1,
  }
})

function rubberBand(over, limit) {
  if (over <= 0) return 0
  return limit * (1 - Math.exp(-over / (limit * 0.32)))
}

function dampedReveal(raw, reveal, extra) {
  if (raw <= 0) return raw * 0.04
  if (raw <= reveal) {
    const ratio = raw / reveal
    const follow = 0.09 + ratio * 0.06
    return raw * follow
  }
  return reveal + rubberBand(raw - reveal, extra)
}

function dampedRevealNegative(raw, reveal, extra) {
  if (raw >= 0) return raw * 0.04
  const abs = -raw
  if (abs <= reveal) {
    const ratio = abs / reveal
    return -(abs * (0.09 + ratio * 0.06))
  }
  return -(reveal + rubberBand(abs - reveal, extra))
}

function clampActive(raw) {
  if (raw > 0) return dampedReveal(raw, ACTIVE_DELETE_REVEAL, ACTIVE_DELETE_COMMIT_EXTRA)
  return dampedRevealNegative(raw, ACTIVE_ARCHIVE_REVEAL, ACTIVE_ARCHIVE_COMMIT_EXTRA)
}

function clampArchived(raw) {
  if (raw > 0) {
    if (raw <= ARCHIVED_REVEAL) {
      const ratio = raw / ARCHIVED_REVEAL
      return raw * (0.2 + ratio * 0.1)
    }
    return ARCHIVED_REVEAL + rubberBand(raw - ARCHIVED_REVEAL, ARCHIVED_COMMIT_EXTRA)
  }
  return dampedRevealNegative(raw, ARCHIVED_REVEAL, ARCHIVED_COMMIT_EXTRA)
}

function clampOffset(raw) {
  if (props.mode === 'active') return clampActive(raw)
  return clampArchived(raw)
}

function rawDragTotal(dx) {
  return baseOffset.value + dx
}

function isSwipeIgnoredTarget(target) {
  if (!target?.closest) return false
  return !!target.closest('[data-swipe-ignore]')
}

function onTouchStart(e) {
  if (isDesktop.value) return
  if (isSwipeIgnoredTarget(e.target)) return
  const t = e.touches?.[0]
  if (!t) return
  startX.value = t.clientX
  startY.value = t.clientY
  dragging.value = true
  lockedAxis.value = ''
  snapBack.value = false
  vanish.value = false
  dragOffset.value = 0
}

function onTouchMove(e) {
  if (!dragging.value || isDesktop.value) return
  const t = e.touches?.[0]
  if (!t) return
  const dx = t.clientX - startX.value
  const dy = t.clientY - startY.value

  if (!lockedAxis.value) {
    if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
      lockedAxis.value = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
  }

  if (lockedAxis.value === 'x') {
    const clamped = clampOffset(rawDragTotal(dx))
    dragOffset.value = clamped - baseOffset.value
  }
}

function finishSnap() {
  snapBack.value = true
  dragOffset.value = 0
}

function triggerVanish(direction, commitId) {
  vanishDirection.value = direction
  vanish.value = true
  snapBack.value = false
  baseOffset.value = 0
  setTimeout(() => emit('commit', commitId), 200)
}

function onTouchEnd() {
  if (!dragging.value) return
  dragging.value = false
  const total = displayOffset.value
  finishSnap()

  if (total >= commitAtRight.value) {
    triggerVanish('right', 'delete')
    return
  }

  if (total <= commitAtLeft.value) {
    const commitId = props.mode === 'active' ? 'archive' : 'restore'
    triggerVanish('left', commitId)
    return
  }

  if (total >= openThresholdRight.value) {
    baseOffset.value = revealRight.value
  } else if (total <= -openThresholdLeft.value) {
    baseOffset.value = -revealLeft.value
  } else {
    baseOffset.value = 0
  }
}

function onTap(id) {
  vanishDirection.value = id === 'delete' ? 'right' : 'left'
  vanish.value = true
  snapBack.value = false
  baseOffset.value = 0
  dragOffset.value = 0
  setTimeout(() => emit('action', id), 200)
}
</script>

<style scoped>
.taskSwipe {
  position: relative;
  width: 100%;
  border-radius: 26rpx;
  overflow: hidden;
}

.trackLeft,
.trackRight {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  opacity: 0;
  transition:
    opacity 320ms cubic-bezier(0.34, 1.1, 0.58, 1),
    transform 360ms cubic-bezier(0.28, 1.06, 0.42, 1);
  pointer-events: none;
  z-index: 0;
}
.trackLeft {
  left: 0;
  right: 0;
  justify-content: flex-start;
  padding: 0 10px 0 12px;
}
.trackRight {
  left: 0;
  right: 0;
  justify-content: flex-end;
  padding: 0 12px 0 10px;
}
.trackLeft.visible,
.trackRight.visible {
  pointer-events: auto;
}

.single {
  display: flex;
  align-items: center;
}
.single.end {
  margin-left: auto;
}

.btn {
  width: 56px;
  height: 56px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition:
    transform 120ms cubic-bezier(0.34, 1.25, 0.64, 1),
    opacity 160ms ease,
    box-shadow 160ms ease;
  box-shadow: 0 8px 22px rgba(12, 20, 40, 0.18);
}
.btn.wide {
  width: 60px;
  height: 60px;
}
.btn:active {
  transform: scale(0.94) !important;
  opacity: 0.92;
}
.btn.pulse {
  animation: deletePulse 480ms ease-in-out infinite alternate;
}
@keyframes deletePulse {
  from {
    box-shadow: 0 8px 22px rgba(220, 60, 60, 0.35);
  }
  to {
    box-shadow: 0 12px 32px rgba(220, 60, 60, 0.55);
  }
}

.act-delete {
  background: linear-gradient(165deg, rgba(255, 98, 98, 0.98), rgba(218, 58, 58, 0.96));
}
.act-archive {
  background: linear-gradient(165deg, rgba(58, 118, 255, 0.94), rgba(38, 88, 220, 0.92));
}
.act-restore {
  background: linear-gradient(165deg, rgba(72, 168, 120, 0.94), rgba(42, 138, 92, 0.92));
}

.actionIcon {
  width: 36rpx;
  height: 36rpx;
  position: relative;
  opacity: 0.96;
}

.ic-trash {
  border: 2rpx solid #fff;
  border-top: none;
  border-radius: 0 0 8rpx 8rpx;
  height: 28rpx;
  margin-top: 8rpx;
}
.ic-trash::before {
  content: '';
  position: absolute;
  top: -8rpx;
  left: -6rpx;
  right: -6rpx;
  height: 2rpx;
  background: #fff;
  border-radius: 999rpx;
}
.ic-trash::after {
  content: '';
  position: absolute;
  top: -14rpx;
  left: 50%;
  width: 2rpx;
  height: 8rpx;
  margin-left: -1rpx;
  background: #fff;
  border-radius: 999rpx;
}

.ic-archive {
  border: 2rpx solid #fff;
  border-radius: 6rpx;
  height: 24rpx;
  margin-top: 6rpx;
}
.ic-archive::before {
  content: '';
  position: absolute;
  top: -8rpx;
  left: 2rpx;
  right: 2rpx;
  height: 8rpx;
  border: 2rpx solid #fff;
  border-bottom: none;
  border-radius: 6rpx 6rpx 0 0;
}

.ic-restore {
  border: 2rpx solid #fff;
  border-right: none;
  border-radius: 999rpx 0 0 999rpx;
  width: 18rpx;
  height: 18rpx;
  margin-left: 6rpx;
  transform: rotate(-45deg);
}
.ic-restore::after {
  content: '';
  position: absolute;
  left: -2rpx;
  top: 50%;
  width: 14rpx;
  height: 2rpx;
  margin-top: -1rpx;
  background: #fff;
  border-radius: 999rpx;
  box-shadow: -6rpx -6rpx 0 0 #fff;
}

.surface {
  position: relative;
  z-index: 1;
  border-radius: 26rpx;
  will-change: transform;
  transition: box-shadow 180ms ease;
}
.surface.snap {
  transition:
    transform 360ms cubic-bezier(0.26, 1.08, 0.38, 1),
    box-shadow 280ms ease,
    opacity 240ms ease;
}
.surface.lift {
  transition: box-shadow 120ms ease;
}
.surface.vanish {
  transition:
    transform 180ms cubic-bezier(0.22, 0.68, 0.32, 1),
    opacity 160ms ease,
    box-shadow 160ms ease;
  opacity: 0;
}
</style>
