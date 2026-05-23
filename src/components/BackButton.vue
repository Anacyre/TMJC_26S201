<template>
  <view class="backWrap" :class="themeClass" role="button" @tap="go">
    <view class="hit">
      <view class="chev">
        <view class="line a" />
        <view class="line b" />
      </view>
    </view>
  </view>
</template>

<script setup>
import { useTheme } from '@/composables/useTheme'

const { themeClass } = useTheme()

function go() {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (pages.length > 1) {
    uni.navigateBack({ delta: 1 })
  } else {
    uni.reLaunch({ url: '/pages/index/index' })
  }
}
</script>

<style scoped>
.backWrap {
  width: 86rpx;
  height: 62rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -16rpx;
  transition: transform 180ms ease;
}
.backWrap:active { transform: scale(0.92); }

.hit {
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chev {
  position: relative;
  width: 22rpx;
  height: 26rpx;
}
.line {
  position: absolute;
  left: 4rpx;
  width: 18rpx;
  height: 2.4rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.78);
  transition: background 220ms ease;
}
.line.a {
  top: 6rpx;
  transform: rotate(-42deg);
  transform-origin: left center;
}
.line.b {
  bottom: 6rpx;
  transform: rotate(42deg);
  transform-origin: left center;
}

.t-dark .line {
  background: rgba(245, 247, 255, 0.82);
}
</style>
