<template>
  <view class="segWrap">
    <view
      v-for="opt in options"
      :key="opt.id"
      class="seg tap"
      :class="{ on: modelValue === opt.id }"
      role="button"
      @tap="$emit('update:modelValue', opt.id)"
    >
      <text class="segLabel">{{ opt.label }}</text>
      <text v-if="opt.count != null && opt.count !== ''" class="segCount">{{ opt.count }}</text>
    </view>
  </view>
</template>

<script setup>
defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
})

defineEmits(['update:modelValue'])
</script>

<style scoped>
.segWrap {
  display: flex;
  gap: 10rpx;
  padding: 4rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.72);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
}
.t-dark .segWrap {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}
.seg {
  flex: 1;
  min-height: 68rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  padding: 0 10rpx;
}
.seg.on {
  background: rgba(46, 99, 255, 0.12);
}
.t-dark .seg.on {
  background: rgba(120, 160, 255, 0.16);
}
.segLabel {
  font-size: 22rpx;
  font-weight: 660;
  color: rgba(16, 24, 40, 0.55);
}
.seg.on .segLabel {
  color: rgba(46, 99, 255, 0.96);
  font-weight: 740;
}
.t-dark .segLabel { color: rgba(245, 247, 255, 0.52); }
.t-dark .seg.on .segLabel { color: rgba(170, 200, 255, 0.96); }
.segCount {
  min-width: 28rpx;
  height: 28rpx;
  padding: 0 8rpx;
  border-radius: 999rpx;
  background: rgba(46, 99, 255, 0.1);
  font-size: 17rpx;
  font-weight: 760;
  color: rgba(46, 99, 255, 0.88);
  line-height: 28rpx;
  text-align: center;
}
.t-dark .segCount {
  background: rgba(120, 160, 255, 0.14);
  color: rgba(170, 200, 255, 0.88);
}
.tap:active { opacity: 0.88; transform: scale(0.99); }
</style>
