<template>
  <view class="ambient" :class="'tier-' + tier" aria-hidden="true" />
</template>

<script setup>
import { useFocusTheme } from '@/composables/useFocusTheme'

const { tier } = useFocusTheme()
</script>

<style scoped>
.ambient {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  opacity: 1;
  transition: opacity 600ms ease;
  background:
    radial-gradient(
      1200rpx 800rpx at 50% -10%,
      hsla(var(--focus-hue), 60%, 62%, calc(0.06 + var(--focus-glow))),
      transparent 65%
    ),
    radial-gradient(
      900rpx 600rpx at 80% 90%,
      hsla(calc(var(--focus-hue) + 20), 50%, 58%, calc(0.03 + var(--focus-depth))),
      transparent 60%
    );
}
html[data-theme='dark'] .ambient {
  background:
    radial-gradient(
      1200rpx 800rpx at 50% -10%,
      hsla(var(--focus-hue), 55%, 48%, calc(0.08 + var(--focus-glow))),
      transparent 65%
    ),
    radial-gradient(
      900rpx 600rpx at 80% 90%,
      hsla(calc(var(--focus-hue) + 15), 45%, 42%, calc(0.05 + var(--focus-depth))),
      transparent 60%
    );
}
</style>
