<template>
  <view v-if="open" class="backdrop" @tap="close" @contextmenu.prevent="close">
    <view
      class="menu"
      :class="themeClass"
      :style="menuStyle"
      @tap.stop
      @contextmenu.prevent
    >
      <view
        v-for="item in items"
        :key="item.id"
        class="item"
        :class="{ danger: item.danger }"
        role="button"
        @tap="pick(item)"
      >
        <view v-if="item.icon" class="icon" :class="'ic-' + item.icon" />
        <text class="label">{{ item.label }}</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({
  open: { type: Boolean, default: false },
  x: { type: Number, default: 0 },
  y: { type: Number, default: 0 },
  items: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:open', 'select'])

const { themeClass } = useTheme()

const menuStyle = computed(() => ({
  left: `${Math.max(12, props.x)}px`,
  top: `${Math.max(12, props.y)}px`,
}))

function close() {
  emit('update:open', false)
}

function pick(item) {
  emit('select', item)
  close()
}
</script>

<style scoped>
.backdrop {
  position: fixed;
  inset: 0;
  z-index: 900;
}
.menu {
  position: fixed;
  min-width: 180rpx;
  padding: 8rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.88);
  border: 1rpx solid rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(20px);
  box-shadow: 0 16rpx 48rpx rgba(12, 20, 40, 0.14);
  animation: menuIn 140ms cubic-bezier(0.34, 1.2, 0.64, 1) both;
}
.t-dark.menu {
  background: rgba(30, 33, 38, 0.92);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 20rpx 56rpx rgba(0, 0, 0, 0.45);
}
@keyframes menuIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
.item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 18rpx;
  border-radius: 12rpx;
  transition: background 120ms ease, transform 120ms cubic-bezier(0.34, 1.2, 0.64, 1);
}
.item:active { transform: scale(0.98); background: rgba(16, 24, 40, 0.05); }
.t-dark .item:active { background: rgba(255, 255, 255, 0.06); }
.item.danger .label { color: rgba(220, 60, 60, 0.92); }

.icon {
  width: 28rpx;
  height: 28rpx;
  position: relative;
  opacity: 0.72;
}
.ic-hide::before,
.ic-hide::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 18rpx;
  height: 1.6rpx;
  background: currentColor;
  border-radius: 999rpx;
  transform-origin: center;
}
.ic-hide::before { transform: translate(-50%, -50%) rotate(0deg); }
.ic-hide::after { transform: translate(-50%, -50%) rotate(90deg); opacity: 0; }

.ic-trash {
  border: 1.6rpx solid currentColor;
  border-top: none;
  border-radius: 0 0 6rpx 6rpx;
  margin-top: 8rpx;
}
.ic-trash::before {
  content: '';
  position: absolute;
  top: -6rpx;
  left: -4rpx;
  right: -4rpx;
  height: 1.6rpx;
  background: currentColor;
  border-radius: 999rpx;
}

.ic-archive {
  border: 1.6rpx solid currentColor;
  border-radius: 4rpx;
  height: 20rpx;
  margin-top: 4rpx;
}
.ic-archive::before {
  content: '';
  position: absolute;
  top: -5rpx;
  left: 2rpx;
  right: 2rpx;
  height: 6rpx;
  border: 1.6rpx solid currentColor;
  border-bottom: none;
  border-radius: 4rpx 4rpx 0 0;
}

.label {
  font-size: 26rpx;
  font-weight: 620;
  color: rgba(16, 24, 40, 0.88);
}
.t-dark .label { color: rgba(245, 247, 255, 0.88); }
</style>
