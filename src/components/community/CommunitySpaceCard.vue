<template>
  <view class="card tap" role="button" @tap="$emit('open')">
    <view class="icon">{{ space.icon || '◉' }}</view>
    <view class="main">
      <view class="titleRow">
        <text class="name">{{ space.name }}</text>
        <view v-if="space.pinned" class="pin" aria-label="Pinned" />
      </view>
      <text class="desc" :number-of-lines="1">{{ space.desc || 'No description' }}</text>
    </view>
    <view class="side">
      <view class="infoBtn tap" role="button" @tap.stop="$emit('info')">
        <text class="infoText">i</text>
      </view>
      <text class="chev">›</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  space: { type: Object, required: true },
})

defineEmits(['open', 'info'])
</script>

<style scoped>
.card {
  display: flex;
  align-items: center;
  gap: var(--list-card-gap, 14rpx);
  padding: var(--list-card-pad-y, 14rpx) var(--list-card-pad-x, 16rpx);
  border-radius: var(--list-card-radius, 20rpx);
  background: rgba(255, 255, 255, 0.7);
  border: 1rpx solid rgba(16, 24, 40, 0.04);
}
.t-dark .card {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.card:active { transform: scale(0.985); }
.icon {
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
.t-dark .icon {
  background: rgba(120, 160, 255, 0.14);
  color: rgba(170, 200, 255, 0.96);
}
.main { flex: 1; min-width: 0; }
.titleRow { display: flex; align-items: center; gap: 8rpx; min-width: 0; }
.name {
  font-size: var(--list-title-size, 24rpx);
  font-weight: 720;
  color: rgba(16, 24, 40, 0.92);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.t-dark .name { color: rgba(245, 247, 255, 0.92); }
.pin {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: rgba(46, 99, 255, 0.88);
  flex-shrink: 0;
}
.desc {
  margin-top: 4rpx;
  font-size: var(--list-meta-size, 20rpx);
  color: rgba(16, 24, 40, 0.48);
  line-height: 1.35;
}
.t-dark .desc { color: rgba(245, 247, 255, 0.42); }
.side {
  display: flex;
  align-items: center;
  gap: 6rpx;
  flex-shrink: 0;
}
.infoBtn {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 24, 40, 0.04);
}
.t-dark .infoBtn { background: rgba(255, 255, 255, 0.06); }
.infoText {
  font-size: 20rpx;
  font-weight: 760;
  font-style: italic;
  color: rgba(16, 24, 40, 0.45);
}
.t-dark .infoText { color: rgba(245, 247, 255, 0.45); }
.chev { font-size: 24rpx; color: rgba(46, 99, 255, 0.35); }
</style>
