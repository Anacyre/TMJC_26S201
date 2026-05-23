<template>
  <view class="backWrap" :class="themeClass" role="button" @tap="go">
    <view class="hit">
      <view class="chev">
        <view class="stem" />
        <view class="arm" />
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
  width: 96rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-left: -20rpx;
  transition: transform 150ms cubic-bezier(0.34, 1.2, 0.64, 1);
}
.backWrap:active { transform: scale(0.96); }

.hit {
  width: 72rpx;
  height: 72rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chev {
  position: relative;
  width: 16rpx;
  height: 24rpx;
}

.stem {
  position: absolute;
  left: 0;
  top: 50%;
  width: 10rpx;
  height: 1.8rpx;
  margin-top: -0.9rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.72);
  transition: background 150ms ease;
}

.arm {
  position: absolute;
  left: 0;
  top: 50%;
  width: 9rpx;
  height: 9rpx;
  margin-top: -4.5rpx;
  border-left: 1.8rpx solid rgba(16, 24, 40, 0.72);
  border-bottom: 1.8rpx solid rgba(16, 24, 40, 0.72);
  transform: rotate(45deg);
  transform-origin: center center;
  border-radius: 1rpx;
  transition: border-color 150ms ease;
}

.t-dark .stem { background: rgba(245, 247, 255, 0.78); }
.t-dark .arm {
  border-left-color: rgba(245, 247, 255, 0.78);
  border-bottom-color: rgba(245, 247, 255, 0.78);
}
</style>
