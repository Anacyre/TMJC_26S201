<template>
  <view class="backWrap" :class="themeClass" role="button" @tap="go">
    <view class="hit">
      <text class="chev">&lt;</text>
    </view>
  </view>
</template>

<script setup>
import { useTheme } from '@/composables/useTheme'
import { navBack } from '@/lib/navigation'
import { writePageTransition } from '@/lib/pageTransitionStore'
import { isPageTransitionsEnabled } from '@/composables/useAppearancePrefs'

const { themeClass } = useTheme()

function go() {
  const pages = typeof getCurrentPages === 'function' ? getCurrentPages() : []
  if (pages.length > 1) {
    navBack(1)
  } else {
    if (isPageTransitionsEnabled()) {
      writePageTransition({ kind: 'tab', direction: 'neutral', to: 'home' })
    }
    uni.reLaunch({ url: '/pages/index/index', animationType: 'none', animationDuration: 0 })
  }
}
</script>

<style scoped>
.backWrap {
  width: 72rpx;
  height: 72rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(255, 255, 255, 0.55);
  transition: transform 140ms cubic-bezier(0.34, 1.2, 0.64, 1);
}
.t-dark .backWrap {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
}
.backWrap:active { transform: scale(0.9); }

.hit {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chev {
  font-size: 36rpx;
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
