<template>
  <view class="sheetInner">
    <view class="sheetHead">
      <view class="grabber dragHint" aria-hidden="true" />
      <view class="headRow">
        <view class="headLead">
          <view class="undoGlyph" aria-hidden="true">
            <view class="undoArc" />
            <view class="undoArrow" />
          </view>
          <view class="headText">
            <text class="title">Undo</text>
            <view class="metaChip" aria-label="4 minute window">
              <view class="clockGlyph" aria-hidden="true">
                <view class="clockFace" />
                <view class="clockHand" />
              </view>
              <text class="metaChipText">4m</text>
            </view>
          </view>
        </view>
        <view
          ref="closeBtnRef"
          class="iconBtn tap"
          role="button"
          aria-label="Close"
          @tap.stop="onDismiss"
        >
          <view class="closeGlyph" aria-hidden="true">
            <view class="closeLine a" />
            <view class="closeLine b" />
          </view>
        </view>
      </view>
    </view>

    <view v-if="!pending.length" class="empty dragHint">
      <view class="emptyGlyph" aria-hidden="true">
        <view class="undoArc lg" />
        <view class="undoArrow lg" />
      </view>
      <text class="emptyText">No pending actions</text>
    </view>

    <scroll-view v-else class="list scrollList" scroll-y :show-scrollbar="false">
      <view
        v-for="(entry, index) in pending"
        :key="entry.id"
        class="row tap"
        :class="{ latest: index === 0 }"
        role="button"
        :aria-label="`Undo ${entry.menuLabel}`"
        @tap="$emit('pick', entry)"
      >
        <view v-if="index === 0" class="latestDot" aria-hidden="true" />
        <view class="rowMain">
          <text class="rowLabel">{{ entry.menuLabel }}</text>
          <text class="rowMeta">{{ ageLabel(entry) }} · {{ expiresLabel(entry) }}</text>
        </view>
        <view class="rowUndoIcon" aria-hidden="true">
          <view class="undoArc sm" />
          <view class="undoArrow sm" />
        </view>
      </view>
    </scroll-view>

    <view v-if="pending.length" class="footer dragHint">
      <view
        class="fabUndo tap"
        role="button"
        aria-label="Undo most recent"
        @tap="$emit('undo-latest')"
      >
        <view class="fabGlyph" aria-hidden="true">
          <view class="undoArc" />
          <view class="undoArrow" />
        </view>
        <view v-if="pending.length > 1" class="fabBadge">
          <text class="fabBadgeText">{{ pending.length }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useUndoMenu } from '@/composables/useUndoMenu'

defineProps({
  pending: { type: Array, default: () => [] },
  ageLabel: { type: Function, required: true },
  expiresLabel: { type: Function, required: true },
})

const emit = defineEmits(['dismiss', 'pick', 'undo-latest'])

const { closeUndoMenu } = useUndoMenu()
const closeBtnRef = ref(null)
let nativeCloseHandler = null

function resolveDomNode(refVal) {
  if (!refVal) return null
  if (refVal instanceof HTMLElement) return refVal
  const el = refVal.$el ?? refVal.$?.vnode?.el
  if (el instanceof HTMLElement) return el
  return null
}

function onDismiss() {
  closeUndoMenu()
  emit('dismiss')
}

onMounted(async () => {
  if (typeof document === 'undefined') return
  await nextTick()
  const el = resolveDomNode(closeBtnRef.value)
  if (!el) return
  nativeCloseHandler = (e) => {
    e.preventDefault()
    e.stopPropagation()
    onDismiss()
  }
  el.addEventListener('click', nativeCloseHandler, true)
  el.addEventListener('pointerup', nativeCloseHandler, true)
})

onBeforeUnmount(() => {
  const el = resolveDomNode(closeBtnRef.value)
  if (el && nativeCloseHandler) {
    el.removeEventListener('click', nativeCloseHandler, true)
    el.removeEventListener('pointerup', nativeCloseHandler, true)
  }
})
</script>

