<template>
  <view class="backWrap" :class="themeClass" role="button" @tap="go">
    <view class="hit">
      <text class="chev">&lt;</text>
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
  width: 104rpx;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  margin-left: -24rpx;
  transition: transform 150ms cubic-bezier(0.34, 1.2, 0.64, 1);
}
.backWrap:active { transform: scale(0.96); }

.hit {
  width: 76rpx;
  height: 76rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chev {
  font-size: 34rpx;
  font-weight: 320;
  line-height: 1;
  color: rgba(16, 24, 40, 0.76);
  transform: translateX(-1rpx);
  letter-spacing: -2rpx;
}
.t-dark .chev {
  color: rgba(245, 247, 255, 0.78);
}
</style>
