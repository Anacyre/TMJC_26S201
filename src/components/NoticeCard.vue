<template>
  <view
    class="card"
    :class="[{ unread: !notice.read, glow: notice.important, hiding }, themeClass]"
    :id="id"
    role="button"
    @tap="$emit('open')"
  >
    <view class="main">
      <text class="title" :class="{ dim: notice.read }">{{ notice.title }}</text>
      <view class="row">
        <text class="tag">{{ notice.subject }}</text>
        <text v-if="notice.deadline" class="ddl">Due {{ notice.deadline }}</text>
      </view>
      <text class="preview" :class="{ dim: notice.read }">{{ notice.description }}</text>
      <text v-if="notice.attachment" class="attach">{{ notice.attachment }}</text>
    </view>
    <view class="actions" @tap.stop>
      <view
        class="iconAct star"
        :class="{ on: notice.important, pop: starPop }"
        role="button"
        @tap="onImportant"
      >
        <view class="starGlyph" :class="{ filled: notice.important }" />
      </view>
      <view
        class="iconAct planner"
        :class="{ on: notice.inPlanner, pop: plannerPop }"
        role="button"
        @tap="onPlanner"
      >
        <view class="plusGlyph" :class="{ filled: notice.inPlanner }">
          <view class="hLine" />
          <view class="vLine" />
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({
  notice: { type: Object, required: true },
  id: { type: String, default: '' },
  hiding: { type: Boolean, default: false },
})

const emit = defineEmits(['open', 'planner', 'important'])

const { themeClass } = useTheme()
const plannerPop = ref(false)
const starPop = ref(false)

function onPlanner() {
  if (props.notice.inPlanner) {
    emit('planner')
    return
  }
  plannerPop.value = true
  setTimeout(() => (plannerPop.value = false), 320)
  emit('planner')
}

function onImportant() {
  starPop.value = true
  setTimeout(() => (starPop.value = false), 280)
  emit('important')
}
</script>

<style scoped>
.card {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  gap: 12rpx;
  margin-top: 12rpx;
  padding: 16rpx 14rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.76);
  border: none;
  box-shadow: 0 14rpx 44rpx rgba(12, 20, 40, 0.08);
  transition: opacity 150ms ease, transform 150ms cubic-bezier(0.34, 1.2, 0.64, 1);
}
.t-dark.card {
  background: rgba(26, 29, 33, 0.88);
  box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.36);
}
.card.unread {
  box-shadow: 0 16rpx 50rpx rgba(46, 99, 255, 0.12);
}
.card.glow {
  box-shadow: 0 16rpx 52rpx rgba(46, 99, 255, 0.14);
}
.card.hiding {
  opacity: 0;
  transform: scale(0.98) translateX(12rpx);
}
.main {
  flex: 1;
  min-width: 0;
}
.title {
  font-size: 24rpx;
  font-weight: 740;
  color: rgba(16, 24, 40, 0.92);
}
.t-dark .title { color: rgba(245, 247, 255, 0.92); }
.title.dim { opacity: 0.72; }
.row {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
  margin-top: 8rpx;
  align-items: center;
}
.tag {
  font-size: 18rpx;
  padding: 4rpx 10rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.06);
  color: rgba(16, 24, 40, 0.65);
}
.t-dark .tag {
  background: rgba(245, 247, 255, 0.08);
  color: rgba(245, 247, 255, 0.62);
}
.ddl { font-size: 18rpx; color: rgba(46, 99, 255, 0.9); }
.preview {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.55);
  line-height: 1.45;
}
.t-dark .preview { color: rgba(245, 247, 255, 0.5); }
.preview.dim { opacity: 0.78; }
.attach {
  display: block;
  margin-top: 6rpx;
  font-size: 18rpx;
  color: rgba(46, 99, 255, 0.88);
}

.actions {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 10rpx;
  padding-left: 4rpx;
}
.iconAct {
  width: 52rpx;
  height: 52rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 24, 40, 0.05);
  transition: background 150ms ease, transform 150ms cubic-bezier(0.34, 1.2, 0.64, 1);
}
.t-dark .iconAct { background: rgba(255, 255, 255, 0.05); }
.iconAct:active { transform: scale(0.94); }
.iconAct.pop { animation: actPop 280ms cubic-bezier(0.34, 1.2, 0.64, 1); }
.iconAct.on { background: rgba(46, 99, 255, 0.16); }

@keyframes actPop {
  0% { transform: scale(1); }
  45% { transform: scale(1.08); }
  100% { transform: scale(1); }
}

.starGlyph {
  width: 22rpx;
  height: 22rpx;
  position: relative;
  transform: rotate(0deg);
}
.starGlyph::before {
  content: '★';
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.42);
  transition: color 150ms ease, transform 150ms ease;
}
.starGlyph.filled::before {
  color: rgba(46, 99, 255, 0.95);
  transform: scale(1.05);
}
.t-dark .starGlyph::before { color: rgba(245, 247, 255, 0.42); }
.t-dark .starGlyph.filled::before { color: rgba(170, 200, 255, 0.96); }

.plusGlyph {
  position: relative;
  width: 22rpx;
  height: 22rpx;
}
.hLine, .vLine {
  position: absolute;
  left: 50%;
  top: 50%;
  background: rgba(16, 24, 40, 0.48);
  border-radius: 999rpx;
  transition: background 150ms ease, transform 150ms ease;
}
.hLine { width: 18rpx; height: 2rpx; margin: -1rpx 0 0 -9rpx; }
.vLine { width: 2rpx; height: 18rpx; margin: -9rpx 0 0 -1rpx; }
.plusGlyph.filled .hLine,
.plusGlyph.filled .vLine {
  background: rgba(46, 99, 255, 0.95);
  transform: scale(1.05);
}
.t-dark .hLine, .t-dark .vLine { background: rgba(245, 247, 255, 0.48); }
.t-dark .plusGlyph.filled .hLine,
.t-dark .plusGlyph.filled .vLine { background: rgba(170, 200, 255, 0.96); }
</style>
