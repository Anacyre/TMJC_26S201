<template>
  <view
    class="themeBtn"
    :class="[themeClass, { on: theme === 'dark', pressed }]"
    role="button"
    @touchstart="pressed = true"
    @touchend="pressed = false"
    @touchcancel="pressed = false"
    @tap="handleTap"
  >
    <view class="glyphWrap" :class="{ flip: animating }">
      <text class="glyph sun" :class="{ hide: theme === 'dark' }">☼</text>
      <text class="glyph moon" :class="{ hide: theme !== 'dark' }">☾</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useTheme } from '@/composables/useTheme'

const { theme, themeClass, toggleTheme } = useTheme()
const pressed = ref(false)
const animating = ref(false)

function handleTap() {
  animating.value = true
  toggleTheme()
  setTimeout(() => (animating.value = false), 320)
}
</script>

<style scoped>
.themeBtn {
  width: 62rpx;
  height: 46rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(255, 255, 255, 0.55);
  backdrop-filter: blur(14px);
  transition: background 220ms ease, border-color 220ms ease, transform 200ms ease;
  position: relative;
  overflow: hidden;
}

.t-dark.themeBtn {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
}

.themeBtn.pressed {
  transform: scale(0.94);
}

.glyphWrap {
  position: relative;
  width: 22rpx;
  height: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 320ms cubic-bezier(0.4, 0, 0.2, 1);
}

.glyphWrap.flip {
  transform: rotate(180deg);
}

.glyph {
  position: absolute;
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.72);
  transition: opacity 260ms ease, transform 320ms cubic-bezier(0.4, 0, 0.2, 1);
}

.t-dark .glyph {
  color: rgba(245, 247, 255, 0.78);
}

.glyph.hide {
  opacity: 0;
  transform: scale(0.6) rotate(-90deg);
}

.glyph.sun {
  font-weight: 500;
}

.glyph.moon {
  font-weight: 400;
}
</style>
