<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader />

    <TabPageContent tab-id="apps" chrome-only>
      <view class="appsList">
        <view class="appEntry" role="button" @tap="openFocus">
          <view class="appGlyph focusGlyph">
            <view class="ringO" />
            <view class="ringI" />
            <view class="needle" />
          </view>
          <view class="appBody">
            <text class="appTitle">Focus</text>
            <text class="appDesc">Pomodoro timer</text>
          </view>
          <view v-if="showFocusTime" class="appStat">
            <text class="appStatNum">{{ focusHoursLabel }}</text>
            <text class="appStatLabel">this week</text>
          </view>
          <text v-else class="appChev">&gt;</text>
        </view>

        <view class="appEntry" role="button" @tap="openCalculator">
          <view class="appGlyph calcGlyph">
            <view class="calcScreen" />
            <view class="calcRow"><view /><view /><view /></view>
            <view class="calcRow"><view /><view /><view /></view>
          </view>
          <view class="appBody">
            <text class="appTitle">Calculator</text>
          </view>
        </view>

        <view class="appEntry" role="button" @tap="openGraph">
          <view class="appGlyph graphGlyph">
            <view class="axisX" />
            <view class="axisY" />
            <view class="curve" />
          </view>
          <view class="appBody">
            <text class="appTitle">Graph</text>
            <text class="appDesc">Plot equations</text>
          </view>
        </view>
      </view>
    </TabPageContent>

    <BottomNav active="apps" />
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed } from 'vue'
import BottomNav from '@/components/BottomNav.vue'
import TabPageContent from '@/components/TabPageContent.vue'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import { useTheme } from '@/composables/useTheme'
import { useAppearancePrefs } from '@/composables/useAppearancePrefs'
import { useFocusStore } from '@/composables/useFocusStore'
import { navSibling } from '@/lib/navigation'

const { themeClass } = useTheme()
const { showFocusTime } = useAppearancePrefs()
const { weekMinutesLabel } = useFocusStore()
const focusHoursLabel = computed(() => weekMinutesLabel.value || '0m')

function openFocus() { navSibling('/pages/apps/focus') }
function openCalculator() { navSibling('/pages/apps/calculator') }
function openGraph() { navSibling('/pages/apps/graph') }
</script>

<style scoped>
.page { min-height: 100vh; height: 100vh; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.bg { position: absolute; inset: 0; background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.16), transparent 60%), linear-gradient(180deg, #f8faff, #f1f4fa); }
.t-dark .bg { background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%), linear-gradient(180deg, #111315, #0e1014); }

.appsList {
  position: relative;
  z-index: 1;
  padding: 6rpx 28rpx 0;
  display: flex;
  flex-direction: column;
  gap: 14rpx;
}

.appEntry {
  display: flex;
  align-items: center;
  gap: 14rpx;
  padding: 20rpx 18rpx;
  border-radius: 28rpx;
  background: linear-gradient(135deg, rgba(80, 140, 255, 0.10), rgba(46, 99, 255, 0.04));
  border: 1rpx solid rgba(46, 99, 255, 0.16);
  transition: transform 180ms ease, background 220ms ease;
}
.t-dark .appEntry {
  background: linear-gradient(135deg, rgba(80, 140, 255, 0.18), rgba(46, 99, 255, 0.08));
  border-color: rgba(120, 160, 255, 0.24);
}
.appEntry:active { transform: scale(0.99); }

.appGlyph {
  position: relative;
  width: 56rpx;
  height: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.focusGlyph .ringO { position: absolute; inset: 0; border-radius: 50%; border: 1.6rpx solid rgba(46, 99, 255, 0.72); }
.focusGlyph .ringI { position: absolute; inset: 16rpx; border-radius: 50%; border: 1.4rpx solid rgba(46, 99, 255, 0.5); }
.focusGlyph .needle { position: absolute; top: 50%; left: 50%; width: 20rpx; height: 2rpx; background: rgba(46, 99, 255, 0.95); border-radius: 999rpx; transform-origin: left center; transform: translate(0, -50%) rotate(-32deg); }
.t-dark .focusGlyph .ringO { border-color: rgba(170, 200, 255, 0.78); }
.t-dark .focusGlyph .ringI { border-color: rgba(170, 200, 255, 0.5); }
.t-dark .focusGlyph .needle { background: rgba(170, 200, 255, 0.95); }

.calcGlyph {
  flex-direction: column;
  gap: 4rpx;
  padding: 6rpx;
  border-radius: 14rpx;
  background: rgba(46, 99, 255, 0.08);
  border: 1rpx solid rgba(46, 99, 255, 0.18);
}
.t-dark .calcGlyph {
  background: rgba(120, 160, 255, 0.12);
  border-color: rgba(120, 160, 255, 0.22);
}
.calcScreen {
  width: 100%;
  height: 10rpx;
  border-radius: 4rpx;
  background: rgba(46, 99, 255, 0.35);
}
.t-dark .calcScreen { background: rgba(170, 200, 255, 0.4); }
.calcRow {
  width: 100%;
  display: flex;
  gap: 3rpx;
  justify-content: center;
}
.calcRow view {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background: rgba(46, 99, 255, 0.55);
}
.t-dark .calcRow view { background: rgba(170, 200, 255, 0.6); }

.graphGlyph { position: relative; }
.graphGlyph .axisX {
  position: absolute;
  left: 4rpx;
  right: 4rpx;
  bottom: 14rpx;
  height: 1.6rpx;
  background: rgba(46, 99, 255, 0.55);
  border-radius: 999rpx;
}
.graphGlyph .axisY {
  position: absolute;
  top: 4rpx;
  bottom: 4rpx;
  left: 14rpx;
  width: 1.6rpx;
  background: rgba(46, 99, 255, 0.55);
  border-radius: 999rpx;
}
.graphGlyph .curve {
  position: absolute;
  left: 10rpx;
  right: 8rpx;
  bottom: 14rpx;
  height: 28rpx;
  border-top: 2rpx solid rgba(46, 99, 255, 0.88);
  border-radius: 50% 50% 0 0;
  transform: scaleY(0.85);
}
.t-dark .graphGlyph .axisX,
.t-dark .graphGlyph .axisY { background: rgba(170, 200, 255, 0.6); }
.t-dark .graphGlyph .curve { border-top-color: rgba(170, 200, 255, 0.9); }

.appBody { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; }
.appTitle { font-size: 24rpx; font-weight: 740; color: rgba(16, 24, 40, 0.92); }
.t-dark .appTitle { color: #f5f7fa; }
.appDesc { font-size: 18rpx; color: rgba(16, 24, 40, 0.48); }
.t-dark .appDesc { color: rgba(245, 247, 255, 0.45); }

.appStat { display: flex; flex-direction: column; align-items: flex-end; gap: 2rpx; }
.appStatNum { font-size: 22rpx; font-weight: 740; color: rgba(46, 99, 255, 0.96); letter-spacing: -0.2rpx; }
.t-dark .appStatNum { color: rgba(170, 200, 255, 0.96); }
.appStatLabel { font-size: 17rpx; color: rgba(16, 24, 40, 0.48); }
.t-dark .appStatLabel { color: rgba(245, 247, 255, 0.45); }
.appChev { font-size: 24rpx; color: rgba(16, 24, 40, 0.28); font-weight: 300; flex-shrink: 0; }
.t-dark .appChev { color: rgba(245, 247, 255, 0.28); }
</style>
