<template>
  <Teleport to="body">
    <view v-if="open" class="overlay" :class="[themeClass, { show: visible }]" @tap="close">
      <view class="sheet" @tap.stop>
        <view class="grabber" />
        <text class="title">Undo</text>
        <text class="sub">Recent actions you can reverse</text>

        <view v-if="!pending.length" class="empty">
          <text class="emptyText">No actions to undo</text>
        </view>

        <scroll-view v-else class="list" scroll-y :show-scrollbar="false">
          <view
            v-for="entry in pending"
            :key="entry.id"
            class="row tap"
            role="button"
            @tap="pick(entry)"
          >
            <text class="rowLabel">{{ entry.menuLabel }}</text>
            <text class="rowAction">Undo</text>
          </view>
        </scroll-view>

        <view v-if="pending.length" class="mainBtn tap" role="button" @tap="undoLatest">
          <text class="mainBtnText">Undo latest</text>
        </view>
      </view>
    </view>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { pendingUndoEntries, undoById, undoLast } from '@/composables/useUndo'

const props = defineProps({
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:open', 'close'])

const { themeClass } = useTheme()
const visible = ref(false)
const pending = pendingUndoEntries

watch(
  () => props.open,
  async (v) => {
    if (v) {
      await nextTick()
      requestAnimationFrame(() => { visible.value = true })
    } else {
      visible.value = false
    }
  },
)

function close() {
  visible.value = false
  setTimeout(() => emit('update:open', false), 200)
  emit('close')
}

function pick(entry) {
  undoById(entry.id)
  close()
}

function undoLatest() {
  undoLast()
  close()
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
  max-height: 62vh;
  padding: 0 22rpx 22rpx;
  border-radius: 32rpx;
  background: rgba(255, 255, 255, 0.94);
  border: 1rpx solid rgba(255, 255, 255, 0.6);
  transform: translateY(24rpx);
  transition: transform 0.22s cubic-bezier(0.34, 1.2, 0.64, 1);
}
.overlay.show .sheet {
  transform: translateY(0);
}
.t-dark .sheet {
  background: #1a1d21;
  border-color: rgba(255, 255, 255, 0.06);
}

.grabber {
  margin: 12rpx auto;
  width: 72rpx;
  height: 8rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.18);
}
.t-dark .grabber {
  background: rgba(245, 247, 255, 0.2);
}

.title {
  font-size: 28rpx;
  font-weight: 740;
  color: rgba(16, 24, 40, 0.92);
}
.t-dark .title {
  color: #f5f7fa;
}
.sub {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.5);
}
.t-dark .sub {
  color: rgba(245, 247, 255, 0.5);
}

.empty {
  padding: 36rpx 0;
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
  max-height: 360rpx;
  margin-top: 16rpx;
}
.row {
  margin-top: 10rpx;
  padding: 18rpx 16rpx;
  border-radius: 20rpx;
  background: rgba(16, 24, 40, 0.04);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
}
.t-dark .row {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.rowLabel {
  flex: 1;
  font-size: 23rpx;
  color: rgba(16, 24, 40, 0.88);
}
.t-dark .rowLabel {
  color: rgba(245, 247, 255, 0.88);
}
.rowAction {
  font-size: 22rpx;
  font-weight: 700;
  color: rgba(46, 99, 255, 0.95);
}
.t-dark .rowAction {
  color: rgba(170, 200, 255, 0.95);
}

.mainBtn {
  margin-top: 18rpx;
  height: 84rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #5a8eff, #2e63ff);
}
.mainBtnText {
  font-size: 24rpx;
  font-weight: 720;
  color: #fff;
}
</style>
