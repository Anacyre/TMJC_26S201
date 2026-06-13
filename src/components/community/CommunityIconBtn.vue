<template>
  <view
    class="iconBtn tap"
    :class="[variant, { active, wide }]"
    role="button"
    :aria-label="label"
    @tap="$emit('tap')"
  >
    <slot>
      <CommunityGlyph v-if="glyph" :name="glyph" :sm="smGlyph" />
    </slot>
    <text v-if="badge != null && badge !== ''" class="badge">{{ badge }}</text>
    <view v-if="dot" class="dot" />
  </view>
</template>

<script setup>
import CommunityGlyph from '@/components/community/CommunityGlyph.vue'

defineProps({
  glyph: { type: String, default: '' },
  label: { type: String, default: '' },
  badge: { type: [String, Number], default: null },
  dot: { type: Boolean, default: false },
  variant: { type: String, default: 'chrome' },
  active: { type: Boolean, default: false },
  wide: { type: Boolean, default: false },
  smGlyph: { type: Boolean, default: false },
})

defineEmits(['tap'])
</script>

<style scoped>
.iconBtn {
  position: relative;
  min-width: 68rpx;
  min-height: 68rpx;
  padding: 0 14rpx;
  border-radius: 20rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: transform 150ms ease, background 180ms ease, border-color 180ms ease;
}
.iconBtn.wide { flex: 1; min-width: 0; }
.iconBtn.chrome {
  background: rgba(255, 255, 255, 0.72);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
}
.t-dark .iconBtn.chrome {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}
.iconBtn.ghost {
  background: rgba(16, 24, 40, 0.04);
  border: 1rpx solid transparent;
}
.t-dark .iconBtn.ghost { background: rgba(255, 255, 255, 0.04); }
.iconBtn.active {
  background: rgba(46, 99, 255, 0.12);
  border-color: rgba(46, 99, 255, 0.22);
}
.iconBtn:active { transform: scale(0.96); }
.badge {
  position: absolute;
  top: -4rpx; right: -4rpx;
  min-width: 28rpx; height: 28rpx; padding: 0 6rpx;
  border-radius: 999rpx;
  background: rgba(46, 99, 255, 0.92);
  color: #fff;
  font-size: 16rpx; font-weight: 760;
  line-height: 28rpx; text-align: center;
}
.dot {
  position: absolute; top: 8rpx; right: 8rpx;
  width: 12rpx; height: 12rpx; border-radius: 50%;
  background: #ff4d4f;
  border: 2rpx solid rgba(255, 255, 255, 0.95);
}
.t-dark .dot { border-color: #1a1d21; }
</style>
