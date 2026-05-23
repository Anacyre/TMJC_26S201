<template>
  <view class="empty empty-enter" :class="themeClass">
    <view class="art" :class="'art-' + variant">
      <view class="halo" />
      <view class="shape" />
    </view>
    <text class="title">{{ title }}</text>
    <text v-if="subtitle" class="sub">{{ subtitle }}</text>
    <view v-if="actionLabel" class="cta" role="button" @tap="$emit('action')">
      <text class="ctaText">{{ actionLabel }}</text>
    </view>
  </view>
</template>

<script setup>
import { useTheme } from '@/composables/useTheme'

defineProps({
  title: { type: String, required: true },
  subtitle: { type: String, default: '' },
  actionLabel: { type: String, default: '' },
  /** posts | tasks | resources | notifications | focus | members | search | generic */
  variant: { type: String, default: 'generic' },
})

defineEmits(['action'])

const { themeClass } = useTheme()
</script>

<style scoped>
.empty {
  padding: 64rpx 28rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 14rpx;
}

.art {
  position: relative;
  width: 120rpx;
  height: 120rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4rpx;
}

.halo {
  position: absolute;
  inset: 14rpx;
  border-radius: 50%;
  background: radial-gradient(closest-side, rgba(46, 99, 255, 0.10), transparent 72%);
}
.t-dark .halo { background: radial-gradient(closest-side, rgba(120, 160, 255, 0.14), transparent 72%); }

.shape {
  position: relative;
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  border: 1.4rpx solid rgba(16, 24, 40, 0.32);
}
.t-dark .shape { border-color: rgba(245, 247, 255, 0.36); }

.art-posts .shape {
  border-radius: 14rpx;
  width: 70rpx;
  height: 50rpx;
}
.art-posts .shape::before,
.art-posts .shape::after {
  content: '';
  position: absolute;
  left: 14rpx;
  right: 14rpx;
  height: 1.4rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.32);
}
.art-posts .shape::before { top: 14rpx; }
.art-posts .shape::after { top: 26rpx; right: 24rpx; }
.t-dark .art-posts .shape::before,
.t-dark .art-posts .shape::after { background: rgba(245, 247, 255, 0.36); }

.art-tasks .shape {
  border-radius: 16rpx;
  width: 64rpx;
  height: 64rpx;
}
.art-tasks .shape::after {
  content: '';
  position: absolute;
  left: 18rpx;
  top: 28rpx;
  width: 14rpx;
  height: 1.6rpx;
  background: rgba(46, 99, 255, 0.62);
  border-radius: 999rpx;
  transform: rotate(45deg);
  transform-origin: left center;
  box-shadow: 12rpx -8rpx 0 0 rgba(46, 99, 255, 0.62);
}

.art-resources .shape {
  border-radius: 16rpx;
  width: 56rpx;
  height: 70rpx;
}
.art-resources .shape::before {
  content: '';
  position: absolute;
  top: -10rpx;
  left: -10rpx;
  width: 56rpx;
  height: 70rpx;
  border: 1.4rpx solid rgba(16, 24, 40, 0.22);
  border-radius: 14rpx;
}
.t-dark .art-resources .shape::before { border-color: rgba(245, 247, 255, 0.26); }

.art-notifications .shape {
  border-radius: 14rpx 14rpx 28rpx 28rpx;
  width: 60rpx;
  height: 64rpx;
  border-top-width: 2rpx;
}
.art-notifications .shape::after {
  content: '';
  position: absolute;
  bottom: -6rpx;
  left: 50%;
  width: 14rpx;
  height: 14rpx;
  margin-left: -7rpx;
  border-radius: 50%;
  background: rgba(46, 99, 255, 0.62);
}

.art-focus .shape {
  border-radius: 50%;
  width: 64rpx;
  height: 64rpx;
}
.art-focus .shape::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 18rpx;
  height: 1.6rpx;
  background: rgba(46, 99, 255, 0.92);
  border-radius: 999rpx;
  transform-origin: left center;
  transform: translate(0, -50%) rotate(-32deg);
}

.art-members .shape {
  border-radius: 50%;
  width: 32rpx;
  height: 32rpx;
}
.art-members .shape::before,
.art-members .shape::after {
  content: '';
  position: absolute;
  bottom: -18rpx;
  width: 50rpx;
  height: 28rpx;
  border-radius: 28rpx 28rpx 0 0;
  border: 1.4rpx solid rgba(16, 24, 40, 0.32);
  border-bottom: none;
}
.art-members .shape::before { left: -10rpx; }
.art-members .shape::after { display: none; }
.t-dark .art-members .shape::before { border-color: rgba(245, 247, 255, 0.36); }

.art-search .shape {
  border-radius: 50%;
  width: 50rpx;
  height: 50rpx;
}
.art-search .shape::after {
  content: '';
  position: absolute;
  right: -12rpx;
  bottom: -12rpx;
  width: 24rpx;
  height: 1.6rpx;
  background: rgba(16, 24, 40, 0.42);
  transform: rotate(45deg);
  border-radius: 999rpx;
}
.t-dark .art-search .shape::after { background: rgba(245, 247, 255, 0.46); }

.title {
  font-size: 26rpx;
  font-weight: 740;
  color: rgba(16, 24, 40, 0.78);
  letter-spacing: 0.2rpx;
}
.t-dark .title { color: rgba(245, 247, 255, 0.78); }

.sub {
  max-width: 480rpx;
  font-size: 21rpx;
  color: rgba(16, 24, 40, 0.48);
  line-height: 1.55;
}
.t-dark .sub { color: rgba(245, 247, 255, 0.46); }

.cta {
  margin-top: 14rpx;
  padding: 14rpx 22rpx;
  border-radius: 999rpx;
  background: rgba(46, 99, 255, 0.12);
  border: 1rpx solid rgba(46, 99, 255, 0.22);
  transition: transform var(--motion-base, 150ms) cubic-bezier(0.34, 1.2, 0.64, 1);
}
.cta:active { transform: scale(0.97); }
.ctaText {
  font-size: 21rpx;
  font-weight: 720;
  color: rgba(46, 99, 255, 0.96);
}
.t-dark .ctaText { color: rgba(170, 200, 255, 0.96); }
</style>
