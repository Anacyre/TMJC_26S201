<template>
  <view class="noticeSwipe" :class="[themeClass, { dragging, snapBack }]">
    <view
      v-if="showPositiveTrack"
      class="trackLeft"
      :class="{ visible: positiveVisible }"
      :style="positiveTrackStyle"
    >
      <view class="single">
        <view
          class="btn wide"
          :class="[positiveBtnClass, { pulse: positivePulse }]"
          :style="positiveBtnStyle"
          role="button"
          @tap.stop="onTap(positiveAction)"
        >
          <view class="actionIcon" :class="positiveAction === 'delete' ? 'ic-trash' : 'ic-hide'" />
        </view>
      </view>
    </view>

    <view
      v-if="showNegativeTrack"
      class="trackRight"
      :class="{ visible: negativeVisible }"
      :style="negativeTrackStyle"
    >
      <view class="single end">
        <view
          class="btn wide"
          :class="[negativeBtnClass, { pulse: negativePulse }]"
          :style="negativeBtnStyle"
          role="button"
          @tap.stop="onTap(negativeAction)"
        >
          <view class="actionIcon" :class="negativeAction === 'delete' ? 'ic-trash' : 'ic-hide'" />
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
      @longpress="onLongPress"
    >
      <slot />
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useDevice } from '@/composables/useDevice'
import { useSwipeLayout } from '@/composables/useSwipeLayout'
import {
  SWIPE_REVEAL,
  SWIPE_COMMIT_EXTRA,
  SWIPE_VISUAL_REVEAL,
  SWIPE_VANISH_MS,
  SWIPE_ACTION_MS,
  swipeEaseIn,
  swipeDampedPositive,
  swipeDampedNegative,
  meetsPositiveSwipeCommit,
  meetsNegativeSwipeCommit,
} from '@/lib/swipeMotion'
import { shouldVanishBeforeAction } from '@/lib/swipeCommit'

const props = defineProps({
  canDelete: { type: Boolean, default: false },
})

const emit = defineEmits(['action', 'commit', 'longpress-delete'])

const { themeClass } = useTheme()
const { isDesktop } = useDevice()
const { noticePositiveAction, noticeNegativeAction } = useSwipeLayout()

const positiveAction = noticePositiveAction
const negativeAction = noticeNegativeAction

const showPositiveTrack = computed(
  () => positiveAction.value !== 'delete' || props.canDelete
)
const showNegativeTrack = computed(
  () => negativeAction.value !== 'delete' || props.canDelete
)

const openThresholdPos = computed(() => Math.round(SWIPE_REVEAL * 0.64))
const openThresholdNeg = computed(() => Math.round(SWIPE_REVEAL * 0.58))
const commitAtPos = computed(() => SWIPE_REVEAL + SWIPE_COMMIT_EXTRA * 0.64)
const commitAtNeg = computed(() => -(SWIPE_REVEAL + SWIPE_COMMIT_EXTRA * 0.64))

const startX = ref(0)
const startY = ref(0)
const startBaseOffset = ref(0)
const lastDx = ref(0)
const dragging = ref(false)
const lockedAxis = ref('')
const baseOffset = ref(0)
const dragOffset = ref(0)
const snapBack = ref(false)
const vanish = ref(false)
const vanishDirection = ref('right')

const displayOffset = computed(() => baseOffset.value + dragOffset.value)

const positiveProgress = computed(() => {
  const o = displayOffset.value
  if (o <= 0) return 0
  return Math.min(1, o / SWIPE_VISUAL_REVEAL)
})

const negativeProgress = computed(() => {
  const o = displayOffset.value
  if (o >= 0) return 0
  return Math.min(1, -o / SWIPE_VISUAL_REVEAL)
})

const positiveCommitProgress = computed(() => {
  const o = displayOffset.value
  if (o <= SWIPE_REVEAL || SWIPE_COMMIT_EXTRA <= 0) return 0
  return Math.min(1, (o - SWIPE_REVEAL) / SWIPE_COMMIT_EXTRA)
})

const negativeCommitProgress = computed(() => {
  const o = displayOffset.value
  const abs = -o
  if (abs <= SWIPE_REVEAL || SWIPE_COMMIT_EXTRA <= 0) return 0
  return Math.min(1, (abs - SWIPE_REVEAL) / SWIPE_COMMIT_EXTRA)
})

const positiveVisible = computed(() => positiveProgress.value > 0.06 || baseOffset.value > 0)
const negativeVisible = computed(() => negativeProgress.value > 0.06 || baseOffset.value < 0)

const positivePulse = computed(
  () => positiveAction.value === 'delete' && positiveCommitProgress.value > 0.5
)
const negativePulse = computed(
  () => negativeAction.value === 'delete' && negativeCommitProgress.value > 0.5
)

const positiveBtnClass = computed(() =>
  positiveAction.value === 'delete' ? 'act-delete' : 'act-hide'
)
const negativeBtnClass = computed(() =>
  negativeAction.value === 'delete' ? 'act-delete' : 'act-hide'
)

const positiveBtnStyle = computed(() => {
  if (positiveAction.value !== 'delete') return {}
  const cp = positiveCommitProgress.value
  return { transform: `scale(${1 + cp * 0.62}, ${1 + cp * 0.18})`, opacity: 1 }
})

const negativeBtnStyle = computed(() => {
  if (negativeAction.value !== 'delete') return {}
  const cp = negativeCommitProgress.value
  return { transform: `scale(${1 + cp * 0.62}, ${1 + cp * 0.18})`, opacity: 1 }
})

