<template>
  <view
    class="card"
    :class="[{ unread: !notice.read, glow: notice.important, hiding: hiding || localHiding }, themeClass]"
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
      <view class="actionRow">
        <view
          class="act star"
          :class="{ on: notice.important, pop: starPop }"
          role="button"
          @tap="onImportant"
        >
          <view class="iconBox">
            <view class="starGlyph" :class="{ filled: notice.important }" />
          </view>
        </view>

        <view class="plannerSlot">
          <view
            v-if="showPlus"
            class="act planner"
            role="button"
            @tap="onPlanner"
          >
            <view class="iconBox">
              <view class="plusGlyph">
                <view class="hLine" />
                <view class="vLine" />
              </view>
            </view>
          </view>
          <view
            v-else
            class="act check"
            :class="{ animate: checkAnimating }"
            role="button"
            @tap="onPlannerTapDone"
          >
            <view class="iconBox">
              <view class="checkGlyph">
                <view class="tickShort" />
                <view class="tickLong" />
              </view>
            </view>
          </view>
        </view>
      </view>
      <text v-if="notice.inPlanner && !localHiding" class="plannerHint">In planner</text>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({
  notice: { type: Object, required: true },
  id: { type: String, default: '' },
  hiding: { type: Boolean, default: false },
})

const emit = defineEmits(['open', 'planner', 'important'])

const { themeClass } = useTheme()
const starPop = ref(false)
const checkAnimating = ref(false)
const localHiding = ref(false)
const plannerBusy = ref(false)

const showPlus = computed(
  () => !props.notice.inPlanner && !checkAnimating.value && !localHiding.value
)

function onPlannerTapDone() {
  if (props.notice.inPlanner) {
    emit('planner')
  }
}

function onPlanner() {
  if (props.notice.inPlanner) {
    emit('planner')
    return
  }
  if (plannerBusy.value) return
  plannerBusy.value = true
  checkAnimating.value = true

  setTimeout(() => {
    localHiding.value = true
  }, 380)

  setTimeout(() => {
    emit('planner')
  }, 1000)
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
  transition: opacity 620ms ease, transform 620ms cubic-bezier(0.34, 1.1, 0.64, 1);
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
  transform: scale(0.97) translateX(16rpx);
  pointer-events: none;
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
  align-items: center;
  justify-content: center;
  gap: 4rpx;
  padding-left: 6rpx;
  flex-shrink: 0;
  align-self: center;
}

.actionRow {
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 18rpx;
}

.iconBox {
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.plannerHint {
  font-size: 16rpx;
  font-weight: 660;
  color: rgba(46, 99, 255, 0.88);
  letter-spacing: 0.2rpx;
  line-height: 1.2;
  text-align: center;
  max-width: 120rpx;
}
.t-dark .plannerHint {
  color: rgba(170, 200, 255, 0.9);
}

.act {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  transition: transform 150ms cubic-bezier(0.34, 1.2, 0.64, 1);
}
.act:active { transform: scale(0.9); }
.act.pop { animation: actPop 280ms cubic-bezier(0.34, 1.2, 0.64, 1); }

.plannerSlot {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

@keyframes actPop {
  0% { transform: scale(1); }
  45% { transform: scale(1.12); }
  100% { transform: scale(1); }
}

.starGlyph {
  width: 36rpx;
  height: 36rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.starGlyph::before {
  content: '*';
  font-size: 40rpx;
  line-height: 1;
  font-weight: 700;
  color: rgba(16, 24, 40, 0.38);
  transition: color 180ms ease, transform 180ms ease;
  transform: translateY(-1rpx);
}
.starGlyph.filled::before {
  color: rgba(46, 99, 255, 0.95);
  transform: scale(1.08);
}
.t-dark .starGlyph::before { color: rgba(245, 247, 255, 0.38); }
.t-dark .starGlyph.filled::before { color: rgba(170, 200, 255, 0.96); }

.plusGlyph {
  position: relative;
  width: 32rpx;
  height: 32rpx;
}
.hLine, .vLine {
  position: absolute;
  left: 50%;
  top: 50%;
  background: rgba(16, 24, 40, 0.52);
  border-radius: 999rpx;
  transition: opacity 180ms ease, transform 180ms ease;
}
.hLine { width: 28rpx; height: 3rpx; margin: -1.5rpx 0 0 -14rpx; }
.vLine { width: 3rpx; height: 28rpx; margin: -14rpx 0 0 -1.5rpx; }
.t-dark .hLine, .t-dark .vLine { background: rgba(245, 247, 255, 0.52); }

.checkGlyph {
  position: relative;
  width: 34rpx;
  height: 34rpx;
}
.tickShort, .tickLong {
  position: absolute;
  background: rgba(46, 99, 255, 0.95);
  border-radius: 999rpx;
  transform-origin: left center;
}
.t-dark .tickShort, .t-dark .tickLong {
  background: rgba(170, 200, 255, 0.96);
}
.tickShort {
  width: 10rpx;
  height: 3rpx;
  left: 6rpx;
  bottom: 12rpx;
  transform: rotate(45deg) scaleX(0);
}
.tickLong {
  width: 20rpx;
  height: 3rpx;
  left: 12rpx;
  bottom: 15rpx;
  transform: rotate(-45deg) scaleX(0);
}

.act.check.animate .tickShort {
  animation: tickDraw 320ms cubic-bezier(0.34, 1.2, 0.64, 1) forwards;
}
.act.check.animate .tickLong {
  animation: tickDraw 320ms cubic-bezier(0.34, 1.2, 0.64, 1) 120ms forwards;
}
.act.check:not(.animate) .tickShort {
  transform: rotate(45deg) scaleX(1);
}
.act.check:not(.animate) .tickLong {
  transform: rotate(-45deg) scaleX(1);
}

@keyframes tickDraw {
  from { transform: rotate(45deg) scaleX(0); opacity: 0.2; }
  to { transform: rotate(45deg) scaleX(1); opacity: 1; }
}
.act.check.animate .tickLong {
  animation-name: tickDrawLong;
}
@keyframes tickDrawLong {
  from { transform: rotate(-45deg) scaleX(0); opacity: 0.2; }
  to { transform: rotate(-45deg) scaleX(1); opacity: 1; }
}
</style>
