<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader nav-mode="back" />

    <scroll-view class="scroll" scroll-y :show-scrollbar="false" :enhanced="true">
      <view class="safe">

        <view class="stage">
          <view
            v-if="showReset"
            class="resetDot tap"
            role="button"
            aria-label="Reset"
            @tap="reset"
          />

          <view class="ringStack">
            <view class="ringBg" />
            <view class="ringFill" :style="ringStyle" />

            <view
              class="centerCol"
              :class="{ editable: canEditDuration }"
              @touchstart.stop="onDragStart"
              @touchmove.stop.prevent="onDragMove"
              @touchend.stop="onDragEnd"
              @touchcancel.stop="onDragEnd"
            >
              <view v-if="canEditDuration" class="digitRow">
                <input
                  class="minField"
                  type="number"
                  :value="minuteDraft"
                  maxlength="3"
                  @input="onMinuteInput"
                  @blur="onMinuteBlur"
                  @tap.stop
                />
                <text class="sep">:</text>
                <text class="secField">00</text>
              </view>
              <text v-else class="timer">{{ timerDisplay }}</text>
            </view>

            <view
              class="playOrb tap"
              :class="{ pause: running }"
              role="button"
              :aria-label="running ? 'Pause' : 'Start'"
              @tap="togglePlay"
            >
              <view v-if="!running" class="playGlyph" />
              <view v-else class="pauseGlyph"><view /><view /></view>
            </view>
          </view>
        </view>

        <view class="bottomDock">
          <scroll-view class="noiseScroll" scroll-x :show-scrollbar="false" enhanced>
            <view class="noiseTrack">
              <view
                v-for="n in noiseLibrary"
                :key="n.id"
                class="noiseChip tap"
                :class="{ on: prefs.soundId === n.id, deletable: canDeleteNoise(n) }"
                role="button"
                :aria-label="n.name"
                @tap="pickNoise(n.id)"
                @longpress="onNoiseLongPress(n)"
              >
                <view class="orbWrap">
                  <view
                    class="orb"
                    :class="{ muted: n.id === 'silence' }"
                    :style="orbStyle(n)"
                  />
                  <view v-if="prefs.soundId === n.id" class="selRing" />
                  <view v-if="n.source === 'local'" class="localDot" />
                  <view v-if="n.source === 'shared'" class="sharedDot" />
                </view>
              </view>

              <view
                class="noiseChip tap add"
                role="button"
                aria-label="Add local sound"
                @tap="addLocalSound"
                @longpress="onAddLongPress"
              >
                <view class="orbWrap">
                  <view class="orb addOrb">
                    <view class="plusBar h" />
                    <view class="plusBar v" />
                  </view>
                </view>
              </view>
            </view>
          </scroll-view>

          <view
            class="eyeDot tap"
            :class="{ on: prefs.visibility === 'public' }"
            role="button"
            @tap="toggleVisibility"
          >
            <view class="eyeMini" :class="{ open: prefs.visibility === 'public' }" />
          </view>
        </view>

        <view class="weekStrip">
          <view v-for="d in weekTotals" :key="d.key" class="wBar">
            <view class="wFill" :style="{ height: barHeight(d.minutes) + '%' }" />
          </view>
        </view>

        <view class="spacer" />
      </view>
    </scroll-view>

    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import { useTheme } from '@/composables/useTheme'
import { useFocusStore } from '@/composables/useFocusStore'
import { playFocusAudio, stopFocusAudio } from '@/composables/useFocusAudio'
import { useUserStore } from '@/composables/useUserStore'
import { isAdminMember } from '@/lib/classMembers'
import { toast } from '@/composables/useToast'

const { themeClass } = useTheme()
const { currentUser } = useUserStore()
const isAdmin = computed(() => isAdminMember(currentUser.value))

const {
  prefs,
  noiseLibrary,
  weekTotals,
  recordSession,
  setVisibility,
  setSound,
  setDefaultMinutes,
  getNoiseById,
  refreshNoiseLibrary,
  addLocalNoise,
  removeLocalNoise,
  addSharedNoise,
  removeSharedNoise,
  loadActiveSession,
  saveActiveSession,
  clearActiveSession,
} = useFocusStore()

