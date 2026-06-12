<template>
  <!-- #ifdef H5 -->
  <Teleport to="body">
    <view
      v-if="undoMenuOpen"
      class="overlay"
      :class="[themeClass, { show: sheetVisible }]"
      @touchmove.stop.prevent="onOverlayTouchMove"
    >
      <view
        class="backdrop"
        aria-hidden="true"
        @tap="dismiss"
        @click.stop="dismiss"
      />
      <view
        class="sheet"
        :class="{ dragging: dragOffset > 0 }"
        :style="sheetDragStyle"
        @tap.stop
        @touchstart="onDragStart"
        @touchmove.stop.prevent="onDragMove"
        @touchend="onDragEnd"
        @touchcancel="onDragEnd"
        @mousedown="onDragStart"
        @mousemove="onDragMove"
        @mouseup="onDragEnd"
        @mouseleave="onDragEnd"
      >
        <UndoSheetBody
          :pending="pending"
          :age-label="ageLabel"
          :expires-label="expiresLabel"
          @dismiss="dismiss"
          @pick="pick"
          @undo-latest="undoLatest"
        />
      </view>
    </view>
  </Teleport>
  <!-- #endif -->
  <!-- #ifndef H5 -->
  <view
    v-if="undoMenuOpen"
    class="overlay"
    :class="[themeClass, { show: sheetVisible }]"
    @touchmove.stop.prevent="onOverlayTouchMove"
  >
    <view class="backdrop" aria-hidden="true" @tap="dismiss" />
    <view
      class="sheet"
      :class="{ dragging: dragOffset > 0 }"
      :style="sheetDragStyle"
      @tap.stop
      @touchstart="onDragStart"
      @touchmove.stop.prevent="onDragMove"
      @touchend="onDragEnd"
      @touchcancel="onDragEnd"
    >
      <UndoSheetBody
        :pending="pending"
        :age-label="ageLabel"
        :expires-label="expiresLabel"
        @dismiss="dismiss"
        @pick="pick"
        @undo-latest="undoLatest"
      />
    </view>
  </view>
  <!-- #endif -->
</template>

<script setup>
import { computed, ref, watch, nextTick, onBeforeUnmount } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useUndoMenu } from '@/composables/useUndoMenu'
import { pendingUndoEntries, undoById, undoLast } from '@/composables/useUndo'
import { undoEntryAgeLabel, undoEntryExpiresLabel } from '@/lib/undoTimeLabel'
import UndoSheetBody from '@/components/UndoSheetBody.vue'
import { lockPageInteraction, unlockPageInteraction } from '@/lib/pageInteractionLock'

const { undoMenuOpen, closeUndoMenu } = useUndoMenu()
const { themeClass } = useTheme()
const pending = pendingUndoEntries
const sheetVisible = ref(false)
const dragOffset = ref(0)
let dragStartY = 0
let dragActive = false
let tickTimer = null
const nowTick = ref(Date.now())

const DISMISS_DRAG_PX = 48

const sheetDragStyle = computed(() => {
  if (dragOffset.value > 0) {
    return { transform: `translateY(${dragOffset.value}px)` }
  }
  return {}
})

function ageLabel(entry) {
  return undoEntryAgeLabel(entry, nowTick.value)
}

function expiresLabel(entry) {
  return undoEntryExpiresLabel(entry, nowTick.value)
}

function startTick() {
  stopTick()
  nowTick.value = Date.now()
  tickTimer = setInterval(() => {
    nowTick.value = Date.now()
  }, 15000)
}

function stopTick() {
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
}

function onKeydown(e) {
  if (e.key === 'Escape') dismiss()
}

function dismiss() {
  dragOffset.value = 0
  dragActive = false
  sheetVisible.value = false
  closeUndoMenu()
  unlockPageInteraction()
}

function onOverlayTouchMove(e) {
  if (!dragActive) e.preventDefault?.()
}

watch(
  undoMenuOpen,
  async (v) => {
    if (typeof document !== 'undefined') {
      if (v) document.addEventListener('keydown', onKeydown)
      else document.removeEventListener('keydown', onKeydown)
    }
    if (v) {
      lockPageInteraction()
      dragOffset.value = 0
      sheetVisible.value = false
      startTick()
      await nextTick()
      requestAnimationFrame(() => {
        if (undoMenuOpen.value) sheetVisible.value = true
      })
    } else {
      unlockPageInteraction()
      sheetVisible.value = false
      stopTick()
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopTick()
  unlockPageInteraction()
  if (typeof document !== 'undefined') document.removeEventListener('keydown', onKeydown)
})

function pick(entry) {
  undoById(entry.id)
  dismiss()
}

function undoLatest() {
  undoLast()
  dismiss()
}

function pointerY(e) {
  const t = e.touches?.[0] || e.changedTouches?.[0]
  if (t) return t.clientY
  return e.clientY ?? 0
}

function isInteractiveTarget(e) {
  const el = e.target
  if (!el || typeof el.closest !== 'function') return false
  return !!el.closest('.iconBtn, .row, .fabUndo')
}

function onDragStart(e) {
  if (isInteractiveTarget(e)) return
  dragStartY = pointerY(e)
  dragActive = true
}

function onDragMove(e) {
  if (!dragActive) return
  if (e.type === 'mousemove' && e.buttons !== 1) {
    dragActive = false
    dragOffset.value = 0
    return
  }
  const dy = pointerY(e) - dragStartY
  if (dy > 0) {
    dragOffset.value = dy
    if (e.cancelable && e.type !== 'mousemove') e.preventDefault()
  } else {
    dragOffset.value = 0
  }
}

function onDragEnd() {
  if (!dragActive) return
  dragActive = false
  if (dragOffset.value >= DISMISS_DRAG_PX) dismiss()
  else dragOffset.value = 0
}
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 100050;
  pointer-events: auto;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.overlay.show {
  opacity: 1;
}

.backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: rgba(8, 12, 24, 0.5);
  pointer-events: auto;
  touch-action: none;
}
.t-dark .backdrop {
  background: rgba(0, 0, 0, 0.6);
}

.sheet {
  position: absolute;
  z-index: 1;
  left: var(--shell-bar-inset, 20rpx);
  right: var(--shell-bar-inset, 20rpx);
  bottom: var(--shell-dock-bottom, calc(20rpx + env(safe-area-inset-bottom)));
  max-height: calc(
    100vh - var(--shell-header-offset) - var(--shell-bar-height) - var(--shell-dock-bottom) - 24rpx
  );
  display: flex;
  flex-direction: column;
  border-radius: 32rpx 32rpx 34rpx 34rpx;
  background: rgba(255, 255, 255, 0.98);
  border: 1rpx solid rgba(255, 255, 255, 0.65);
  box-shadow: 0 -8rpx 48rpx rgba(12, 20, 40, 0.14);
  transform: translateY(20rpx);
  transition: transform 0.22s cubic-bezier(0.34, 1.2, 0.64, 1);
  touch-action: pan-y;
  pointer-events: auto;
}
.sheet.dragging {
  transition: none;
}
.overlay.show .sheet {
  transform: translateY(0);
}
.overlay.show .sheet.dragging {
  transition: none;
}
.t-dark .sheet {
  background: #1a1d21;
  border-color: rgba(255, 255, 255, 0.08);
}
</style>
