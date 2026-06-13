<template>
  <view class="hub tap" role="button" @tap="$emit('open')">
    <view class="hubIcon" aria-hidden="true">
      <view class="folderBack" />
      <view class="folderFront" />
      <view class="folderTab" />
    </view>
    <view class="hubCopy">
      <text class="hubTitle">{{ title }}</text>
      <text class="hubMeta">{{ count }} {{ count === 1 ? 'file' : 'files' }}</text>
    </view>
    <text class="hubChev">›</text>
  </view>
</template>

<script setup>
defineProps({
  title: { type: String, default: 'Materials' },
  count: { type: Number, default: 0 },
})

defineEmits(['open'])
</script>

<style scoped>
.hub {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 16rpx 18rpx;
  border-radius: 22rpx;
  background: rgba(46, 99, 255, 0.06);
  border: 1rpx solid rgba(46, 99, 255, 0.12);
}
.t-dark .hub {
  background: rgba(120, 160, 255, 0.08);
  border-color: rgba(120, 160, 255, 0.14);
}
.hub:active { opacity: 0.88; transform: scale(0.99); }

.hubIcon {
  width: 52rpx;
  height: 44rpx;
  position: relative;
  flex-shrink: 0;
}
.folderBack {
  position: absolute;
  left: 4rpx;
  right: 4rpx;
  bottom: 2rpx;
  height: 28rpx;
  border-radius: 6rpx;
  background: rgba(46, 99, 255, 0.22);
}
.folderTab {
  position: absolute;
  left: 8rpx;
  top: 6rpx;
  width: 18rpx;
  height: 8rpx;
  border-radius: 4rpx 4rpx 0 0;
  background: rgba(46, 99, 255, 0.34);
}
.folderFront {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 24rpx;
  border-radius: 8rpx;
  background: rgba(46, 99, 255, 0.42);
}
.t-dark .folderBack { background: rgba(120, 160, 255, 0.24); }
.t-dark .folderTab { background: rgba(120, 160, 255, 0.36); }
.t-dark .folderFront { background: rgba(120, 160, 255, 0.48); }

.hubCopy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2rpx; }
.hubTitle { font-size: 24rpx; font-weight: 740; color: rgba(16, 24, 40, 0.9); }
.t-dark .hubTitle { color: rgba(245, 247, 255, 0.9); }
.hubMeta { font-size: 18rpx; font-weight: 660; color: rgba(46, 99, 255, 0.72); }
.t-dark .hubMeta { color: rgba(170, 200, 255, 0.72); }
.hubChev { font-size: 24rpx; color: rgba(46, 99, 255, 0.45); flex-shrink: 0; }
</style>