<style scoped>
.sheetInner {
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  padding-bottom: env(safe-area-inset-bottom);
}

.sheetHead {
  flex-shrink: 0;
  padding: 0 20rpx 6rpx;
}

.grabber {
  margin: 10rpx auto 8rpx;
  width: 64rpx;
  height: 7rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.14);
}
.t-dark .grabber {
  background: rgba(245, 247, 255, 0.18);
}

.headRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}

.headLead {
  display: flex;
  align-items: center;
  gap: 14rpx;
  min-width: 0;
  flex: 1;
}

.headText {
  display: flex;
  align-items: center;
  gap: 10rpx;
  min-width: 0;
  flex-wrap: wrap;
}

.title {
  font-size: 28rpx;
  font-weight: 740;
  color: rgba(16, 24, 40, 0.92);
}
.t-dark .title {
  color: #f5f7fa;
}

.metaChip {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.05);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
}
.t-dark .metaChip {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}
.metaChipText {
  font-size: 20rpx;
  font-weight: 680;
  color: rgba(16, 24, 40, 0.55);
}
.t-dark .metaChipText {
  color: rgba(245, 247, 255, 0.55);
}

.clockGlyph {
  position: relative;
  width: 18rpx;
  height: 18rpx;
}
.clockFace {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1.6rpx solid rgba(16, 24, 40, 0.45);
}
.t-dark .clockFace {
  border-color: rgba(245, 247, 255, 0.5);
}
.clockHand {
  position: absolute;
  left: 50%;
  top: 28%;
  width: 1.6rpx;
  height: 42%;
  background: rgba(16, 24, 40, 0.45);
  transform: translateX(-50%);
  border-radius: 999rpx;
}
.t-dark .clockHand {
  background: rgba(245, 247, 255, 0.5);
}

.iconBtn {
  flex-shrink: 0;
  width: 64rpx;
  height: 64rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 24, 40, 0.05);
  border: 1rpx solid rgba(16, 24, 40, 0.07);
  position: relative;
  z-index: 2;
  cursor: pointer;
  pointer-events: auto;
}
.t-dark .iconBtn {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
}
.iconBtn:active {
  transform: scale(0.92);
}

.closeGlyph {
  position: relative;
  width: 22rpx;
  height: 22rpx;
  pointer-events: none;
}
.closeLine {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 22rpx;
  height: 2rpx;
  background: rgba(16, 24, 40, 0.65);
  border-radius: 999rpx;
}
.t-dark .closeLine {
  background: rgba(245, 247, 255, 0.75);
}
.closeLine.a {
  transform: translate(-50%, -50%) rotate(45deg);
}
.closeLine.b {
  transform: translate(-50%, -50%) rotate(-45deg);
}

