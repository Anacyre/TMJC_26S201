<template>
  <view class="panel postPanel">
    <view class="authorRow">
      <view class="authorAvatar">{{ avatarInitials }}</view>
      <view class="authorCopy">
        <text class="authorName">{{ authorName }}</text>
        <text class="authorTime">{{ timeLabel }}</text>
      </view>
      <view v-if="post.image || post.attachment" class="attachTag">
        <text class="attachTagText">{{ post.image ? 'Image' : 'File' }}</text>
      </view>
    </view>

    <text class="title">{{ post.title }}</text>
    <text class="content">{{ post.content || 'No content yet.' }}</text>

    <image
      v-if="post.image"
      class="postImg"
      :src="post.image"
      mode="widthFix"
      @tap="$emit('openAttachment', post.image)"
    />
    <view
      v-if="post.attachment && !post.image"
      class="attachRow tap"
      role="button"
      @tap="$emit('openAttachment', post.attachmentUrl)"
    >
      <text class="attachName">{{ post.attachment }}</text>
      <text class="attachAction">Open</text>
    </view>
    <view
      v-else-if="post.attachment && post.image"
      class="attachRow tap"
      role="button"
      @tap="$emit('openAttachment', post.attachmentUrl)"
    >
      <text class="attachName">{{ post.attachment }}</text>
      <text class="attachAction">Download</text>
    </view>

    <view class="actionBar">
      <view class="actionBtn like tap" :class="{ on: post.liked }" role="button" @tap="$emit('toggleLike')">
        <text class="actionIcon">{{ post.liked ? '♥' : '♡' }}</text>
        <text class="actionLabel">{{ post.likesCount || 0 }}</text>
      </view>
      <view class="actionBtn save tap" :class="{ on: saved }" role="button" @tap="$emit('toggleSave')">
        <text class="actionIcon">{{ saved ? '★' : '☆' }}</text>
        <text class="actionLabel">{{ saved ? 'Saved' : 'Save' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { personInitials } from '@/lib/personDisplay'

const props = defineProps({
  post: { type: Object, required: true },
  timeLabel: { type: String, default: '' },
  saved: { type: Boolean, default: false },
})

defineEmits(['toggleLike', 'toggleSave', 'openAttachment'])

const authorName = computed(() =>
  props.post.anonymous ? 'Anonymous' : props.post.author
)
const avatarInitials = computed(() => personInitials(authorName.value))
</script>

<style scoped>
.panel {
  padding: var(--list-card-pad-y, 14rpx) var(--list-card-pad-x, 16rpx);
  border-radius: var(--list-card-radius, 20rpx);
  background: rgba(255, 255, 255, 0.7);
  border: 1rpx solid rgba(16, 24, 40, 0.04);
}
.t-dark .panel {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.attachTag {
  padding: 4rpx 10rpx;
  border-radius: 999rpx;
  background: rgba(46, 99, 255, 0.1);
  flex-shrink: 0;
}
.attachTagText { font-size: 17rpx; font-weight: 700; color: rgba(46, 99, 255, 0.88); }

.authorRow {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding-bottom: 12rpx;
}
.authorAvatar {
  width: 56rpx; height: 56rpx; border-radius: 50%; flex-shrink: 0;
  background: rgba(46, 99, 255, 0.14);
  display: flex; align-items: center; justify-content: center;
  color: rgba(46, 99, 255, 0.96); font-size: 19rpx; font-weight: 760;
}
.t-dark .authorAvatar { background: rgba(120, 160, 255, 0.16); color: rgba(170, 200, 255, 0.96); }
.authorCopy { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2rpx; }
.authorName { font-size: 22rpx; font-weight: 720; color: rgba(16, 24, 40, 0.88); }
.t-dark .authorName { color: rgba(245, 247, 255, 0.88); }
.authorTime { font-size: 19rpx; color: rgba(16, 24, 40, 0.45); }
.t-dark .authorTime { color: rgba(245, 247, 255, 0.4); }

.title {
  display: block;
  margin-top: 4rpx;
  font-size: 26rpx;
  font-weight: 780;
  color: rgba(16, 24, 40, 0.92);
  line-height: 1.35;
}
.t-dark .title { color: rgba(245, 247, 255, 0.92); }
.content {
  display: block;
  margin-top: 12rpx;
  font-size: 23rpx;
  line-height: 1.55;
  color: rgba(16, 24, 40, 0.78);
}
.t-dark .content { color: rgba(245, 247, 255, 0.78); }
.postImg {
  width: 100%;
  margin-top: 14rpx;
  border-radius: 16rpx;
  display: block;
}
.attachRow {
  margin-top: 12rpx;
  padding: 12rpx 14rpx;
  border-radius: 16rpx;
  background: rgba(46, 99, 255, 0.06);
  border: 1rpx solid rgba(46, 99, 255, 0.16);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
}
.attachName { flex: 1; font-size: 22rpx; color: rgba(46, 99, 255, 0.92); }
.t-dark .attachName { color: rgba(170, 200, 255, 0.92); }
.attachAction { font-size: 20rpx; font-weight: 640; color: rgba(16, 24, 40, 0.55); }
.t-dark .attachAction { color: rgba(245, 247, 255, 0.55); }

.actionBar {
  margin-top: 12rpx;
  padding-top: 10rpx;
  border-top: 1rpx solid rgba(16, 24, 40, 0.06);
  display: flex;
  align-items: center;
  gap: 28rpx;
}
.t-dark .actionBar { border-top-color: rgba(255, 255, 255, 0.06); }
.actionBtn {
  display: flex;
  align-items: center;
  gap: 6rpx;
  padding: 2rpx 0;
  min-height: 36rpx;
}
.actionBtn:active { opacity: 0.65; }
.actionIcon {
  font-size: 24rpx;
  line-height: 1;
  color: rgba(16, 24, 40, 0.42);
}
.actionLabel {
  font-size: 19rpx;
  font-weight: 620;
  color: rgba(16, 24, 40, 0.48);
}
.actionBtn.like.on .actionIcon,
.actionBtn.like.on .actionLabel { color: rgba(229, 72, 77, 0.92); }
.actionBtn.save.on .actionIcon,
.actionBtn.save.on .actionLabel { color: rgba(46, 99, 255, 0.92); }
.t-dark .actionIcon { color: rgba(245, 247, 255, 0.38); }
.t-dark .actionLabel { color: rgba(245, 247, 255, 0.42); }
.t-dark .actionBtn.like.on .actionIcon,
.t-dark .actionBtn.like.on .actionLabel { color: rgba(255, 122, 122, 0.92); }
.t-dark .actionBtn.save.on .actionIcon,
.t-dark .actionBtn.save.on .actionLabel { color: rgba(170, 200, 255, 0.92); }
</style>
