<template>
  <view
    class="adminBtn"
    :class="[themeClass, { on: adminModeEnabled, pressed }]"
    role="switch"
    :aria-checked="adminModeEnabled"
    aria-label="Admin mode"
    @touchstart="pressed = true"
    @touchend="pressed = false"
    @touchcancel="pressed = false"
    @tap="handleTap"
  >
    <text class="glyph">A</text>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { useAdminMode } from '@/composables/useAdminMode'

const { themeClass } = useTheme()
const { adminModeEnabled, toggleAdminMode } = useAdminMode()
const pressed = ref(false)

function handleTap() {
  toggleAdminMode()
}
</script>

<style scoped>
.adminBtn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(255, 255, 255, 0.55);
  transition: transform 140ms cubic-bezier(0.34, 1.2, 0.64, 1), background 220ms ease, border-color 220ms ease;
}

.t-dark.adminBtn {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.1);
}

.adminBtn.on {
  background: rgba(46, 99, 255, 0.12);
  border-color: rgba(46, 99, 255, 0.22);
}

.t-dark.adminBtn.on {
  background: rgba(120, 160, 255, 0.16);
  border-color: rgba(120, 160, 255, 0.32);
}

.adminBtn.pressed {
  transform: scale(0.9);
}

.glyph {
  font-size: 22rpx;
  font-weight: 760;
  letter-spacing: 0.2rpx;
  color: rgba(16, 24, 40, 0.38);
  transition: color 220ms ease;
}

.adminBtn.on .glyph {
  color: rgba(46, 99, 255, 0.96);
}

.t-dark .glyph {
  color: rgba(245, 247, 255, 0.34);
}

.t-dark.adminBtn.on .glyph {
  color: rgba(170, 200, 255, 0.95);
}
</style>
