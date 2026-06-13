<template>
  <view class="item tap" role="button" @tap="$emit('open')">
    <view class="fileIcon" :class="'kind-' + kind">
      <text class="fileIconText">{{ iconLabel }}</text>
    </view>
    <view class="itemMain">
      <text class="itemTitle" :number-of-lines="1">{{ post.title }}</text>
      <view class="itemMeta">
        <text class="metaChip">{{ post.communityName || 'Space' }}</text>
        <text class="metaDot">·</text>
        <text class="metaSize">{{ sizeLabel }}</text>
        <text class="metaDot">·</text>
        <text class="metaTime">{{ timeLabel }}</text>
      </view>
    </view>
    <text class="itemChev">›</text>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import {
  formatMaterialFileSize,
  materialFileIconLabel,
  materialFileKind,
} from '@/lib/communityMaterials'

const props = defineProps({
  post: { type: Object, required: true },
  timeLabel: { type: String, default: '' },
})

defineEmits(['open'])

const kind = computed(() => materialFileKind(props.post))
const iconLabel = computed(() => materialFileIconLabel(kind.value))
const sizeLabel = computed(() => formatMaterialFileSize(props.post.fileSize))
</script>

<style scoped>
.item {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 14rpx 16rpx;
  border-radius: 20rpx;
  background: rgba(255, 255, 255, 0.72);
  border: 1rpx solid rgba(16, 24, 40, 0.05);
}
.t-dark .item {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.item:active { opacity: 0.9; transform: scale(0.992); }

.fileIcon {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(46, 99, 255, 0.12);
}
.fileIconText {
  font-size: 16rpx;
  font-weight: 800;
  letter-spacing: 0.4rpx;
  color: rgba(46, 99, 255, 0.92);
}
.kind-pdf { background: rgba(255, 59, 48, 0.1); }
.kind-pdf .fileIconText { color: rgba(220, 50, 40, 0.92); }
.kind-doc { background: rgba(46, 99, 255, 0.12); }
.kind-ppt { background: rgba(255, 149, 0, 0.12); }
.kind-ppt .fileIconText { color: rgba(220, 120, 0, 0.92); }
.kind-sheet { background: rgba(52, 199, 89, 0.12); }
.kind-sheet .fileIconText { color: rgba(34, 150, 60, 0.92); }
.kind-image { background: rgba(175, 82, 222, 0.12); }
.kind-image .fileIconText { color: rgba(150, 70, 200, 0.92); }
.kind-archive { background: rgba(16, 24, 40, 0.08); }
.kind-video { background: rgba(90, 200, 250, 0.12); }
.kind-video .fileIconText { color: rgba(40, 150, 210, 0.92); }
.t-dark .kind-archive { background: rgba(255, 255, 255, 0.08); }

.itemMain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.itemTitle {
  font-size: 24rpx;
  font-weight: 720;
  color: rgba(16, 24, 40, 0.92);
  line-height: 1.3;
}
.t-dark .itemTitle { color: rgba(245, 247, 255, 0.92); }
.itemMeta { display: flex; align-items: center; gap: 6rpx; flex-wrap: wrap; }
.metaChip, .metaSize, .metaTime {
  font-size: 18rpx;
  font-weight: 660;
  color: rgba(16, 24, 40, 0.46);
}
.t-dark .metaChip, .t-dark .metaSize, .t-dark .metaTime { color: rgba(245, 247, 255, 0.42); }
.metaDot { font-size: 18rpx; color: rgba(16, 24, 40, 0.24); }
.t-dark .metaDot { color: rgba(245, 247, 255, 0.24); }
.itemChev { font-size: 22rpx; color: rgba(46, 99, 255, 0.42); flex-shrink: 0; }
</style>
