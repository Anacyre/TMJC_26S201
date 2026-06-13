<template>
  <view class="item tap" role="button" @tap="$emit('open')">
    <view class="itemHead">
      <view class="avatar">{{ avatarInitials }}</view>
      <view class="headCopy">
        <text class="author">{{ authorName }}</text>
        <text class="time">{{ post.timeLabel }}</text>
      </view>
      <view v-if="post.image || post.attachment" class="attachTag">
        <text class="attachTagText">{{ attachLabel }}</text>
      </view>
    </view>
    <text class="title">{{ post.title }}</text>
    <view class="itemFoot">
      <text class="stat">♥ {{ post.likesCount || 0 }}</text>
      <text class="stat">💬 {{ post.commentsCount || 0 }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { isMaterialPost } from '@/lib/communityMaterials'
import { personInitials } from '@/lib/personDisplay'

const props = defineProps({
  post: { type: Object, required: true },
})

defineEmits(['open'])

const authorName = computed(() =>
  props.post.anonymous ? 'Anonymous' : props.post.author
)

const avatarInitials = computed(() => personInitials(authorName.value))

const attachLabel = computed(() => {
  if (isMaterialPost(props.post)) return 'Material'
  if (props.post.image) return 'Image'
  return 'File'
})
</script>

<style scoped>
.item {
  padding: var(--list-card-pad-y, 14rpx) var(--list-card-pad-x, 16rpx);
  border-radius: var(--list-card-radius, 20rpx);
  background: rgba(255, 255, 255, 0.7);
  border: 1rpx solid rgba(16, 24, 40, 0.04);
}
.t-dark .item {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.item:active { opacity: 0.9; transform: scale(0.99); }
.itemHead { display: flex; align-items: center; gap: 10rpx; }
.avatar {
  width: 48rpx; height: 48rpx; border-radius: 50%; flex-shrink: 0;
  background: rgba(46, 99, 255, 0.14);
  display: flex; align-items: center; justify-content: center;
  color: rgba(46, 99, 255, 0.96); font-size: 17rpx; font-weight: 760;
}
.t-dark .avatar { background: rgba(120, 160, 255, 0.16); color: rgba(170, 200, 255, 0.96); }
.headCopy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2rpx; }
.author { font-size: 20rpx; font-weight: 720; color: rgba(16, 24, 40, 0.82); }
.t-dark .author { color: rgba(245, 247, 255, 0.82); }
.time { font-size: 18rpx; color: rgba(16, 24, 40, 0.42); }
.t-dark .time { color: rgba(245, 247, 255, 0.38); }
.attachTag {
  padding: 4rpx 10rpx; border-radius: 999rpx;
  background: rgba(46, 99, 255, 0.1); flex-shrink: 0;
}
.attachTagText { font-size: 17rpx; font-weight: 700; color: rgba(46, 99, 255, 0.88); }
.title {
  display: block;
  margin-top: 10rpx;
  font-size: var(--list-title-size, 24rpx);
  font-weight: 720;
  color: rgba(16, 24, 40, 0.92);
  line-height: 1.35;
}
.t-dark .title { color: rgba(245, 247, 255, 0.92); }
.itemFoot {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  gap: 16rpx;
}
.stat { font-size: 19rpx; font-weight: 660; color: rgba(16, 24, 40, 0.52); }
.t-dark .stat { color: rgba(245, 247, 255, 0.48); }
</style>
