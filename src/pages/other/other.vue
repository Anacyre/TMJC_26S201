<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader />

    <TabPageContent tab-id="other" chrome-only>
    <view class="safe">
      <view class="grid">
        <view
          v-for="x in entries"
          :key="x.key"
          class="tile"
          :class="'g-' + x.key"
          role="button"
          @tap="openEntry(x)"
        >
          <view class="tileGlyph">
            <component :is="x.glyph" />
          </view>
          <text class="tileName">{{ x.title }}</text>
        </view>
      </view>
    </view>
    </TabPageContent>

    <BottomNav active="other" />
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { h, ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import BottomNav from '@/components/BottomNav.vue'
import TabPageContent from '@/components/TabPageContent.vue'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import { useTheme } from '@/composables/useTheme'
import { toast } from '@/composables/useToast'
import { navSibling } from '@/lib/navigation'

const { themeClass } = useTheme()

const glyphs = {
  saved: () => h('view', { class: 'gWrap' }, [
    h('view', { class: 'gBookmark' }),
  ]),
  hidden: () => h('view', { class: 'gWrap' }, [
    h('view', { class: 'gEye' }, [h('view', { class: 'gEyeSlash' })]),
  ]),
  calendar: () => h('view', { class: 'gWrap' }, [
    h('view', { class: 'gCal' }, [h('view', { class: 'gCalDot' }), h('view', { class: 'gCalDot' }), h('view', { class: 'gCalDot' }), h('view', { class: 'gCalDot' })]),
  ]),
  appearance: () => h('view', { class: 'gWrap' }, [
    h('view', { class: 'gMoon' }),
  ]),
  memories: () => h('view', { class: 'gWrap' }, [
    h('view', { class: 'gClock' }, [h('view', { class: 'gClockH' }), h('view', { class: 'gClockM' })]),
  ]),
  about: () => h('view', { class: 'gWrap' }, [
    h('view', { class: 'gInfo' }, [h('view', { class: 'gInfoDot' }), h('view', { class: 'gInfoBar' })]),
  ]),
}

const entries = ref([
  { key: 'saved', title: 'Saved', glyph: glyphs.saved },
  { key: 'hidden', title: 'Hidden', glyph: glyphs.hidden },
  { key: 'calendar', title: 'Calendar', glyph: glyphs.calendar },
  { key: 'appearance', title: 'Appearance', glyph: glyphs.appearance },
  { key: 'memories', title: 'Memories', glyph: glyphs.memories },
  { key: 'about', title: 'About', glyph: glyphs.about },
])

function openEntry(x) {
  if (x.key === 'memories') return navSibling('/pages/other/events-memories')
  if (x.key === 'hidden') return navSibling('/pages/notifications/hidden')
  toast.show(`${x.title}`)
}

onLoad(() => {})
onShow(() => {})
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.bg { position: absolute; inset: 0; z-index: 0;
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.18), transparent 60%),
    radial-gradient(900rpx 700rpx at 70% 30%, rgba(120, 180, 255, 0.14), transparent 65%),
    linear-gradient(180deg, rgba(248, 250, 255, 1), rgba(241, 244, 250, 1));
}
.t-dark .bg {
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%),
    radial-gradient(900rpx 700rpx at 70% 30%, rgba(100, 160, 255, 0.08), transparent 62%),
    linear-gradient(180deg, #111315, #0e1014);
}

.safe { position: relative; z-index: 1; padding: 10rpx 28rpx 200rpx; }

