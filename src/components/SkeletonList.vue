<template>
  <view class="skel" :class="themeClass">
    <!-- Tasks -->
    <template v-if="variant === 'tasks'">
      <view v-for="i in count" :key="i" class="row tasks">
        <SkeletonBlock width="44rpx" height="44rpx" radius="14rpx" />
        <view class="col">
          <SkeletonBlock width="72%" height="28rpx" />
          <SkeletonBlock width="48%" height="22rpx" />
        </view>
      </view>
    </template>

    <!-- Feed / posts -->
    <template v-else-if="variant === 'feed'">
      <view v-for="i in count" :key="i" class="card feed">
        <view class="feedHead">
          <SkeletonBlock width="56rpx" height="56rpx" circle />
          <view class="col">
            <SkeletonBlock width="40%" height="24rpx" />
            <SkeletonBlock width="28%" height="20rpx" />
          </view>
        </view>
        <SkeletonBlock width="100%" height="28rpx" />
        <SkeletonBlock width="88%" height="28rpx" />
        <SkeletonBlock width="60%" height="22rpx" />
      </view>
    </template>

    <!-- Cards (notices, communities) -->
    <template v-else-if="variant === 'cards'">
      <view v-for="i in count" :key="i" class="card cards">
        <SkeletonBlock width="52rpx" height="52rpx" radius="16rpx" />
        <view class="col">
          <SkeletonBlock width="65%" height="28rpx" />
          <SkeletonBlock width="45%" height="22rpx" />
        </view>
      </view>
    </template>

    <!-- Members grid -->
    <template v-else-if="variant === 'members'">
      <view class="grid">
        <view v-for="i in count" :key="i" class="member">
          <SkeletonBlock width="72rpx" height="72rpx" circle />
          <SkeletonBlock width="80%" height="24rpx" />
          <SkeletonBlock width="60%" height="20rpx" />
        </view>
      </view>
    </template>

    <!-- Resources -->
    <template v-else-if="variant === 'resources'">
      <view class="grid res">
        <view v-for="i in count" :key="i" class="resCard">
          <SkeletonBlock width="48rpx" height="48rpx" radius="14rpx" />
          <SkeletonBlock width="70%" height="24rpx" />
          <SkeletonBlock width="50%" height="20rpx" />
        </view>
      </view>
    </template>

    <!-- Analytics (profile) -->
    <template v-else-if="variant === 'analytics'">
      <view class="analytics">
        <SkeletonBlock width="100%" height="180rpx" radius="20rpx" />
        <view class="barRow">
          <SkeletonBlock v-for="i in 7" :key="i" width="10%" height="80rpx" radius="8rpx" />
        </view>
        <SkeletonBlock width="100%" height="120rpx" radius="18rpx" />
      </view>
    </template>

    <!-- Notifications list -->
    <template v-else-if="variant === 'notifications'">
      <view v-for="i in count" :key="i" class="row notif">
        <SkeletonBlock width="12rpx" height="12rpx" circle />
        <view class="col">
          <SkeletonBlock width="80%" height="28rpx" />
          <SkeletonBlock width="55%" height="22rpx" />
        </view>
      </view>
    </template>

    <!-- Generic -->
    <template v-else>
      <view v-for="i in count" :key="i" class="row generic">
        <SkeletonBlock width="100%" height="32rpx" />
      </view>
    </template>
  </view>
</template>

<script setup>
import SkeletonBlock from '@/components/SkeletonBlock.vue'
import { useTheme } from '@/composables/useTheme'

defineProps({
  /** tasks | feed | cards | members | resources | analytics | notifications | generic */
  variant: { type: String, default: 'generic' },
  count: { type: Number, default: 3 },
})

const { themeClass } = useTheme()
</script>

<style scoped>
.skel {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  padding: 8rpx 0;
}

.row {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 18rpx 0;
}
.row.tasks { padding: 20rpx 0; }

.col {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10rpx;
}

.card {
  padding: 20rpx 0;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}
.card.cards {
  flex-direction: row;
  align-items: center;
  gap: 16rpx;
}

.feedHead {
  display: flex;
  align-items: center;
  gap: 14rpx;
  margin-bottom: 4rpx;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}
.member {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10rpx;
  padding: 24rpx 12rpx;
}

.grid.res {
  grid-template-columns: repeat(2, 1fr);
}
.resCard {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding: 20rpx;
}

.analytics {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}
.barRow {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8rpx;
  height: 100rpx;
}

.row.notif {
  padding: 16rpx 0;
  border-bottom: 1rpx solid var(--divider);
}
</style>
