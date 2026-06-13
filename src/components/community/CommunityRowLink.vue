<template>
  <view class="row tap" role="button" @tap="$emit('open')">
    <view v-if="iconGlyph" class="glyph">{{ iconGlyph }}</view>
    <view v-else-if="showFolderIcon" class="glyphIcon folder" aria-hidden="true" />
    <view class="copy">
      <text class="title">{{ title }}</text>
      <text v-if="meta" class="meta">{{ meta }}</text>
    </view>
    <text v-if="count != null && count !== ''" class="count">{{ count }}</text>
    <text class="chev">›</text>
  </view>
</template>

<script setup>
defineProps({
  title: { type: String, default: '' },
  meta: { type: String, default: '' },
  count: { type: [Number, String], default: null },
  iconGlyph: { type: String, default: '' },
  showFolderIcon: { type: Boolean, default: false },
})

defineEmits(['open'])
</script>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: var(--list-card-gap, 14rpx);
  padding: var(--list-card-pad-y, 14rpx) var(--list-card-pad-x, 16rpx);
  border-radius: var(--list-card-radius, 20rpx);
  background: rgba(255, 255, 255, 0.7);
  border: 1rpx solid rgba(16, 24, 40, 0.04);
}
.t-dark .row {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.row:active { transform: scale(0.985); opacity: 0.92; }
.glyph {
  width: var(--list-icon-size, 56rpx);
  height: var(--list-icon-size, 56rpx);
  border-radius: var(--list-icon-radius, 18rpx);
  background: rgba(46, 99, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(46, 99, 255, 0.95);
  font-size: var(--list-icon-font, 28rpx);
  font-weight: 720;
  flex-shrink: 0;
}
.t-dark .glyph {
  background: rgba(120, 160, 255, 0.14);
  color: rgba(170, 200, 255, 0.96);
}
.glyphIcon.folder {
  width: 36rpx;
  height: 30rpx;
  border-radius: 6rpx 6rpx 8rpx 8rpx;
  background: rgba(46, 99, 255, 0.24);
  flex-shrink: 0;
  position: relative;
}
.glyphIcon.folder::before {
  content: '';
  position: absolute;
  left: 6rpx;
  top: -5rpx;
  width: 14rpx;
  height: 7rpx;
  border-radius: 4rpx 4rpx 0 0;
  background: rgba(46, 99, 255, 0.38);
}
.copy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.title {
  font-size: var(--list-title-size, 24rpx);
  font-weight: 720;
  color: rgba(16, 24, 40, 0.92);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.t-dark .title { color: rgba(245, 247, 255, 0.92); }
.meta {
  font-size: var(--list-meta-size, 20rpx);
  color: rgba(16, 24, 40, 0.48);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.t-dark .meta { color: rgba(245, 247, 255, 0.42); }
.count {
  font-size: 20rpx;
  font-weight: 700;
  color: rgba(46, 99, 255, 0.78);
  flex-shrink: 0;
}
.t-dark .count { color: rgba(170, 200, 255, 0.78); }
.chev {
  font-size: 26rpx;
  color: rgba(46, 99, 255, 0.38);
  flex-shrink: 0;
  line-height: 1;
}
</style>
