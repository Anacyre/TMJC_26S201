<template>
  <view class="swipeWrap" :class="themeClass">
    <view class="bg" :class="['side-' + side]">
      <view
        v-for="act in actions"
        :key="act.id"
        class="action"
        :class="['act-' + act.id, { wide: actions.length === 1 }]"
        :style="actStyle(act)"
        role="button"
        @tap="onActionTap(act.id)"
      >
        <view class="actionIcon" :class="'ic-' + (act.icon || act.id)" />
      </view>
    </view>
    <view
      class="surface"
      :style="{ transform: `translateX(${displayOffset}px)` }"
      :class="{ snap: snapBack, vanish }"
      @touchstart="onTouchStart"
      @touchmove.stop="onTouchMove"
      @touchend="onTouchEnd"
      @touchcancel="onTouchEnd"
      @contextmenu="onContextMenu"
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
  threshold: { type: Number, default: 72 },
  maxReveal: { type: Number, default: 0 },
  commitThreshold: { type: Number, default: 120 },
  /** Action id fired on full swipe */
  commitAction: { type: String, default: '' },
  contextItems: { type: Array, default: () => [] },
})

const emit = defineEmits(['action', 'commit'])

const { themeClass } = useTheme()
const { isDesktop } = useDevice()

const revealWidth = computed(() => {
  if (props.maxReveal > 0) return props.maxReveal
  return Math.max(72, props.actions.length * 64)
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

function clampOffset(raw) {
  const max = revealWidth.value
  if (props.side === 'left') {
    let next = raw
    if (next < 0) next = Math.min(0, next * 0.15)
    if (next > max) next = max + (next - max) * 0.2
    return next
  }
  let next = raw
  if (next > 0) next = Math.max(0, next * 0.15)
  if (next < -max) next = -max + (next + max) * 0.2
  return next
}

function onTouchStart(e) {
  if (isDesktop.value) return
  const t = e.touches?.[0]
  if (!t) return
  startX.value = t.clientX
  startY.value = t.clientY
  dragging.value = true
  lockedAxis.value = ''
  snapBack.value = false
  vanish.value = false
  menuOpen.value = false
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
    const signed = props.side === 'left' ? dx : dx
    dragOffset.value = clampOffset(signed)
  }
}

function onTouchEnd() {
  if (!dragging.value) return
  dragging.value = false
  const total = displayOffset.value
  snapBack.value = true

  const absTotal = Math.abs(total)
  const max = revealWidth.value

  if (props.side === 'left' && total >= props.commitThreshold) {
    vanish.value = true
    dragOffset.value = 0
    setTimeout(() => emit('commit', commitId.value), 180)
    return
  }
  if (props.side === 'right' && total <= -props.commitThreshold) {
    vanish.value = true
    dragOffset.value = 0
    setTimeout(() => emit('commit', commitId.value), 180)
    return
  }

  if (props.side === 'left' && total >= props.threshold) {
    baseOffset.value = max
  } else if (props.side === 'right' && total <= -props.threshold) {
    baseOffset.value = -max
  } else {
    baseOffset.value = 0
  }
  dragOffset.value = 0
}

function onActionTap(id) {
  vanish.value = true
  baseOffset.value = 0
  setTimeout(() => emit('action', id), 160)
}

function onContextMenu(e) {
  if (!isDesktop.value || !menuItems.value.length) return
  e?.preventDefault?.()
  menuX.value = e?.clientX ?? e?.detail?.x ?? 120
  menuY.value = e?.clientY ?? e?.detail?.y ?? 120
  menuOpen.value = true
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
  transition: transform 160ms cubic-bezier(0.34, 1.2, 0.64, 1);
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
