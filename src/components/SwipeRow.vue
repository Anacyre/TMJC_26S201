<template>
  <view class="swipeWrap" :class="themeClass">
    <view class="bg">
      <view class="action" role="button" @tap="onActionTap">
        <text class="actionGlyph">×</text>
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
    >
      <slot />
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({
  threshold: { type: Number, default: 84 },
  maxReveal: { type: Number, default: 96 },
})

const emit = defineEmits(['delete'])

const { themeClass } = useTheme()

const startX = ref(0)
const startY = ref(0)
const dragging = ref(false)
const lockedAxis = ref('')
const baseOffset = ref(0)
const dragOffset = ref(0)
const snapBack = ref(false)
const vanish = ref(false)

const displayOffset = computed(() => baseOffset.value + dragOffset.value)

function onTouchStart(e) {
  const t = e.touches?.[0]
  if (!t) return
  startX.value = t.clientX
  startY.value = t.clientY
  dragging.value = true
  lockedAxis.value = ''
  snapBack.value = false
}

function onTouchMove(e) {
  if (!dragging.value) return
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
    let next = dx
    if (next > 0) next = Math.min(8, next * 0.2)
    if (next < -props.maxReveal) {
      next = -props.maxReveal + (next + props.maxReveal) * 0.25
    }
    dragOffset.value = next
  }
}

function onTouchEnd() {
  if (!dragging.value) {
    return
  }
  dragging.value = false
  const total = displayOffset.value
  snapBack.value = true
  if (total <= -props.threshold) {
    baseOffset.value = -props.maxReveal
  } else {
    baseOffset.value = 0
  }
  dragOffset.value = 0
}

function onActionTap() {
  vanish.value = true
  setTimeout(() => emit('delete'), 220)
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
  justify-content: flex-end;
  padding-left: 22rpx;
  border-radius: 26rpx;
  overflow: hidden;
}

.action {
  width: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 26rpx;
  background: linear-gradient(180deg, rgba(255, 90, 90, 0.95), rgba(220, 60, 60, 0.95));
  box-shadow: 0 16rpx 40rpx rgba(220, 60, 60, 0.32);
  transition: transform 180ms ease;
}
.action:active { transform: scale(0.94); }
.actionGlyph {
  font-size: 36rpx;
  font-weight: 300;
  color: #fff;
  line-height: 1;
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
  transform: translateX(-110%);
  opacity: 0;
}
</style>