const surfaceTransform = computed(() => {
  if (vanish.value) {
    const slide = Math.round(SWIPE_REVEAL * 1.15)
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

const positiveTrackStyle = computed(() => {
  const p = swipeEaseIn(positiveProgress.value)
  const cp = positiveCommitProgress.value
  return {
    opacity: Math.min(1, p * 1.1 + cp * 0.2),
    pointerEvents: p > 0.38 ? 'auto' : 'none',
    transform: `translateX(${Math.round((1 - p) * -14)}px) scale(${0.92 + p * 0.08 + cp * 0.04})`,
  }
})

const negativeTrackStyle = computed(() => {
  const p = swipeEaseIn(negativeProgress.value)
  const cp = negativeCommitProgress.value
  return {
    opacity: Math.min(1, p * 1.1 + cp * 0.2),
    pointerEvents: p > 0.38 ? 'auto' : 'none',
    transform: `translateX(${Math.round((1 - p) * 14)}px) scale(${0.92 + p * 0.08 + cp * 0.04})`,
  }
})

function clampOffset(raw) {
  let out = swipeDampedPositive(raw)
  const negAllowed =
    negativeAction.value !== 'delete' || props.canDelete
  if (negAllowed && raw < 0) {
    out = swipeDampedNegative(raw)
  }
  const posAllowed = positiveAction.value !== 'delete' || props.canDelete
  if (!posAllowed && raw > 0) {
    out = swipeDampedPositive(raw, SWIPE_REVEAL, 0) * 0.15
  }
  return out
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
  startBaseOffset.value = baseOffset.value
  lastDx.value = 0
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
    lastDx.value = dx
    const clamped = clampOffset(baseOffset.value + dx)
    dragOffset.value = clamped - baseOffset.value
  }
}

function finishSnap() {
  snapBack.value = true
  dragOffset.value = 0
}

function resetSwipeState() {
  dragging.value = false
  snapBack.value = true
  dragOffset.value = 0
  baseOffset.value = 0
  vanish.value = false
}

function emitDeleteIntent(actionId) {
  resetSwipeState()
  emit('commit', actionId)
}

function triggerVanish(direction, actionId) {
  vanishDirection.value = direction
  vanish.value = true
  snapBack.value = false
  baseOffset.value = 0
  setTimeout(() => emit('commit', actionId), SWIPE_VANISH_MS)
}

function onTouchEnd() {
  if (!dragging.value) return
  dragging.value = false
  const total = displayOffset.value
  const rawGesture = startBaseOffset.value + lastDx.value
  finishSnap()

  if (showPositiveTrack.value && meetsPositiveSwipeCommit(total, rawGesture)) {
    const action = positiveAction.value
    if (!shouldVanishBeforeAction(action)) {
      emitDeleteIntent(action)
      return
    }
    triggerVanish('right', action)
    return
  }

  if (showNegativeTrack.value && meetsNegativeSwipeCommit(total, rawGesture)) {
    const action = negativeAction.value
    if (!shouldVanishBeforeAction(action)) {
      emitDeleteIntent(action)
      return
    }
    triggerVanish('left', action)
    return
  }

  if (showPositiveTrack.value && total >= openThresholdPos.value) {
    baseOffset.value = SWIPE_REVEAL
  } else if (showNegativeTrack.value && total <= -openThresholdNeg.value) {
    baseOffset.value = -SWIPE_REVEAL
  } else {
    baseOffset.value = 0
  }
}

function onTap(actionId) {
  if (!shouldVanishBeforeAction(actionId)) {
    emit('action', actionId)
    resetSwipeState()
    return
  }
  vanishDirection.value = actionId === 'delete' ? 'left' : 'right'
  vanish.value = true
  snapBack.value = false
  baseOffset.value = 0
  dragOffset.value = 0
  setTimeout(() => emit('action', actionId), SWIPE_ACTION_MS)
}

function onLongPress() {
  if (!props.canDelete) return
  emit('longpress-delete')
}
</script>

<style scoped>
.noticeSwipe {
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
  transition: opacity 320ms cubic-bezier(0.34, 1.1, 0.58, 1),
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
  z-index: 2;
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
  transition: transform 120ms cubic-bezier(0.34, 1.25, 0.64, 1), opacity 160ms ease,
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

.act-hide {
  background: rgba(120, 130, 150, 0.92);
}
.act-delete {
  background: linear-gradient(165deg, rgba(255, 98, 98, 0.98), rgba(218, 58, 58, 0.96));
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

.ic-hide::before {
  content: '';
  position: absolute;
  inset: 8rpx;
  border-radius: 50%;
  border: 2rpx solid #fff;
}
.ic-hide::after {
  content: '';
  position: absolute;
  left: -4rpx;
  right: -4rpx;
  top: 50%;
  height: 2rpx;
  background: #fff;
  transform: rotate(-35deg);
}

.surface {
  position: relative;
  z-index: 1;
  border-radius: 26rpx;
  will-change: transform;
  transition: box-shadow 180ms ease;
}
.surface.snap {
  transition: transform 360ms cubic-bezier(0.26, 1.08, 0.38, 1), box-shadow 280ms ease,
    opacity 240ms ease;
}
.surface.lift {
  transition: box-shadow 120ms ease;
}
.surface.vanish {
  transition: transform 180ms cubic-bezier(0.22, 0.68, 0.32, 1), opacity 160ms ease,
    box-shadow 160ms ease;
  opacity: 0;
}
</style>
