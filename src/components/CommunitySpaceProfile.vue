<template>
  <view class="profileCard" :class="{ compact, tap: tappable }" :role="tappable ? 'button' : undefined" @tap="onTap">
    <view class="profileHead">
      <view class="profileIcon">{{ icon || '◉' }}</view>
      <view class="profileMain">
        <text class="profileName">{{ name }}</text>
        <text class="profileDesc">{{ desc || 'No description yet.' }}</text>
      </view>
      <text
        v-if="showInfoLink"
        class="profileLink tap"
        role="button"
        @tap.stop="$emit('info')"
      >Info</text>
    </view>

    <view v-if="showStats && hasStats" class="statRow">
      <view v-if="postCount != null" class="statPill">
        <text class="statNum">{{ postCount }}</text>
        <text class="statLabel">Posts</text>
      </view>
      <view v-if="memberCount != null" class="statPill">
        <text class="statNum">{{ memberCount }}</text>
        <text class="statLabel">Members</text>
      </view>
      <view v-if="commentCount != null" class="statPill">
        <text class="statNum">{{ commentCount }}</text>
        <text class="statLabel">Replies</text>
      </view>
    </view>

    <slot />
  </view>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  icon: { type: String, default: '◉' },
  name: { type: String, default: '' },
  desc: { type: String, default: '' },
  postCount: { type: [Number, String], default: null },
  memberCount: { type: [Number, String], default: null },
  commentCount: { type: [Number, String], default: null },
  showStats: { type: Boolean, default: true },
  showInfoLink: { type: Boolean, default: true },
  compact: { type: Boolean, default: false },
  tappable: { type: Boolean, default: false },
})

const emit = defineEmits(['info', 'tap'])

const hasStats = computed(() =>
  props.postCount != null || props.memberCount != null || props.commentCount != null
)

function onTap() {
  if (props.tappable) emit('tap')
}
</script>

<style scoped>
.profileCard {
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.78);
  border: 1rpx solid rgba(16, 24, 40, 0.05);
  padding: 20rpx 20rpx 16rpx;
}
.t-dark .profileCard {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.profileCard.compact { padding: 16rpx 18rpx 14rpx; }
.profileCard.tap:active { opacity: 0.88; }

.profileHead { display: flex; align-items: flex-start; gap: 16rpx; }
.profileIcon {
  width: 88rpx; height: 88rpx; border-radius: 24rpx; flex-shrink: 0;
  background: rgba(46, 99, 255, 0.12);
  display: flex; align-items: center; justify-content: center;
  color: rgba(46, 99, 255, 0.96); font-size: 38rpx; font-weight: 720;
}
.compact .profileIcon {
  width: 64rpx; height: 64rpx; border-radius: 20rpx; font-size: 28rpx;
}
.t-dark .profileIcon { background: rgba(120, 160, 255, 0.16); color: rgba(170, 200, 255, 0.96); }
.profileMain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; padding-top: 4rpx; }
.compact .profileMain { padding-top: 2rpx; gap: 4rpx; }
.profileName {
  font-size: 30rpx; font-weight: 780; color: rgba(16, 24, 40, 0.92); line-height: 1.25;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.compact .profileName { font-size: 26rpx; }
.t-dark .profileName { color: rgba(245, 247, 255, 0.92); }
.profileDesc {
  font-size: 22rpx; line-height: 1.45; color: rgba(16, 24, 40, 0.55);
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.compact .profileDesc { font-size: 20rpx; -webkit-line-clamp: 1; }
.t-dark .profileDesc { color: rgba(245, 247, 255, 0.48); }
.profileLink {
  font-size: 20rpx; font-weight: 700; color: rgba(46, 99, 255, 0.88);
  flex-shrink: 0; padding-top: 6rpx;
}
.t-dark .profileLink { color: rgba(170, 200, 255, 0.88); }

.statRow {
  margin-top: 18rpx; padding-top: 16rpx;
  border-top: 1rpx solid rgba(16, 24, 40, 0.06);
  display: flex; gap: 12rpx;
}
.compact .statRow { margin-top: 14rpx; padding-top: 12rpx; }
.t-dark .statRow { border-top-color: rgba(255, 255, 255, 0.06); }
.statPill {
  flex: 1; padding: 12rpx 14rpx; border-radius: 18rpx;
  background: rgba(46, 99, 255, 0.06); display: flex; flex-direction: column; gap: 2rpx;
}
.t-dark .statPill { background: rgba(120, 160, 255, 0.08); }
.statNum { font-size: 28rpx; font-weight: 780; color: rgba(46, 99, 255, 0.96); }
.compact .statNum { font-size: 24rpx; }
.t-dark .statNum { color: rgba(170, 200, 255, 0.96); }
.statLabel { font-size: 18rpx; font-weight: 660; color: rgba(16, 24, 40, 0.45); }
.t-dark .statLabel { color: rgba(245, 247, 255, 0.4); }
</style>