const saved = loadActiveSession()
const selectedMinutes = ref(saved?.selectedMinutes || prefs.value.defaultMinutes || 25)
const minuteDraft = ref(selectedMinutes.value)
const totalSeconds = computed(() => selectedMinutes.value * 60)
const remaining = ref(saved?.remaining ?? selectedMinutes.value * 60)
const elapsed = ref(saved?.elapsed ?? 0)
const running = ref(false)
const tickRef = ref(null)

const dragLastY = ref(0)
const dragAccum = ref(0)
const DRAG_STEP_PX = 28

const canEditDuration = computed(() => !running.value && remaining.value === totalSeconds.value)
const showReset = computed(() => running.value || remaining.value < totalSeconds.value)

const timerDisplay = computed(() => {
  const total = Math.max(0, remaining.value)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

const ringStyle = computed(() => {
  const pct = totalSeconds.value === 0 ? 0 : 1 - remaining.value / totalSeconds.value
  const deg = pct * 360
  return {
    background: `conic-gradient(rgba(46,99,255,0.88) ${deg}deg, transparent ${deg}deg)`,
  }
})

watch(selectedMinutes, (v) => {
  if (canEditDuration.value) minuteDraft.value = v
})

function barHeight(minutes) {
  const max = Math.max(60, ...weekTotals.value.map((d) => d.minutes))
  if (!max) return 8
  return Math.max(8, Math.min(100, Math.round((minutes / max) * 100)))
}

function clampMinutes(value) {
  return Math.max(1, Math.min(240, Math.round(Number(value) || 1)))
}

function applyMinutes(value) {
  if (!canEditDuration.value) return
  const next = clampMinutes(value)
  minuteDraft.value = next
  selectedMinutes.value = next
  remaining.value = next * 60
  elapsed.value = 0
  setDefaultMinutes(next)
  persistSession()
}

function adjustMinutes(delta) {
  applyMinutes(minuteDraft.value + delta)
}

function onMinuteInput(e) {
  const raw = e.detail?.value ?? e.target?.value ?? ''
  if (raw === '') {
    minuteDraft.value = ''
    return
  }
  applyMinutes(raw)
}

function onMinuteBlur() {
  if (minuteDraft.value === '' || minuteDraft.value === null) {
    applyMinutes(selectedMinutes.value || 25)
  }
}

function onDragStart(e) {
  if (!canEditDuration.value) return
  dragLastY.value = e.touches[0].clientY
  dragAccum.value = 0
}

function onDragMove(e) {
  if (!canEditDuration.value) return
  const y = e.touches[0].clientY
  dragAccum.value += dragLastY.value - y
  dragLastY.value = y

  while (dragAccum.value >= DRAG_STEP_PX) {
    adjustMinutes(1)
    dragAccum.value -= DRAG_STEP_PX
  }
  while (dragAccum.value <= -DRAG_STEP_PX) {
    adjustMinutes(-1)
    dragAccum.value += DRAG_STEP_PX
  }
}

function onDragEnd() {
  dragAccum.value = 0
}

function persistSession() {
  saveActiveSession({
    remaining: remaining.value,
    selectedMinutes: selectedMinutes.value,
    totalSeconds: totalSeconds.value,
    elapsed: totalSeconds.value - remaining.value,
    soundId: prefs.value.soundId,
    running: false,
  })
}

function restoreSession() {
  const snap = loadActiveSession()
  if (!snap) return
  if (snap.selectedMinutes) {
    selectedMinutes.value = snap.selectedMinutes
    minuteDraft.value = snap.selectedMinutes
  }
  if (typeof snap.remaining === 'number') remaining.value = snap.remaining
  if (typeof snap.elapsed === 'number') elapsed.value = snap.elapsed
  if (snap.soundId) setSound(snap.soundId)
}

function tick() {
  if (!running.value) return
  remaining.value = Math.max(0, remaining.value - 1)
  elapsed.value = totalSeconds.value - remaining.value
  if (remaining.value === 0) completeSession()
}

function togglePlay() {
  if (running.value) pause()
  else start()
}

function start() {
  if (remaining.value <= 0) {
    remaining.value = totalSeconds.value
    elapsed.value = 0
  }
  running.value = true
  if (tickRef.value) clearInterval(tickRef.value)
  tickRef.value = setInterval(tick, 1000)
  persistSession()
  syncAudio()
}

function pause() {
  running.value = false
  if (tickRef.value) {
    clearInterval(tickRef.value)
    tickRef.value = null
  }
  persistSession()
  stopFocusAudio()
}

function reset() {
  pause()
  remaining.value = totalSeconds.value
  elapsed.value = 0
  minuteDraft.value = selectedMinutes.value
  persistSession()
}

function completeSession() {
  pause()
  recordSession({
    minutes: selectedMinutes.value,
    subject: 'Focus',
    soundId: prefs.value.soundId,
  })
  toast.saved()
  remaining.value = totalSeconds.value
  elapsed.value = 0
  minuteDraft.value = selectedMinutes.value
  clearActiveSession()
}

function pickNoise(id) {
  setSound(id)
  syncAudio()
  persistSession()
}

function orbStyle(n) {
  if (n.id === 'silence') return {}
  return { background: n.color }
}

function canDeleteNoise(n) {
  if (n.source === 'shared') return isAdmin.value
  if (n.source === 'local') return n.userId === currentUser.value?.id
  return false
}

function onNoiseLongPress(n) {
  if (!canDeleteNoise(n)) return
  uni.showModal({
    title: 'Remove this sound?',
    confirmText: 'Remove',
    success: async (res) => {
      if (!res.confirm) return
      try {
        if (n.source === 'shared') await removeSharedNoise(currentUser.value?.id, n.id)
        else await removeLocalNoise(currentUser.value?.id, n.id)
        stopFocusAudio()
        toast.removed()
      } catch {
        toast.show('Could not remove')
      }
    },
  })
}

async function addLocalSound() {
  try {
    await addLocalNoise(currentUser.value?.id)
    toast.added()
  } catch (e) {
    if (String(e?.errMsg || e?.message || '').includes('cancel')) return
    toast.show(e?.message || 'Upload failed')
  }
}

async function onAddLongPress() {
  if (!isAdmin.value) return
  try {
    await addSharedNoise(currentUser.value?.id)
    toast.added()
  } catch (e) {
    if (String(e?.errMsg || e?.message || '').includes('cancel')) return
    toast.show(e?.message || 'Upload failed')
  }
}

function syncAudio() {
  const noise = getNoiseById(prefs.value.soundId)
  if (running.value && noise?.audioUrl) {
    playFocusAudio(noise.audioUrl)
  } else {
    stopFocusAudio()
  }
}

function toggleVisibility() {
  setVisibility(prefs.value.visibility === 'public' ? 'private' : 'public')
}

watch([running, () => prefs.value.soundId], syncAudio)

onShow(async () => {
  await refreshNoiseLibrary(currentUser.value?.id)
  restoreSession()
  syncAudio()
})
onHide(() => {
  pause()
  stopFocusAudio()
})
onBeforeUnmount(() => {
  pause()
  stopFocusAudio()
})
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; }
.bg {
  position: absolute; inset: 0; z-index: 0;
  background: radial-gradient(900rpx 640rpx at 50% 8%, rgba(46, 99, 255, 0.12), transparent 62%),
    linear-gradient(180deg, #f8faff, #eef1f7);
}
.t-dark .bg {
  background: radial-gradient(900rpx 640rpx at 50% 8%, rgba(60, 120, 255, 0.14), transparent 62%),
    linear-gradient(180deg, #111315, #0e1014);
}

.scroll { position: relative; z-index: 1; height: calc(100vh - var(--shell-header-offset, 148rpx)); }
.safe {
  padding: 12rpx 24rpx 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 36rpx;
}

.stage {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  padding-top: 16rpx;
}

.resetDot {
  position: absolute;
  top: 0;
  right: calc(50% - 230rpx);
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: rgba(16, 24, 40, 0.05);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  z-index: 4;
}
.resetDot::after {
  content: '';
  position: absolute;
  inset: 11rpx;
  border-radius: 50%;
  border: 2rpx solid rgba(16, 24, 40, 0.45);
  border-top-color: transparent;
  transform: rotate(-45deg);
}
.t-dark .resetDot {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
}
.t-dark .resetDot::after { border-color: rgba(245, 247, 255, 0.45); border-top-color: transparent; }

.ringStack {
  position: relative;
  width: 460rpx;
  height: 460rpx;
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
  background: rgba(16, 24, 40, 0.06);
}
.t-dark .ringBg { background: rgba(245, 247, 255, 0.06); }
.ringFill {
  transition: background 800ms linear;
  mask: radial-gradient(closest-side, transparent calc(50% - 12rpx), #000 calc(50% - 12rpx));
  -webkit-mask: radial-gradient(closest-side, transparent calc(50% - 12rpx), #000 calc(50% - 12rpx));
}

.centerCol {
  position: relative;
  z-index: 2;
  width: 340rpx;
  height: 340rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.88);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20rpx 60rpx rgba(12, 20, 40, 0.08);
}
.t-dark .centerCol {
  background: rgba(26, 29, 33, 0.92);
  box-shadow: 0 24rpx 70rpx rgba(0, 0, 0, 0.35);
}
.centerCol.editable { cursor: grab; }

.digitRow {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2rpx;
}

.minField {
  width: 128rpx;
  text-align: center;
  font-size: 80rpx;
  font-weight: 200;
  letter-spacing: -3rpx;
  color: rgba(16, 24, 40, 0.92);
  font-feature-settings: 'tnum';
  background: transparent;
  border: none;
  padding: 0;
  line-height: 1;
}
.t-dark .minField { color: rgba(245, 247, 255, 0.92); }

.sep {
  font-size: 60rpx;
  font-weight: 200;
  color: rgba(16, 24, 40, 0.28);
  line-height: 1;
}
.t-dark .sep { color: rgba(245, 247, 255, 0.28); }

.secField {
  font-size: 80rpx;
  font-weight: 200;
  letter-spacing: -3rpx;
  color: rgba(16, 24, 40, 0.32);
  font-feature-settings: 'tnum';
  line-height: 1;
}
.t-dark .secField { color: rgba(245, 247, 255, 0.32); }

.timer {
  font-size: 88rpx;
  font-weight: 200;
  letter-spacing: -3rpx;
  color: rgba(16, 24, 40, 0.92);
  font-feature-settings: 'tnum';
  line-height: 1;
}
.t-dark .timer { color: rgba(245, 247, 255, 0.92); }

.playOrb {
  position: absolute;
  left: 50%;
  bottom: 18rpx;
  z-index: 3;
  width: 88rpx;
  height: 88rpx;
  margin-left: -44rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #5a8eff, #2e63ff);
  box-shadow: 0 16rpx 44rpx rgba(46, 99, 255, 0.32);
  transition: transform 180ms ease, background 220ms ease, box-shadow 220ms ease;
}
.playOrb.pause {
  background: rgba(16, 24, 40, 0.88);
  box-shadow: 0 14rpx 40rpx rgba(16, 24, 40, 0.28);
}
.t-dark .playOrb.pause { background: rgba(245, 247, 255, 0.14); }

.playGlyph {
  width: 0;
  height: 0;
  margin-left: 5rpx;
  border-left: 16rpx solid #fff;
  border-top: 10rpx solid transparent;
  border-bottom: 10rpx solid transparent;
}
.pauseGlyph { display: flex; gap: 6rpx; }
.pauseGlyph view {
  width: 5rpx;
  height: 20rpx;
  background: #fff;
  border-radius: 2rpx;
}

.bottomDock {
  width: 100%;
  max-width: 560rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.noiseScroll {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
}

.noiseTrack {
  display: inline-flex;
  align-items: center;
  gap: 12rpx;
  padding: 6rpx 4rpx;
}

.noiseChip {
  position: relative;
  flex-shrink: 0;
}

.orbWrap {
  position: relative;
  width: 52rpx;
  height: 52rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.orb {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  transition: transform 180ms ease, box-shadow 220ms ease;
}
.orb.muted {
  background: rgba(16, 24, 40, 0.12);
  border: 2rpx dashed rgba(16, 24, 40, 0.22);
}
.t-dark .orb.muted {
  background: rgba(245, 247, 255, 0.08);
  border-color: rgba(245, 247, 255, 0.22);
}

.noiseChip.on .orb {
  transform: scale(1.06);
}

.selRing {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 2.4rpx solid rgba(46, 99, 255, 0.88);
  box-shadow: 0 0 0 4rpx rgba(46, 99, 255, 0.14);
}
.t-dark .selRing {
  border-color: rgba(170, 200, 255, 0.92);
  box-shadow: 0 0 0 4rpx rgba(120, 160, 255, 0.18);
}

.localDot, .sharedDot {
  position: absolute;
  right: 2rpx;
  bottom: 2rpx;
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  border: 1.5rpx solid rgba(255, 255, 255, 0.9);
}
.localDot { background: rgba(120, 90, 220, 0.95); }
.sharedDot { background: rgba(36, 160, 110, 0.95); }

.addOrb {
  background: rgba(255, 255, 255, 0.55);
  border: 1.6rpx dashed rgba(46, 99, 255, 0.42);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}
.t-dark .addOrb {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(170, 200, 255, 0.42);
}
.plusBar {
  position: absolute;
  background: rgba(46, 99, 255, 0.82);
  border-radius: 999rpx;
}
.t-dark .plusBar { background: rgba(170, 200, 255, 0.88); }
.plusBar.h { width: 18rpx; height: 2.4rpx; }
.plusBar.v { width: 2.4rpx; height: 18rpx; }

.eyeDot {
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(255, 255, 255, 0.55);
  border: 1rpx solid rgba(16, 24, 40, 0.05);
}
.t-dark .eyeDot {
  background: rgba(26, 29, 33, 0.55);
  border-color: rgba(255, 255, 255, 0.06);
}
.eyeDot.on { background: rgba(46, 99, 255, 0.12); border-color: rgba(46, 99, 255, 0.22); }

.eyeMini {
  width: 22rpx;
  height: 12rpx;
  border-radius: 999rpx;
  border: 2rpx solid rgba(16, 24, 40, 0.38);
  position: relative;
}
.t-dark .eyeMini { border-color: rgba(245, 247, 255, 0.38); }
.eyeMini::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 5rpx;
  height: 5rpx;
  margin: -2.5rpx 0 0 -2.5rpx;
  border-radius: 50%;
  background: rgba(16, 24, 40, 0.45);
}
.t-dark .eyeMini::after { background: rgba(245, 247, 255, 0.45); }
.eyeDot.on .eyeMini::after { background: rgba(46, 99, 255, 0.95); }
.eyeMini:not(.open)::before {
  content: '';
  position: absolute;
  left: -3rpx;
  right: -3rpx;
  top: 50%;
  height: 2rpx;
  background: rgba(16, 24, 40, 0.45);
  transform: rotate(-22deg);
}
.t-dark .eyeMini:not(.open)::before { background: rgba(245, 247, 255, 0.45); }

.weekStrip {
  width: 100%;
  max-width: 520rpx;
  height: 72rpx;
  display: flex;
  align-items: flex-end;
  gap: 8rpx;
  padding: 0 8rpx;
  opacity: 0.72;
}
.wBar {
  flex: 1;
  height: 100%;
  border-radius: 8rpx;
  background: rgba(16, 24, 40, 0.04);
  display: flex;
  align-items: flex-end;
  overflow: hidden;
}
.t-dark .wBar { background: rgba(245, 247, 255, 0.04); }
.wFill {
  width: 100%;
  background: rgba(46, 99, 255, 0.72);
  border-radius: 8rpx 8rpx 0 0;
  transition: height 380ms cubic-bezier(0.2, 0.7, 0.1, 1);
}
.t-dark .wFill { background: rgba(120, 160, 255, 0.78); }

.spacer { height: 16rpx; }
</style>
