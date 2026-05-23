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
      <view class="iconAct" :class="{ on: notice.inPlanner }" role="button" @tap="$emit('planner')">
        <text class="glyph">+</text>
      </view>
      <view class="iconAct" :class="{ on: notice.important }" role="button" @tap="$emit('important')">
        <text class="glyph">★</text>
      </view>
      <view class="iconAct" role="button" @tap="$emit('hide')">
        <text class="glyph sm">−</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { useTheme } from '@/composables/useTheme'

defineProps({
  notice: { type: Object, required: true },
  id: { type: String, default: '' },
  hiding: { type: Boolean, default: false },
})
defineEmits(['open', 'planner', 'important', 'hide'])

const { themeClass } = useTheme()
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
  border: 1rpx solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 14rpx 44rpx rgba(12, 20, 40, 0.08);
  transition: opacity 0.32s ease, transform 0.22s ease, box-shadow 0.22s ease;
}
.t-dark.card {
  background: #1a1d21;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.36);
}
.card.unread {
  border-color: rgba(46, 99, 255, 0.22);
  box-shadow: 0 16rpx 50rpx rgba(46, 99, 255, 0.12);
}
.card.glow {
  box-shadow: 0 16rpx 52rpx rgba(46, 99, 255, 0.14);
}
.card.hiding {
  opacity: 0;
  transform: scale(0.98);
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
.t-dark .title {
  color: rgba(245, 247, 255, 0.92);
}
.title.dim {
  opacity: 0.72;
}
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
.ddl {
  font-size: 18rpx;
  color: rgba(46, 99, 255, 0.9);
}
.preview {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.55);
  line-height: 1.45;
}
.t-dark .preview {
  color: rgba(245, 247, 255, 0.5);
}
.preview.dim {
  opacity: 0.78;
}
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
  border: 1rpx solid rgba(16, 24, 40, 0.08);
  transition: background 0.18s ease, transform 0.16s ease;
}
.t-dark .iconAct {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.06);
}
.iconAct:active {
  transform: scale(0.94);
}
.iconAct.on {
  background: rgba(46, 99, 255, 0.16);
  border-color: rgba(46, 99, 255, 0.24);
}
.glyph {
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.55);
}
.glyph.sm {
  font-size: 26rpx;
  font-weight: 300;
}
.t-dark .glyph {
  color: rgba(245, 247, 255, 0.55);
}
.iconAct.on .glyph {
  color: rgba(46, 99, 255, 0.95);
}
</style>
