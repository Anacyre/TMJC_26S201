<template>
  <view class="swipeWrap" :class="themeClass">
    <view
      v-if="peekActions"
      class="bg"
      :class="['side-' + side, { 'bg-fade': snapBack }]"
      :style="bgStyle"
    >
      <view
        v-for="act in actions"
        :key="act.id"
        class="action"
        :class="[
          'act-' + act.id,
          { wide: actions.length === 1, strip: actionStyle === 'strip', danger: act.danger },
        ]"
        :style="actStyle(act)"
        role="button"
        @tap="onActionTap(act.id)"
      >
        <text v-if="actionStyle === 'strip' && act.label" class="actionLabel">{{ act.label }}</text>
        <view v-else class="actionIcon" :class="'ic-' + (act.icon || act.id)" />
      </view>
    </view>
    <view
      class="surface"
      :style="{ transform: surfaceTransform }"
      :class="{ snap: snapBack && !vanish, vanish }"
      @touchstart="onTouchStart"
      @touchmove.stop="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
      @contextmenu="onContextMenu"
      @longpress="onLongPress"
    >
      <slot />
    </view>
    <ContextMenu
      v-model:open="menuOpen"
      :x="menuX"
      :y="menuY"
      :items="menuItems"
      @select="onMenuSelect"
    />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import ContextMenu from '@/components/ContextMenu.vue'
import { useTheme } from '@/composables/useTheme'
import { useDevice } from '@/composables/useDevice'

const props = defineProps({
  /** Actions revealed on swipe — left side when swiping right, right side when swiping left */
  actions: {
    type: Array,
    default: () => [{ id: 'delete', icon: 'trash' }],
  },
  /** left = swipe right to reveal actions on left; right = swipe left to reveal on right */
  side: { type: String, default: 'left' },
  threshold: { type: Number, default: 0 },
  maxReveal: { type: Number, default: 0 },
  /** Extra travel beyond reveal before commit fires */
  commitTravel: { type: Number, default: 0 },
  commitThreshold: { type: Number, default: 0 },
  /** Action id fired on full swipe */
  commitAction: { type: String, default: '' },
  contextItems: { type: Array, default: () => [] },
  /** When false: no action buttons under the row; swipe far enough to commit directly */
  peekActions: { type: Boolean, default: true },
  /** strip = full-height labeled bar; icon = compact square buttons */
  actionStyle: { type: String, default: 'icon' },
})

const emit = defineEmits(['action', 'commit'])

const { themeClass } = useTheme()
const { isDesktop } = useDevice()

const revealWidth = computed(() => {
  if (props.maxReveal > 0) return props.maxReveal
  if (props.actionStyle === 'strip') {
    return Math.max(160, props.actions.length * 88)
  }
  return Math.max(72, props.actions.length * 64)
})

const openThreshold = computed(() => {
  if (props.threshold > 0) return props.threshold
  return Math.round(revealWidth.value * 0.38)
})

const extraCommitTravel = computed(() => {
  if (props.commitTravel > 0) return props.commitTravel
  if (props.commitThreshold > revealWidth.value) {
    return props.commitThreshold - revealWidth.value
  }
  return Math.max(64, Math.round(revealWidth.value * 0.85))
})

const commitReleaseAt = computed(() => {
  if (!props.peekActions) {
    return Math.round(revealWidth.value * 0.55)
  }
  return revealWidth.value + extraCommitTravel.value * 0.68
})

const startX = ref(0)
const startY = ref(0)
const dragging = ref(false)
const lockedAxis = ref('')
const baseOffset = ref(0)
const dragOffset = ref(0)
const snapBack = ref(false)
const vanish = ref(false)
const menuOpen = ref(false)
const menuX = ref(0)
const menuY = ref(0)

const displayOffset = computed(() => baseOffset.value + dragOffset.value)

/** Inline transform wins over CSS — keep slide-out when vanishing */
const surfaceTransform = computed(() => {
  if (vanish.value) {
    const slide = Math.round(revealWidth.value * 1.12)
    return props.side === 'left'
      ? `translateX(${slide}px)`
      : `translateX(${-slide}px)`
  }
  return `translateX(${displayOffset.value}px)`
})

/** 0 = hidden, 1 = fully visible — tracks swipe progress */
const actionsOpacity = computed(() => {
  const max = revealWidth.value
  if (max <= 0) return 0
  const progress = Math.min(1, Math.abs(displayOffset.value) / max)
  // Ease-in so buttons emerge near the end of the reveal
  return progress * progress
})

const bgStyle = computed(() => ({
  opacity: Math.min(1, actionsOpacity.value + commitProgress.value * 0.25),
  pointerEvents: actionsOpacity.value > 0.4 ? 'auto' : 'none',
  transform: commitProgress.value > 0 ? `scale(${1 + commitProgress.value * 0.03})` : 'none',
}))

/** Progress into commit zone (0 = at reveal stop, 1 = full commit travel) */
const commitProgress = computed(() => {
  const reveal = revealWidth.value
  const extra = extraCommitTravel.value
  const total = Math.abs(displayOffset.value)
  if (total <= reveal || extra <= 0) return 0
  return Math.min(1, (total - reveal) / extra)
})

const menuItems = computed(() =>
  props.contextItems.length
    ? props.contextItems
    : props.actions.map((a) => ({
        id: a.id,
        label: a.label || a.id,
        icon: a.icon || a.id,
        danger: a.danger,
      }))
)

const commitId = computed(() => props.commitAction || props.actions[0]?.id || 'delete')

