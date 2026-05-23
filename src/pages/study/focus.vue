<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader title="Focus" nav-mode="back" :show-avatar="false" />

    <scroll-view class="scroll" scroll-y :show-scrollbar="false" :enhanced="true">
      <view class="safe">

        <view class="hero">
          <text class="kicker">Focus space</text>
          <text class="hint">{{ statusLabel }}</text>

          <view class="ringStack">
            <view class="ringBg" />
            <view
              class="ringFill"
              :style="ringStyle"
            />
            <view class="centerCol">
              <text class="timer">{{ timerDisplay }}</text>
              <text class="kickerMuted">{{ phaseLabel }}</text>
            </view>
          </view>

          <view class="durationRow">
            <view
              v-for="d in durations"
              :key="d"
              class="chip"
              :class="{ on: !running && selectedMinutes === d }"
              role="button"
              @tap="selectDuration(d)"
            >
              <text class="chipText">{{ d }}m</text>
            </view>
            <view class="chip" :class="{ on: customOpen }" role="button" @tap="openCustom">
              <text class="chipText">Custom</text>
            </view>
          </view>

          <view class="controls">
            <view class="ctlGhost" role="button" @tap="reset"><text class="ctlGhostText">Reset</text></view>
            <view class="ctlPrimary" :class="{ pause: running }" role="button" @tap="togglePlay">
              <view class="ctlGlyph">
                <view v-if="!running" class="triangle" />
                <view v-else class="pauseGlyph"><view /><view /></view>
              </view>
              <text class="ctlPrimaryText">{{ running ? 'Pause' : (remaining < totalSeconds ? 'Resume' : 'Start') }}</text>
            </view>
          </view>
        </view>

        <view class="section">
          <view class="sectionHead">
            <text class="sectionTitle">White noise</text>
            <text class="sectionSub">A calm sound layer.</text>
          </view>
          <view class="noiseRow">
            <view
              v-for="n in noises"
              :key="n.id"
              class="noise"
              :class="{ on: prefs.soundId === n.id }"
              role="button"
              @tap="pickNoise(n.id)"
            >
              <view class="noiseGlyph" :class="'g-' + n.id"><view class="dot" /></view>
              <text class="noiseText">{{ n.name }}</text>
            </view>
          </view>
        </view>

        <view class="section">
          <view class="sectionHead">
            <text class="sectionTitle">This week</text>
            <text class="sectionSub">Minutes focused per day.</text>
          </view>
          <view class="card pad">
            <view class="weekRow">
              <view v-for="d in weekTotals" :key="d.key" class="bar">
                <view class="barTrack">
                  <view class="barFill" :style="{ height: barHeight(d.minutes) + '%' }" />
                </view>
                <text class="barLabel">{{ d.label.slice(0, 1) }}</text>
              </view>
            </view>
            <view class="weekStats">
              <view class="statBlock">
                <text class="statNum">{{ totalHoursLabel }}</text>
                <text class="statLabel">All time</text>
              </view>
              <view class="statBlock">
                <text class="statNum">{{ weekMinutesLabel }}</text>
                <text class="statLabel">This week</text>
              </view>
              <view class="statBlock">
                <text class="statNum">{{ avgSessionLabel }}</text>
                <text class="statLabel">Avg session</text>
              </view>
            </view>
          </view>
        </view>

        <view class="section">
          <view class="sectionHead">
            <text class="sectionTitle">Visibility</text>
            <text class="sectionSub">Show focus hours on your profile card.</text>
          </view>
          <view class="visRow">
            <view
              class="visChip"
              :class="{ on: prefs.visibility === 'public' }"
              role="button"
              @tap="setVisibility('public')"
            ><text class="visText">Public</text></view>
            <view
              class="visChip"
              :class="{ on: prefs.visibility === 'private' }"
              role="button"
              @tap="setVisibility('private')"
            ><text class="visText">Private</text></view>
          </view>
        </view>

        <view class="spacer" />
      </view>
    </scroll-view>

    <view class="overlay" :class="{ show: customOpen }" @tap="customOpen = false">
      <view class="sheet" @tap.stop>
        <text class="sheetTitle">Custom duration</text>
        <text class="sheetSub">Choose how long you want to focus.</text>
        <view class="customRow">
          <view class="adjust" role="button" @tap="adjustCustom(-5)"><text class="adjustText">−</text></view>
          <view class="customNumWrap">
            <text class="customNum">{{ customMinutes }}</text>
            <text class="customUnit">min</text>
          </view>
          <view class="adjust" role="button" @tap="adjustCustom(5)"><text class="adjustText">＋</text></view>
        </view>
        <view class="commit" role="button" @tap="commitCustom">
          <text class="commitText">Set duration</text>
        </view>
      </view>
    </view>

    <BottomNav active="study" />
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { onHide } from '@dcloudio/uni-app'
import AppHeader from '@/components/AppHeader.vue'
import BottomNav from '@/components/BottomNav.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import { useTheme } from '@/composables/useTheme'
import { useFocusStore, WHITE_NOISE_OPTIONS } from '@/composables/useFocusStore'

