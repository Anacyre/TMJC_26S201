<template>
  <view class="stepProgress" :class="{ compact, complete: progress.percent >= 100 }">
    <view class="track">
      <view class="fill" :style="{ width: progress.percent + '%' }" />
    </view>
    <text v-if="showLabel" class="label">{{ progress.label }}</text>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { checklistProgress } from '@/lib/checklist'

const props = defineProps({
  checklist: { type: Array, default: () => [] },
  compact: { type: Boolean, default: false },
  showLabel: { type: Boolean, default: true },
})

const progress = computed(() => checklistProgress(props.checklist))
</script>

<style scoped>
.stepProgress {
  display: flex;
  align-items: center;
  gap: 12rpx;
  width: 100%;
  min-width: 0;
}

.track {
  flex: 1;
  min-width: 0;
  height: 10rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.08);
  overflow: hidden;
}

.t-dark .track {
  background: rgba(245, 247, 255, 0.1);
}

.compact .track {
  height: 8rpx;
}

.fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, rgba(46, 99, 255, 0.72), rgba(46, 99, 255, 0.94));
  transition: width 280ms cubic-bezier(0.4, 0, 0.2, 1);
}

.complete .fill {
  background: linear-gradient(90deg, rgba(34, 170, 110, 0.72), rgba(34, 170, 110, 0.94));
}

.label {
  flex-shrink: 0;
  font-size: 20rpx;
  font-weight: 700;
  color: rgba(16, 24, 40, 0.52);
  font-variant-numeric: tabular-nums;
}

.t-dark .label {
  color: rgba(245, 247, 255, 0.48);
}

.complete .label {
  color: rgba(34, 170, 110, 0.88);
}

.t-dark .complete .label {
  color: rgba(120, 220, 170, 0.88);
}
</style>