function actStyle(act) {
  if (act.color) return { background: act.color }
  return {}
}

function rubberBand(over, limit) {
  if (over <= 0) return 0
  return limit * (1 - Math.exp(-over / (limit * 0.42)))
}

function clampOffset(rawTotal) {
  const reveal = revealWidth.value
  const extra = extraCommitTravel.value

  if (!props.peekActions) {
    if (props.side === 'left') {
      if (rawTotal <= 0) return rawTotal * 0.15
      return rawTotal * 0.88
    }
    if (rawTotal >= 0) return rawTotal * 0.15
    return rawTotal * 0.88
  }

  if (props.side === 'left') {
    if (rawTotal <= 0) return rawTotal * 0.22
    if (rawTotal <= reveal) {
      const ratio = rawTotal / reveal
      const follow = 0.72 + ratio * 0.28
      return rawTotal * follow
    }
    const over = rawTotal - reveal
    return reveal + rubberBand(over, extra)
  }

  if (rawTotal >= 0) return rawTotal * 0.22
  const abs = -rawTotal
  if (abs <= reveal) {
    const ratio = abs / reveal
    const follow = 0.72 + ratio * 0.28
    return -(abs * follow)
  }
  const over = abs - reveal
  return -(reveal + rubberBand(over, extra))
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
  menuOpen.value = false
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

function onTouchEnd() {
  if (!dragging.value) return
  dragging.value = false
  const total = displayOffset.value
  snapBack.value = true

  const reveal = revealWidth.value
  const commitAt = commitReleaseAt.value

  if (props.side === 'left') {
    if (total >= commitAt) {
      vanish.value = true
      snapBack.value = false
      dragOffset.value = 0
      setTimeout(() => emit('commit', commitId.value), 200)
      return
    }
    if (!props.peekActions) {
      baseOffset.value = 0
    } else if (total >= openThreshold.value) {
      baseOffset.value = reveal
    } else {
      baseOffset.value = 0
    }
  } else {
    if (total <= -commitAt) {
      vanish.value = true
      snapBack.value = false
      dragOffset.value = 0
      setTimeout(() => emit('commit', commitId.value), 200)
      return
    }
    if (!props.peekActions) {
      baseOffset.value = 0
    } else if (total <= -openThreshold.value) {
      baseOffset.value = -reveal
    } else {
      baseOffset.value = 0
    }
  }
  dragOffset.value = 0
}

function onActionTap(id) {
  vanish.value = true
  snapBack.value = false
  dragOffset.value = 0
  setTimeout(() => emit('action', id), 200)
}

function openContextMenuAt(e) {
  if (!menuItems.value.length) return
  e?.preventDefault?.()
  e?.stopPropagation?.()
  const t = e?.touches?.[0] || e?.changedTouches?.[0]
  menuX.value = e?.clientX ?? t?.clientX ?? t?.pageX ?? 120
  menuY.value = e?.clientY ?? t?.clientY ?? t?.pageY ?? 120
  menuOpen.value = true
}

function onContextMenu(e) {
  if (!isDesktop.value || !menuItems.value.length) return
  openContextMenuAt(e)
}

function onLongPress(e) {
  if (!menuItems.value.length) return
  openContextMenuAt(e)
}

function onMenuSelect(item) {
  emit('action', item.id)
}
</script>

<style scoped>
.swipeWrap {
  position: relative;
  width: 100%;
}

.bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: stretch;
  border-radius: 26rpx;
  overflow: hidden;
  opacity: 0;
}
.bg.bg-fade {
  transition: opacity 160ms cubic-bezier(0.34, 1.2, 0.64, 1),
    transform 160ms cubic-bezier(0.34, 1.2, 0.64, 1);
}
.bg.side-left {
  justify-content: flex-start;
  padding-right: 22rpx;
}
.bg.side-right {
  justify-content: flex-end;
  padding-left: 22rpx;
}

.action {
  width: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 150ms cubic-bezier(0.34, 1.2, 0.64, 1);
}
.action.strip {
  width: auto;
  flex: 1;
  min-width: 88px;
  padding: 0 20rpx;
}
.action.strip.danger,
.action.strip.act-delete {
  background: linear-gradient(180deg, rgba(255, 90, 90, 0.95), rgba(220, 60, 60, 0.95));
}
.action.strip.act-archive {
  background: rgba(46, 99, 255, 0.82);
}
.actionLabel {
  font-size: 22rpx;
  font-weight: 700;
  color: #fff;
  letter-spacing: 0.3rpx;
}
.action.wide { width: 72px; }
.action:active { transform: scale(0.96); }

.act-hide {
  background: rgba(120, 130, 150, 0.88);
}
.act-delete {
  background: linear-gradient(180deg, rgba(255, 90, 90, 0.95), rgba(220, 60, 60, 0.95));
}
.act-archive {
  background: rgba(46, 99, 255, 0.82);
}

.actionIcon {
  width: 36rpx;
  height: 36rpx;
  position: relative;
  opacity: 0.95;
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
  transform: translateX(0);
}
.surface.snap {
  transition: transform 220ms cubic-bezier(0.32, 1.05, 0.48, 1);
}
.surface.vanish {
  transition: transform 150ms cubic-bezier(0.22, 0.61, 0.36, 1), opacity 150ms ease;
  opacity: 0;
}
.bg.side-left + .surface.vanish {
  transform: translateX(110%);
}
.bg.side-right + .surface.vanish {
  transform: translateX(-110%);
}
</style>