.hero { display: flex; flex-direction: column; gap: 8rpx; padding: 16rpx 4rpx 22rpx; }
.kicker { font-size: 18rpx; font-weight: 720; color: rgba(46, 99, 255, 0.78); letter-spacing: 1rpx; text-transform: uppercase; }
.t-dark .kicker { color: rgba(170, 200, 255, 0.85); }
.title { font-size: 32rpx; font-weight: 720; color: rgba(16, 24, 40, 0.9); letter-spacing: -0.4rpx; max-width: 600rpx; line-height: 1.35; }
.t-dark .title { color: rgba(245, 247, 255, 0.9); }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--list-stack-gap); padding-top: 8rpx; }
.tile {
  padding: var(--list-card-pad-y) var(--list-card-pad-x);
  border-radius: var(--list-card-radius);
  background: rgba(255, 255, 255, 0.7);
  border: 1rpx solid rgba(16, 24, 40, 0.04);
  display: flex; flex-direction: column; gap: 4rpx;
  transition: transform 180ms ease, background 220ms ease, border-color 220ms ease;
}
.t-dark .tile { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.tile:active { transform: scale(0.985); }
.tileGlyph { width: var(--list-icon-size); height: var(--list-icon-size); border-radius: var(--list-icon-radius); background: rgba(46, 99, 255, 0.08); display: flex; align-items: center; justify-content: center; margin-bottom: 10rpx; }
.t-dark .tileGlyph { background: rgba(120, 160, 255, 0.14); }
.tileName { font-size: var(--list-title-size); font-weight: 720; color: rgba(16, 24, 40, 0.9); }
.t-dark .tileName { color: rgba(245, 247, 255, 0.92); }

.gWrap { position: relative; width: 32rpx; height: 32rpx; display: flex; align-items: center; justify-content: center; }
.gBookmark { width: 16rpx; height: 22rpx; background: rgba(46, 99, 255, 0.92); clip-path: polygon(0 0, 100% 0, 100% 100%, 50% 78%, 0 100%); }
.t-dark .gBookmark { background: rgba(170, 200, 255, 0.95); }
.gEye { width: 26rpx; height: 16rpx; border: 1.6rpx solid rgba(46, 99, 255, 0.92); border-radius: 14rpx / 10rpx; position: relative; }
.t-dark .gEye { border-color: rgba(170, 200, 255, 0.95); }
.gEyeSlash { position: absolute; top: -4rpx; left: -2rpx; right: -2rpx; height: 1.6rpx; background: rgba(46, 99, 255, 0.92); transform: rotate(-22deg); border-radius: 999rpx; }
.t-dark .gEyeSlash { background: rgba(170, 200, 255, 0.95); }
.gCal { width: 26rpx; height: 26rpx; border: 1.6rpx solid rgba(46, 99, 255, 0.92); border-radius: 6rpx; display: grid; grid-template-columns: 1fr 1fr; gap: 2rpx; padding: 3rpx; }
.t-dark .gCal { border-color: rgba(170, 200, 255, 0.95); }
.gCalDot { background: rgba(46, 99, 255, 0.72); border-radius: 2rpx; }
.t-dark .gCalDot { background: rgba(170, 200, 255, 0.85); }
.gMoon { width: 22rpx; height: 22rpx; border-radius: 50%; background: transparent; box-shadow: inset 6rpx -3rpx 0 0 rgba(46, 99, 255, 0.92); }
.t-dark .gMoon { box-shadow: inset 6rpx -3rpx 0 0 rgba(170, 200, 255, 0.95); }
.gClock { width: 26rpx; height: 26rpx; border-radius: 50%; border: 1.6rpx solid rgba(46, 99, 255, 0.92); position: relative; }
.t-dark .gClock { border-color: rgba(170, 200, 255, 0.95); }
.gClockH, .gClockM { position: absolute; top: 50%; left: 50%; background: rgba(46, 99, 255, 0.92); border-radius: 999rpx; transform-origin: left center; }
.t-dark .gClockH, .t-dark .gClockM { background: rgba(170, 200, 255, 0.95); }
.gClockH { width: 8rpx; height: 1.8rpx; transform: translate(0, -50%) rotate(-90deg); }
.gClockM { width: 10rpx; height: 1.8rpx; transform: translate(0, -50%) rotate(30deg); }
.gInfo { width: 22rpx; height: 26rpx; display: flex; flex-direction: column; align-items: center; gap: 3rpx; }
.gInfoDot { width: 4rpx; height: 4rpx; border-radius: 50%; background: rgba(46, 99, 255, 0.92); }
.gInfoBar { width: 4rpx; height: 14rpx; border-radius: 2rpx; background: rgba(46, 99, 255, 0.92); }
.t-dark .gInfoDot, .t-dark .gInfoBar { background: rgba(170, 200, 255, 0.95); }
</style>