.undoGlyph,
.rowUndoIcon,
.fabGlyph,
.emptyGlyph {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.undoGlyph {
  width: 40rpx;
  height: 40rpx;
  flex-shrink: 0;
}
.rowUndoIcon {
  width: 44rpx;
  height: 44rpx;
  flex-shrink: 0;
  border-radius: 16rpx;
  background: rgba(46, 99, 255, 0.1);
}
.t-dark .rowUndoIcon {
  background: rgba(120, 160, 255, 0.14);
}
.fabGlyph {
  width: 36rpx;
  height: 36rpx;
}
.emptyGlyph {
  width: 56rpx;
  height: 56rpx;
  margin: 0 auto 14rpx;
  opacity: 0.35;
}

.undoArc {
  position: absolute;
  width: 28rpx;
  height: 28rpx;
  border-radius: 50%;
  border: 2.4rpx solid rgba(46, 99, 255, 0.85);
  border-right-color: transparent;
  border-bottom-color: transparent;
  transform: rotate(-38deg);
}
.undoArc.sm {
  width: 22rpx;
  height: 22rpx;
  border-width: 2rpx;
}
.undoArc.lg {
  width: 44rpx;
  height: 44rpx;
  border-width: 2.6rpx;
}
.t-dark .undoArc {
  border-color: rgba(170, 200, 255, 0.9);
  border-right-color: transparent;
  border-bottom-color: transparent;
}

.undoArrow {
  position: absolute;
  width: 0;
  height: 0;
  border-style: solid;
  border-width: 0 0 7rpx 10rpx;
  border-color: transparent transparent rgba(46, 99, 255, 0.9) transparent;
  transform: rotate(-18deg) translate(10rpx, -8rpx);
}
.undoArrow.sm {
  border-width: 0 0 5rpx 7rpx;
  transform: rotate(-18deg) translate(8rpx, -6rpx);
}
.undoArrow.lg {
  border-width: 0 0 9rpx 12rpx;
  transform: rotate(-18deg) translate(14rpx, -10rpx);
}
.t-dark .undoArrow {
  border-bottom-color: rgba(170, 200, 255, 0.95);
}

.empty {
  padding: 20rpx 22rpx 32rpx;
  text-align: center;
}
.emptyText {
  font-size: 23rpx;
  color: rgba(16, 24, 40, 0.45);
}
.t-dark .emptyText {
  color: rgba(245, 247, 255, 0.45);
}

.list {
  flex: 1;
  min-height: 0;
  max-height: 34vh;
  padding: 0 20rpx;
}
.row {
  position: relative;
  margin-top: 8rpx;
  padding: 16rpx 14rpx 16rpx 20rpx;
  border-radius: 18rpx;
  background: rgba(16, 24, 40, 0.035);
  border: 1rpx solid rgba(16, 24, 40, 0.05);
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.row.latest {
  background: rgba(46, 99, 255, 0.07);
  border-color: rgba(46, 99, 255, 0.16);
}
.t-dark .row {
  background: rgba(255, 255, 255, 0.035);
  border-color: rgba(255, 255, 255, 0.06);
}
.t-dark .row.latest {
  background: rgba(120, 160, 255, 0.1);
  border-color: rgba(120, 160, 255, 0.22);
}
.row:active {
  transform: scale(0.985);
}
.latestDot {
  position: absolute;
  left: 8rpx;
  top: 50%;
  width: 6rpx;
  height: 6rpx;
  margin-top: -3rpx;
  border-radius: 50%;
  background: rgba(46, 99, 255, 0.9);
}
.t-dark .latestDot {
  background: rgba(170, 200, 255, 0.95);
}
.rowMain {
  flex: 1;
  min-width: 0;
}
.rowLabel {
  font-size: 24rpx;
  font-weight: 620;
  color: rgba(16, 24, 40, 0.9);
  display: block;
}
.t-dark .rowLabel {
  color: rgba(245, 247, 255, 0.9);
}
.rowMeta {
  display: block;
  margin-top: 4rpx;
  font-size: 19rpx;
  color: rgba(16, 24, 40, 0.42);
}
.t-dark .rowMeta {
  color: rgba(245, 247, 255, 0.42);
}

.footer {
  flex-shrink: 0;
  padding: 12rpx 20rpx 16rpx;
  display: flex;
  justify-content: center;
}
.fabUndo {
  position: relative;
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #5a8eff, #2e63ff);
  box-shadow: 0 12rpx 32rpx rgba(46, 99, 255, 0.35);
}
.fabUndo:active {
  transform: scale(0.94);
}
.fabGlyph .undoArc {
  border-color: rgba(255, 255, 255, 0.95);
  border-right-color: transparent;
  border-bottom-color: transparent;
}
.fabGlyph .undoArrow {
  border-bottom-color: #fff;
}
.fabBadge {
  position: absolute;
  top: -4rpx;
  right: -4rpx;
  min-width: 32rpx;
  height: 32rpx;
  padding: 0 8rpx;
  border-radius: 999rpx;
  background: #fff;
  border: 2rpx solid #2e63ff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.fabBadgeText {
  font-size: 18rpx;
  font-weight: 760;
  color: #2e63ff;
}
</style>