const { themeClass } = useTheme()
const {
  prefs,
  weekTotals,
  totalHoursLabel,
  recordSession,
  setVisibility,
  setSound,
  setDefaultMinutes,
  sessions,
} = useFocusStore()

const durations = [25, 50, 90]
const noises = WHITE_NOISE_OPTIONS

const selectedMinutes = ref(prefs.value.defaultMinutes || 25)
const totalSeconds = computed(() => selectedMinutes.value * 60)
const remaining = ref(totalSeconds.value)
const running = ref(false)
const tickRef = ref(null)
const customOpen = ref(false)
const customMinutes = ref(selectedMinutes.value)

const timerDisplay = computed(() => {
  const total = Math.max(0, remaining.value)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const phaseLabel = computed(() => {
  if (running.value) return 'In session'
  if (remaining.value < totalSeconds.value && remaining.value > 0) return 'Paused'
  if (remaining.value === 0) return 'Complete'
  return `${selectedMinutes.value} min set`
})

const statusLabel = computed(() => {
  if (running.value) return 'Stay with it — breathe, look at the work, and continue.'
  if (remaining.value === 0) return 'Nice work. Take a few slow breaths.'
  return 'Pick a duration, then start when you’re ready.'
})

const ringStyle = computed(() => {
  const pct = totalSeconds.value === 0 ? 0 : 1 - remaining.value / totalSeconds.value
  const deg = pct * 360
  return {
    background: `conic-gradient(rgba(46,99,255,0.92) ${deg}deg, transparent ${deg}deg)`,
  }
})

const weekMinutesLabel = computed(() => {
  const mins = weekTotals.value.reduce((acc, d) => acc + d.minutes, 0)
  return mins >= 60 ? `${(mins / 60).toFixed(1)}h` : `${mins}m`
})

const avgSessionLabel = computed(() => {
  const list = sessions.value
  if (!list.length) return '—'
  const total = list.reduce((acc, s) => acc + (s.minutes || 0), 0)
  return `${Math.round(total / list.length)}m`
})

function barHeight(minutes) {
  const max = Math.max(60, ...weekTotals.value.map((d) => d.minutes))
  if (!max) return 6
  return Math.max(6, Math.min(100, Math.round((minutes / max) * 100)))
}

function selectDuration(d) {
  if (running.value) return
  selectedMinutes.value = d
  remaining.value = d * 60
  setDefaultMinutes(d)
}

function openCustom() {
  customMinutes.value = selectedMinutes.value
  customOpen.value = true
}

function adjustCustom(delta) {
  customMinutes.value = Math.max(5, Math.min(240, customMinutes.value + delta))
}

function commitCustom() {
  if (running.value) {
    customOpen.value = false
    return
  }
  selectedMinutes.value = customMinutes.value
  remaining.value = customMinutes.value * 60
  setDefaultMinutes(customMinutes.value)
  customOpen.value = false
}

function tick() {
  if (!running.value) return
  remaining.value = Math.max(0, remaining.value - 1)
  if (remaining.value === 0) {
    completeSession()
  }
}

function togglePlay() {
  if (running.value) {
    pause()
  } else {
    start()
  }
}

function start() {
  if (remaining.value <= 0) {
    remaining.value = totalSeconds.value
  }
  running.value = true
  if (tickRef.value) clearInterval(tickRef.value)
  tickRef.value = setInterval(tick, 1000)
}

function pause() {
  running.value = false
  if (tickRef.value) {
    clearInterval(tickRef.value)
    tickRef.value = null
  }
}

function reset() {
  pause()
  remaining.value = totalSeconds.value
}

function completeSession() {
  pause()
  const minutes = selectedMinutes.value
  recordSession({
    minutes,
    subject: 'Focus',
    soundId: prefs.value.soundId,
  })
  uni.showToast({ title: `Focused ${minutes} min`, icon: 'none' })
  remaining.value = totalSeconds.value
}

function pickNoise(id) {
  setSound(id)
}

onHide(() => pause())
onBeforeUnmount(() => pause())
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; }
.bg {
  position: absolute; inset: 0; z-index: 0;
  background: radial-gradient(1000rpx 700rpx at 50% -10%, rgba(40, 110, 255, 0.16), transparent 60%),
    radial-gradient(800rpx 600rpx at 80% 40%, rgba(120, 180, 255, 0.10), transparent 65%),
    linear-gradient(180deg, rgba(248, 250, 255, 1), rgba(241, 244, 250, 1));
}
.t-dark .bg {
  background: radial-gradient(1000rpx 700rpx at 50% -10%, rgba(60, 120, 255, 0.16), transparent 60%),
    radial-gradient(800rpx 600rpx at 80% 40%, rgba(100, 160, 255, 0.08), transparent 65%),
    linear-gradient(180deg, #111315, #0e1014);
}
.scroll { position: relative; z-index: 1; height: calc(100vh - 110rpx); }
.safe { padding: 4rpx 28rpx 200rpx; display: flex; flex-direction: column; gap: 26rpx; }

.hero {
  padding: 36rpx 26rpx 30rpx;
  border-radius: 36rpx;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 26rpx 80rpx rgba(12, 20, 40, 0.10);
  backdrop-filter: blur(14px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 22rpx;
}
.t-dark .hero {
  background: rgba(26, 29, 33, 0.65);
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 30rpx 100rpx rgba(0, 0, 0, 0.4);
}

.kicker { font-size: 20rpx; color: rgba(46, 99, 255, 0.92); font-weight: 720; letter-spacing: 1rpx; text-transform: uppercase; }
.t-dark .kicker { color: rgba(170, 200, 255, 0.92); }
.kickerMuted { font-size: 18rpx; color: rgba(16, 24, 40, 0.42); margin-top: 6rpx; letter-spacing: 0.6rpx; text-transform: uppercase; }
.t-dark .kickerMuted { color: rgba(245, 247, 255, 0.42); }
.hint { font-size: 20rpx; color: rgba(16, 24, 40, 0.5); text-align: center; max-width: 460rpx; line-height: 1.5; }
.t-dark .hint { color: rgba(245, 247, 255, 0.5); }

.ringStack {
  position: relative;
  width: 420rpx;
  height: 420rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.ringBg, .ringFill {
  position: absolute;
  inset: 0;
  border-radius: 50%;
}
.ringBg {
  background: conic-gradient(rgba(16, 24, 40, 0.08) 0deg, rgba(16, 24, 40, 0.08) 360deg);
}
.t-dark .ringBg {
  background: conic-gradient(rgba(245, 247, 255, 0.08) 0deg, rgba(245, 247, 255, 0.08) 360deg);
}
.ringFill {
  transition: background 800ms linear;
  mask: radial-gradient(closest-side, transparent calc(50% - 16rpx), #000 calc(50% - 16rpx));
  -webkit-mask: radial-gradient(closest-side, transparent calc(50% - 16rpx), #000 calc(50% - 16rpx));
}
.centerCol {
  position: relative;
  z-index: 2;
  width: 320rpx;
  height: 320rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.94);
  border: 1rpx solid rgba(255, 255, 255, 0.7);
  box-shadow: inset 0 0 0 1rpx rgba(46, 99, 255, 0.04);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.t-dark .centerCol {
  background: #1a1d21;
  border-color: rgba(255, 255, 255, 0.06);
}
.timer {
  font-size: 86rpx;
  font-weight: 220;
  letter-spacing: -2rpx;
  color: rgba(16, 24, 40, 0.92);
  font-feature-settings: 'tnum';
}
.t-dark .timer { color: rgba(245, 247, 255, 0.92); }

.durationRow { display: flex; gap: 8rpx; flex-wrap: wrap; justify-content: center; }
.chip {
  padding: 10rpx 18rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.5);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  transition: background 220ms ease, border-color 220ms ease, transform 180ms ease;
}
.t-dark .chip {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.chip.on {
  background: rgba(46, 99, 255, 0.14);
  border-color: rgba(46, 99, 255, 0.24);
}
.chip:active { transform: scale(0.97); }
.chipText { font-size: 22rpx; font-weight: 660; color: rgba(16, 24, 40, 0.72); }
.t-dark .chipText { color: rgba(245, 247, 255, 0.72); }
.chip.on .chipText { color: rgba(46, 99, 255, 0.96); font-weight: 740; }
.t-dark .chip.on .chipText { color: rgba(170, 200, 255, 0.96); }

.controls { display: flex; gap: 14rpx; width: 100%; }
.ctlGhost {
  width: 110rpx;
  height: 96rpx;
  border-radius: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 24, 40, 0.05);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
}
.t-dark .ctlGhost {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}
.ctlGhost:active { transform: scale(0.97); }
.ctlGhostText { font-size: 21rpx; color: rgba(16, 24, 40, 0.7); font-weight: 660; }
.t-dark .ctlGhostText { color: rgba(245, 247, 255, 0.72); }

.ctlPrimary {
  flex: 1;
  height: 96rpx;
  border-radius: 26rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14rpx;
  background: linear-gradient(180deg, #4f86ff, #2e63ff);
  box-shadow: 0 22rpx 56rpx rgba(46, 99, 255, 0.30);
  transition: transform 180ms ease, box-shadow 180ms ease;
}
.ctlPrimary:active { transform: scale(0.985); box-shadow: 0 14rpx 38rpx rgba(46, 99, 255, 0.24); }
.ctlPrimary.pause { background: linear-gradient(180deg, rgba(16, 24, 40, 0.85), rgba(16, 24, 40, 0.95)); box-shadow: 0 20rpx 50rpx rgba(16, 24, 40, 0.32); }
.ctlPrimaryText { color: #fff; font-size: 24rpx; font-weight: 740; letter-spacing: 0.4rpx; }
.ctlGlyph { width: 22rpx; height: 22rpx; display: flex; align-items: center; justify-content: center; }
.triangle {
  width: 0; height: 0;
  border-left: 14rpx solid #fff;
  border-top: 9rpx solid transparent;
  border-bottom: 9rpx solid transparent;
}
.pauseGlyph { display: flex; gap: 6rpx; }
.pauseGlyph view { width: 5rpx; height: 18rpx; background: #fff; border-radius: 2rpx; }

.section { display: flex; flex-direction: column; gap: 14rpx; }
.sectionHead { padding: 0 4rpx; }
.sectionTitle { font-size: 24rpx; font-weight: 740; color: rgba(16, 24, 40, 0.82); }
.t-dark .sectionTitle { color: rgba(245, 247, 255, 0.82); }
.sectionSub { display: block; margin-top: 4rpx; font-size: 20rpx; color: rgba(16, 24, 40, 0.5); }
.t-dark .sectionSub { color: rgba(245, 247, 255, 0.48); }

.noiseRow { display: flex; gap: 10rpx; flex-wrap: wrap; }
.noise {
  flex: 1 0 130rpx;
  padding: 16rpx 14rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  display: flex;
  align-items: center;
  gap: 10rpx;
  transition: background 220ms ease, border-color 220ms ease, transform 180ms ease;
}
.t-dark .noise {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.noise:active { transform: scale(0.985); }
.noise.on {
  background: rgba(46, 99, 255, 0.10);
  border-color: rgba(46, 99, 255, 0.22);
}
.noiseText { font-size: 21rpx; font-weight: 660; color: rgba(16, 24, 40, 0.78); }
.t-dark .noiseText { color: rgba(245, 247, 255, 0.78); }
.noise.on .noiseText { color: rgba(46, 99, 255, 0.96); }
.t-dark .noise.on .noiseText { color: rgba(170, 200, 255, 0.96); }
.noiseGlyph {
  width: 30rpx; height: 30rpx;
  border-radius: 50%;
  border: 1.4rpx solid rgba(16, 24, 40, 0.32);
  position: relative;
  display: flex; align-items: center; justify-content: center;
}
.t-dark .noiseGlyph { border-color: rgba(245, 247, 255, 0.36); }
.noise.on .noiseGlyph { border-color: rgba(46, 99, 255, 0.66); }
.noiseGlyph .dot {
  width: 8rpx; height: 8rpx; border-radius: 50%; background: rgba(16, 24, 40, 0.42);
}
.t-dark .noiseGlyph .dot { background: rgba(245, 247, 255, 0.42); }
.noise.on .noiseGlyph .dot { background: rgba(46, 99, 255, 0.92); }
.noiseGlyph.g-silence .dot { background: transparent; }
.noiseGlyph.g-rain { border-style: dashed; }
.noiseGlyph.g-wind .dot { width: 14rpx; height: 1.6rpx; border-radius: 999rpx; }
.noiseGlyph.g-cafe .dot { background: rgba(220, 140, 30, 0.85); }

.card {
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
}
.t-dark .card {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.pad { padding: 22rpx 22rpx; }

.weekRow {
  display: flex; gap: 14rpx; align-items: flex-end; height: 160rpx;
  padding: 0 6rpx;
}
.bar { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8rpx; height: 100%; }
.barTrack { width: 100%; flex: 1; border-radius: 12rpx; background: rgba(16, 24, 40, 0.05); display: flex; align-items: flex-end; overflow: hidden; }
.t-dark .barTrack { background: rgba(245, 247, 255, 0.06); }
.barFill {
  width: 100%;
  background: linear-gradient(180deg, rgba(120, 160, 255, 0.92), rgba(46, 99, 255, 0.92));
  border-radius: 12rpx;
  transition: height 380ms cubic-bezier(0.2, 0.7, 0.1, 1);
}
.barLabel { font-size: 18rpx; color: rgba(16, 24, 40, 0.46); }
.t-dark .barLabel { color: rgba(245, 247, 255, 0.46); }

.weekStats {
  display: flex; justify-content: space-between; gap: 12rpx;
  margin-top: 18rpx; padding-top: 18rpx;
  border-top: 1rpx solid rgba(16, 24, 40, 0.05);
}
.t-dark .weekStats { border-top-color: rgba(255, 255, 255, 0.05); }
.statBlock { display: flex; flex-direction: column; gap: 4rpx; flex: 1; }
.statNum { font-size: 26rpx; font-weight: 720; color: rgba(16, 24, 40, 0.86); }
.t-dark .statNum { color: rgba(245, 247, 255, 0.86); }
.statLabel { font-size: 18rpx; color: rgba(16, 24, 40, 0.46); }
.t-dark .statLabel { color: rgba(245, 247, 255, 0.46); }

.visRow { display: flex; gap: 10rpx; padding: 0 4rpx; }
.visChip {
  flex: 1; height: 78rpx; border-radius: 22rpx;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
}
.t-dark .visChip { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.visChip.on { background: rgba(46, 99, 255, 0.12); border-color: rgba(46, 99, 255, 0.24); }
.visText { font-size: 22rpx; font-weight: 660; color: rgba(16, 24, 40, 0.7); }
.t-dark .visText { color: rgba(245, 247, 255, 0.7); }
.visChip.on .visText { color: rgba(46, 99, 255, 0.96); font-weight: 740; }
.t-dark .visChip.on .visText { color: rgba(170, 200, 255, 0.96); }

.spacer { height: 24rpx; }

.overlay { position: fixed; inset: 0; z-index: 60; background: rgba(8, 12, 24, 0.4); backdrop-filter: blur(12px); opacity: 0; pointer-events: none; transition: opacity 0.22s ease; }
.overlay.show { opacity: 1; pointer-events: auto; }
.sheet { position: absolute; left: 24rpx; right: 24rpx; bottom: 24rpx; padding: 28rpx 22rpx 24rpx; border-radius: 32rpx; background: rgba(255, 255, 255, 0.92); border: 1rpx solid rgba(255, 255, 255, 0.6); }
.t-dark .sheet { background: #1a1d21; border-color: rgba(255, 255, 255, 0.06); }
.sheetTitle { font-size: 26rpx; font-weight: 740; color: rgba(16, 24, 40, 0.92); }
.t-dark .sheetTitle { color: #f5f7fa; }
.sheetSub { display: block; margin-top: 6rpx; font-size: 20rpx; color: rgba(16, 24, 40, 0.5); }
.t-dark .sheetSub { color: rgba(245, 247, 255, 0.5); }
.customRow { margin-top: 22rpx; display: flex; align-items: center; justify-content: space-between; gap: 18rpx; padding: 0 6rpx; }
.adjust { width: 80rpx; height: 80rpx; border-radius: 50%; background: rgba(16, 24, 40, 0.06); display: flex; align-items: center; justify-content: center; }
.t-dark .adjust { background: rgba(255, 255, 255, 0.06); }
.adjustText { font-size: 36rpx; color: rgba(16, 24, 40, 0.7); font-weight: 300; line-height: 1; }
.t-dark .adjustText { color: rgba(245, 247, 255, 0.7); }
.customNumWrap { display: flex; align-items: baseline; gap: 8rpx; }
.customNum { font-size: 76rpx; font-weight: 220; letter-spacing: -2rpx; color: rgba(16, 24, 40, 0.92); font-feature-settings: 'tnum'; }
.t-dark .customNum { color: #f5f7fa; }
.customUnit { font-size: 22rpx; color: rgba(16, 24, 40, 0.5); }
.t-dark .customUnit { color: rgba(245, 247, 255, 0.5); }
.commit { margin-top: 22rpx; height: 86rpx; border-radius: 22rpx; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, #5a8eff, #2e63ff); box-shadow: 0 18rpx 50rpx rgba(46, 99, 255, 0.28); }
.commitText { color: #fff; font-size: 24rpx; font-weight: 740; }
</style>
