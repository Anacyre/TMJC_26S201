<template>
  <view class="page" :class="themeClass">
    <view class="focusCanvas">
      <view class="bg" />
      <view class="bgLiveStack" :class="{ active: running }" :style="bgMotionVars">
          <view
            v-for="layerIndex in 2"
            :key="layerIndex - 1"
            class="bgLiveLayer"
            :class="{ on: bgFront === layerIndex - 1 }"
          >
            <view class="bgLiveBlur" :style="bgLiveBlurStyle(layerIndex - 1)">
              <view
                v-for="(_, regionIndex) in FOCUS_BG_REGIONS"
                :key="regionIndex"
                class="bgRegion"
                :style="bgRegionStyle(layerIndex - 1, regionIndex)"
              />
              <view
                v-for="(link, linkIndex) in layerLinks(layerIndex - 1)"
                :key="'link-' + linkIndex"
                class="bgBridge"
                :style="link.style"
              />
            </view>
          </view>
      </view>

      <view
        v-if="running"
        class="focusRunVeil"
        aria-hidden="true"
      />

      <scroll-view class="scroll" scroll-y :show-scrollbar="false" :enhanced="true">
      <view class="safe">

        <view class="stage dialStage">
          <view
            v-if="showReset"
            class="resetDot tap focusChrome"
            :class="chromeClass"
            role="button"
            aria-label="Reset"
            @tap="reset"
          />

          <view v-if="canAdjustTime" class="timeStepRow">
            <view class="timeStepBtn tap" role="button" aria-label="Minus 10 minutes" @tap.stop="adjustSessionTime(-10)">
              <text class="timeStepGlyph">−</text>
            </view>
            <view class="timeStepBtn tap" role="button" aria-label="Plus 10 minutes" @tap.stop="adjustSessionTime(10)">
              <text class="timeStepGlyph">+</text>
            </view>
          </view>

          <view class="ringStack">
            <view class="knobShadow" aria-hidden="true" />
            <view class="ringGroove" aria-hidden="true" />
            <view class="ringTexture" aria-hidden="true" />
            <view class="ringTrack" />
            <view class="ringFill" :style="ringStyle" />
            <view class="ringGlow" :style="ringGlowStyle" />
            <view class="ringStartMark" aria-hidden="true" />
            <view class="ringTipWrap" :style="ringTipWrapStyle">
              <view v-if="showPointerMark" class="ringPointerSpan" />
              <view v-if="showPointerMark" class="ringPointerMark" />
              <view class="ringTip" />
            </view>

            <view
              class="centerCol"
              :class="{ editable: canAdjustTime }"
              @touchstart.stop="onDragStart"
              @touchmove.stop.prevent="onDragMove"
              @touchend.stop="onDragEnd"
              @touchcancel.stop="onDragEnd"
            >
              <view class="centerCap" aria-hidden="true" />
              <view class="centerDimple" aria-hidden="true" />
              <view class="centerContent">
              <view v-if="canAdjustTime && isPreStart" class="digitRow">
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

        <view class="bottomDock focusChrome" :class="chromeClass">
          <view
            class="noisePill tap"
            role="button"
            aria-label="Ambient sound"
            @tap="openNoiseSheet"
          >
            <view
              class="noisePillOrb"
              :class="{ muted: activeNoise?.id === 'silence' }"
              :style="activeNoiseOrbStyle"
            >
              <view class="noiseGlyph" :class="'ic-' + (activeNoise?.icon || 'silence')" />
            </view>
            <text class="noisePillLabel">{{ activeNoise?.name || 'No noise' }}</text>
          </view>
          <text v-if="showFocusTime" class="weekStat">{{ weekMinutesLabel }} this week</text>
        </view>

        <view v-if="showFocusTime" class="weekStrip focusChrome" :class="chromeClass">
          <view v-for="d in weekTotals" :key="d.key" class="wBar">
            <view class="wFill" :style="{ height: barHeight(d.minutes) + '%' }" />
          </view>
        </view>

        <view class="spacer" />
      </view>
    </scroll-view>
    </view>

    <view class="focusChrome headerWrap" :class="chromeClass">
      <AppHeader nav-mode="back" />
    </view>

    <view class="focusChrome" :class="chromeClass">
      <GlobalSearchOverlay />
    </view>

    <FocusNoiseSheet
      ref="noiseSheetRef"
      :open="noiseSheetOpen"
      :sounds="noiseLibrary"
      :selected-id="prefs.soundId"
      :visibility="prefs.visibility"
      :is-admin="isAdmin"
      @close="noiseSheetOpen = false"
      @confirm="onNoiseConfirm"
      @toggle-visibility="toggleVisibility"
      @upload="onNoiseUpload"
      @removed="onNoiseRemoved"
    />
  </view>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { onHide, onShow } from '@dcloudio/uni-app'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import FocusNoiseSheet from '@/components/FocusNoiseSheet.vue'
import { useTheme } from '@/composables/useTheme'
import { useAppearancePrefs } from '@/composables/useAppearancePrefs'
import { useFocusStore } from '@/composables/useFocusStore'
import { playFocusAudio, pauseFocusAudio, stopFocusAudio } from '@/composables/useFocusAudio'
import { useUserStore } from '@/composables/useUserStore'
import { useAdminMode } from '@/composables/useAdminMode'
import { toast } from '@/composables/useToast'

const { themeClass } = useTheme()
const { showFocusTime } = useAppearancePrefs()
const { currentUser } = useUserStore()
const { isAdminActive: isAdmin } = useAdminMode()

const {
  prefs,
  noiseLibrary,
  weekTotals,
  weekMinutesLabel,
  fetchFocusSessions,
  recordSession,
  setVisibility,
  setSound,
  setDefaultMinutes,
  getNoiseById,
  refreshNoiseLibrary,
  uploadSharedNoise,
  removeSharedNoise,
  loadActiveSession,
  saveActiveSession,
  clearActiveSession,
} = useFocusStore()

const noiseSheetOpen = ref(false)
const noiseSheetRef = ref(null)

const activeNoise = computed(() => getNoiseById(prefs.value.soundId) || getNoiseById('silence'))

const activeNoiseOrbStyle = computed(() => {
  const n = activeNoise.value
  if (!n || n.id === 'silence') return {}
  return { background: n.color }
})

const saved = loadActiveSession()
const selectedMinutes = ref(saved?.selectedMinutes || prefs.value.defaultMinutes || 25)
const minuteDraft = ref(selectedMinutes.value)
const totalSeconds = computed(() => selectedMinutes.value * 60)
const remaining = ref(saved?.remaining ?? selectedMinutes.value * 60)
const elapsed = ref(saved?.elapsed ?? 0)
const creditedSeconds = ref(saved?.creditedSeconds ?? 0)
const running = ref(false)
const tickRef = ref(null)
const chromeHidden = ref(false)
const chromeLocked = ref(false)
const bgLayers = ref([null, null])
const bgFront = ref(0)
const bgMotionMs = ref(9000)
let chromeFadeTimer = null
let bgShiftTimer = null
let hiddenAt = null

const CHROME_FADE_MS = 1500
const BG_CROSSFADE_MS = 6000
const FOCUS_BG_REGION_COUNT = 6

/** Six disjoint patches; gap between patches ≥ patch size (see comments). */
const FOCUS_BG_REGIONS = [
  { left: 5, top: 7, w: 15, h: 13 },
  { left: 78, top: 10, w: 15, h: 13 },
  { left: 6, top: 38, w: 15, h: 13 },
  { left: 76, top: 42, w: 15, h: 13 },
  { left: 8, top: 72, w: 15, h: 13 },
  { left: 74, top: 76, w: 15, h: 13 },
]

/** Region pairs whose gaps are filled with recursive HSL-midpoint gradients. */
const FOCUS_BG_LINKS = [
  [0, 2], [2, 4], [1, 3], [3, 5],
  [0, 1], [2, 3], [4, 5],
]

const BG_BLUR_PX = 56
const FOCUS_BG_SAT_MIN = 36

const chromeClass = computed(() => ({
  'is-hidden': chromeHidden.value,
  'is-locked': chromeLocked.value,
}))

function randomHoldMs() {
  return 6000 + Math.floor(Math.random() * 6001)
}

/** 0 at session start → 1 when focus time is fully elapsed. */
const focusProgress = computed(() => {
  const total = totalSeconds.value
  if (total <= 0) return 0
  const done = total - remaining.value
  return Math.max(0, Math.min(1, done / total))
})

/** Stronger lift later in the session (ease-in). */
const brightnessBoost = computed(() => Math.pow(focusProgress.value, 0.88))

const bgMotionVars = computed(() => {
  const s = brightnessBoost.value
  return {
    '--focus-bright-lo': String(1 - 0.035 * s),
    '--focus-bright-hi': String(1 + 0.018 * s),
  }
})

function themeLiftFromBoost(rawBoost) {
  const magnitude = Math.abs(rawBoost || 0)
  const scaled = Math.round(magnitude * (0.14 + 0.2 * brightnessBoost.value))
  return -scaled
}

function clampSat(value) {
  return Math.max(FOCUS_BG_SAT_MIN, Math.round(value))
}

function buildGradientBackground(seed) {
  const g = seed
  const lift = themeLiftFromBoost(g.lBoost)
  const l1 = clampLight(62 + lift, 48, 78)
  const l2 = clampLight(56 + Math.round(lift * 0.6), 42, 72)
  const baseL = clampLight(96 + Math.round(lift * 0.32), 86, 99)
  const baseL2 = clampLight(92 + Math.round(lift * 0.26), 82, 99)
  const a1 = clampAlpha(0.14 + lift * 0.0035, 0.06, 0.24)
  const a2 = clampAlpha(0.08 + lift * 0.0025, 0.03, 0.18)
  const sat = clampSat(g.s)
  const satSoft = Math.max(FOCUS_BG_SAT_MIN - 6, Math.round(sat * 0.88))
  const satMuted = Math.max(26, Math.round(sat * 0.56))
  return `radial-gradient(140% 120% at ${g.x1}% 12%, hsla(${g.h1}, ${sat}%, ${l1}%, ${a1}), transparent 68%), radial-gradient(130% 110% at ${g.x2}% 86%, hsla(${g.h2}, ${satSoft}%, ${l2}%, ${a2}), transparent 64%), linear-gradient(165deg, hsl(${g.h1}, ${satMuted}%, ${baseL}%), hsl(${g.h3}, ${Math.round(satMuted * 0.85)}%, ${baseL2}%))`
}

function regionCenter(layout) {
  return { x: layout.left + layout.w / 2, y: layout.top + layout.h / 2 }
}

function seedToAnchorHsl(seed) {
  const lift = themeLiftFromBoost(seed.lBoost)
  return {
    h: seed.h1,
    s: clampSat(seed.s),
    l: clampLight(60 + lift, 46, 76),
    a: clampAlpha(0.38 + lift * 0.0025, 0.22, 0.58),
  }
}

function hslMean(a, b) {
  let dh = b.h - a.h
  if (dh > 180) dh -= 360
  if (dh < -180) dh += 360
  const h = (a.h + dh / 2 + 360) % 360
  return {
    h,
    s: Math.max(FOCUS_BG_SAT_MIN - 4, (a.s + b.s) / 2),
    l: (a.l + b.l) / 2,
    a: (a.a + b.a) / 2,
  }
}

function buildBridgeStops(colorA, colorB, depth) {
  let stops = [
    { t: 0, c: { ...colorA } },
    { t: 1, c: { ...colorB } },
  ]
  for (let d = 0; d < depth; d += 1) {
    const next = []
    for (let i = 0; i < stops.length - 1; i += 1) {
      next.push(stops[i])
      next.push({
        t: (stops[i].t + stops[i + 1].t) / 2,
        c: hslMean(stops[i].c, stops[i + 1].c),
      })
    }
    next.push(stops[stops.length - 1])
    stops = next
  }
  return stops
}

function hslToCss({ h, s, l, a }) {
  return `hsla(${Math.round(h)}, ${Math.round(s)}%, ${Math.round(l)}%, ${Number(a.toFixed(3))})`
}

function buildLayerBaseGradient(anchors) {
  let mixed = anchors[0]
  for (let i = 1; i < anchors.length; i += 1) {
    mixed = hslMean(mixed, anchors[i])
  }
  const top = hslMean(mixed, { ...mixed, l: mixed.l + 6, a: mixed.a * 0.72 })
  const bottom = hslMean(mixed, { ...mixed, l: mixed.l - 7, a: mixed.a * 0.65 })
  return `linear-gradient(180deg, ${hslToCss(top)}, ${hslToCss(mixed)}, ${hslToCss(bottom)})`
}

function buildLinkBridge(colorA, colorB, pA, pB) {
  const dx = pB.x - pA.x
  const dy = pB.y - pA.y
  const len = Math.hypot(dx, dy)
  const depth = Math.min(6, Math.max(4, Math.round(3 + len / 16)))
  const stops = buildBridgeStops(colorA, colorB, depth)
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI
  const cx = (pA.x + pB.x) / 2
  const cy = (pA.y + pB.y) / 2
  const stopStr = stops
    .map(({ t, c }) => `${hslToCss(c)} ${(t * 100).toFixed(2)}%`)
    .join(', ')

  return {
    style: {
      left: `${cx}%`,
      top: `${cy}%`,
      width: `${len + 14}%`,
      height: `${Math.max(16, len * 0.24)}%`,
      transform: `translate(-50%, -50%) rotate(${angle.toFixed(2)}deg)`,
      background: `linear-gradient(90deg, ${stopStr})`,
    },
  }
}

function buildRegionLinks(anchors) {
  const centers = FOCUS_BG_REGIONS.map(regionCenter)
  const seen = new Set()
  const links = []

  for (const [a, b] of FOCUS_BG_LINKS) {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`
    if (seen.has(key)) continue
    seen.add(key)
    links.push(buildLinkBridge(anchors[a], anchors[b], centers[a], centers[b]))
  }

  return links
}

function pickRegionLayer() {
  const regions = Array.from({ length: FOCUS_BG_REGION_COUNT }, () => pickGradientSeed())
  const anchors = regions.map((seed) => seedToAnchorHsl(seed))
  return {
    regions,
    anchors,
    links: buildRegionLinks(anchors),
    base: buildLayerBaseGradient(anchors),
  }
}

function layerLinks(layerIndex) {
  if (!running.value) return []
  return bgLayers.value[layerIndex]?.links || []
}

function bgLiveBlurStyle(layerIndex) {
  const layer = bgLayers.value[layerIndex]
  if (!running.value || !layer) return { opacity: 0 }
  return {
    background: layer.base || 'transparent',
    animationDuration: `${bgMotionMs.value}ms`,
    '--bg-blur': `${BG_BLUR_PX}px`,
  }
}

function bgRegionStyle(layerIndex, regionIndex) {
  const layer = bgLayers.value[layerIndex]
  if (!running.value || !layer?.regions?.[regionIndex]) return { opacity: 0 }
  const seed = layer.regions[regionIndex]
  const layout = FOCUS_BG_REGIONS[regionIndex]
  return {
    left: `${layout.left}%`,
    top: `${layout.top}%`,
    width: `${layout.w}%`,
    height: `${layout.h}%`,
    background: buildGradientBackground(seed),
    '--region-tilt': `${(regionIndex % 2 === 0 ? -1 : 1) * (2 + regionIndex * 0.6)}deg`,
  }
}

const dragLastY = ref(0)
const dragAccum = ref(0)
const DRAG_STEP_PX = 9

const sessionStarted = computed(() => creditedSeconds.value > 0 || remaining.value < totalSeconds.value)
const isPreStart = computed(() => !sessionStarted.value)
const canAdjustTime = computed(() => !running.value)
const canEditDuration = computed(() => canAdjustTime.value && isPreStart.value)
const showReset = computed(() => running.value || sessionStarted.value)

const timerDisplay = computed(() => {
  const total = Math.max(0, remaining.value)
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

function fmtDeg(value) {
  return `${Math.max(0, Math.min(360, value)).toFixed(2)}deg`
}

const RING_ZERO_DEG = 0

function buildCometRingGradient(deg) {
  if (deg <= 0) return 'transparent'

  /* t=0 sits at 12 o'clock (arc tail); tip at t=1 follows the pointer */
  const stops = [
    [0, 'hsla(220, 9%, 54%, 0.26)'],
    [0.04, 'hsla(220, 9%, 50%, 0.22)'],
    [0.10, 'hsla(220, 8%, 46%, 0.30)'],
    [0.20, 'hsla(220, 8%, 42%, 0.40)'],
    [0.32, 'hsla(220, 7%, 38%, 0.50)'],
    [0.44, 'hsla(220, 7%, 36%, 0.58)'],
    [0.56, 'hsla(220, 6%, 34%, 0.66)'],
    [0.68, 'hsla(220, 6%, 36%, 0.72)'],
    [0.78, 'hsla(220, 6%, 40%, 0.76)'],
    [0.86, 'hsla(220, 7%, 46%, 0.80)'],
    [0.93, 'hsla(220, 8%, 50%, 0.84)'],
    [1, 'hsla(220, 9%, 54%, 0.88)'],
  ]

  const parts = stops.map(([t, color]) => `${color} ${fmtDeg(deg * t)}`)
  return `conic-gradient(from ${RING_ZERO_DEG}deg, ${parts.join(', ')}, transparent ${fmtDeg(deg)})`
}

const ringStyle = computed(() => {
  const pct = totalSeconds.value === 0 ? 0 : 1 - remaining.value / totalSeconds.value
  const deg = pct * 360
  return {
    background: buildCometRingGradient(deg),
    opacity: String(0.48 + pct * 0.12),
  }
})

const ringGlowStyle = computed(() => {
  const pct = totalSeconds.value === 0 ? 0 : 1 - remaining.value / totalSeconds.value
  const deg = pct * 360
  if (deg < 1.5) return { opacity: '0', background: 'transparent' }

  const fade = fmtDeg(Math.max(0, deg - 26))
  const soft = fmtDeg(Math.max(0, deg - 16))
  const mid = fmtDeg(Math.max(0, deg - 9))
  const warm = fmtDeg(Math.max(0, deg - 3))
  const tip = fmtDeg(deg)
  const after = fmtDeg(Math.min(360, deg + 2))
  const tailStart = 'hsla(220, 10%, 56%, 0.18)'
  const tailSoft = 'hsla(220, 9%, 48%, 0.28)'
  const tailMid = 'hsla(220, 8%, 54%, 0.38)'
  const tailDeep = 'hsla(220, 7%, 42%, 0.52)'
  const tipColor = 'hsla(0, 0%, 100%, 0.62)'

  return {
    opacity: String(0.16 + pct * 0.12),
    background: `conic-gradient(from ${RING_ZERO_DEG}deg, transparent 0deg, transparent ${fade}, ${tailStart} ${fade}, ${tailSoft} ${soft}, ${tailMid} ${mid}, ${tailDeep} ${warm}, ${tipColor} ${tip}, transparent ${after})`,
  }
})

const ringTipWrapStyle = computed(() => {
  const pct = totalSeconds.value === 0 ? 0 : 1 - remaining.value / totalSeconds.value
  const deg = pct * 360
  return { transform: `rotate(${deg}deg)` }
})

const showPointerMark = computed(() => {
  const pct = totalSeconds.value === 0 ? 0 : 1 - remaining.value / totalSeconds.value
  return pct * 360 > 2.5
})

watch(selectedMinutes, (v) => {
  if (canEditDuration.value) minuteDraft.value = v
})

function clampLight(value, min, max) {
  return Math.max(min, Math.min(max, Math.round(value)))
}

function clampAlpha(value, min, max) {
  return Math.max(min, Math.min(max, Number(value.toFixed(3))))
}

function pickGradientSeed() {
  const h1 = 168 + Math.floor(Math.random() * 78)
  return {
    h1,
    h2: h1 + 14 + Math.floor(Math.random() * 32),
    h3: h1 - 18 + Math.floor(Math.random() * 36),
    s: FOCUS_BG_SAT_MIN + Math.floor(Math.random() * 18),
    lBoost: Math.floor(Math.pow(Math.random(), 2.6) * 5),
    x1: 24 + Math.floor(Math.random() * 22),
    x2: 54 + Math.floor(Math.random() * 20),
  }
}

function clearChromeFadeTimer() {
  if (chromeFadeTimer) {
    clearTimeout(chromeFadeTimer)
    chromeFadeTimer = null
  }
}

function clearBgShiftTimer() {
  if (bgShiftTimer) {
    clearTimeout(bgShiftTimer)
    bgShiftTimer = null
  }
}

function stopBgAnimation() {
  bgLayers.value = [null, null]
  bgFront.value = 0
  clearBgShiftTimer()
}

function crossfadeToNextLayer() {
  const back = 1 - bgFront.value
  bgMotionMs.value = randomHoldMs()
  bgLayers.value[back] = pickRegionLayer()
  bgFront.value = back
}

function scheduleNextBgShift() {
  clearBgShiftTimer()
  if (!running.value) return
  const holdMs = randomHoldMs()
  bgShiftTimer = setTimeout(() => {
    if (!running.value) return
    crossfadeToNextLayer()
    bgShiftTimer = setTimeout(() => {
      scheduleNextBgShift()
    }, BG_CROSSFADE_MS)
  }, holdMs)
}

function startBgAnimation() {
  stopBgAnimation()
  bgMotionMs.value = randomHoldMs()
  bgLayers.value = [pickRegionLayer(), null]
  bgFront.value = 0
  scheduleNextBgShift()
}

function enterImmersiveChrome() {
  clearChromeFadeTimer()
  chromeLocked.value = false
  chromeHidden.value = false
  requestAnimationFrame(() => {
    if (!running.value) return
    chromeHidden.value = true
    chromeFadeTimer = setTimeout(() => {
      if (running.value) chromeLocked.value = true
      chromeFadeTimer = null
    }, CHROME_FADE_MS)
  })
}

function exitImmersiveChrome() {
  clearChromeFadeTimer()
  chromeLocked.value = false
  chromeHidden.value = false
}

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
  creditedSeconds.value = 0
  setDefaultMinutes(next)
  persistSession()
}

function adjustSessionTime(deltaMinutes) {
  if (!canAdjustTime.value) return
  if (isPreStart.value) {
    applyMinutes(selectedMinutes.value + deltaMinutes)
    return
  }
  const elapsedSec = totalSeconds.value - remaining.value
  const nextRemainingSec = Math.max(60, remaining.value + deltaMinutes * 60)
  const nextTotalSec = elapsedSec + nextRemainingSec
  const nextMinutes = clampMinutes(Math.ceil(nextTotalSec / 60))
  selectedMinutes.value = nextMinutes
  remaining.value = nextRemainingSec
  elapsed.value = nextTotalSec - nextRemainingSec
  minuteDraft.value = Math.ceil(nextRemainingSec / 60)
  persistSession()
}

function adjustMinutes(delta) {
  if (isPreStart.value) applyMinutes(minuteDraft.value + delta)
  else adjustSessionTime(delta)
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
  if (!canAdjustTime.value) return
  dragLastY.value = e.touches[0].clientY
  dragAccum.value = 0
}

function onDragMove(e) {
  if (!canAdjustTime.value) return
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
    creditedSeconds: creditedSeconds.value,
    soundId: prefs.value.soundId,
    running: running.value,
    hiddenAt: hiddenAt || null,
  })
}

function creditElapsedFocus() {
  const elapsedSec = totalSeconds.value - remaining.value
  const uncredited = elapsedSec - creditedSeconds.value
  if (uncredited < 30) return 0

  const mins = Math.max(1, Math.round(uncredited / 60))
  recordSession({
    minutes: mins,
    subject: 'Focus',
    soundId: prefs.value.soundId,
  })
  creditedSeconds.value += mins * 60
  return mins
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
  if (typeof snap.creditedSeconds === 'number') creditedSeconds.value = snap.creditedSeconds
  if (snap.soundId) setSound(snap.soundId)
  if (snap.hiddenAt) hiddenAt = new Date(snap.hiddenAt).getTime()
}

function resumeRunningTimerIfNeeded() {
  const snap = loadActiveSession()
  if (!snap?.running || running.value) return
  applyBackgroundElapsed()
  if (remaining.value <= 0) return
  running.value = true
  if (tickRef.value) clearInterval(tickRef.value)
  tickRef.value = setInterval(tick, 1000)
  persistSession()
  startBgAnimation()
  enterImmersiveChrome()
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
  startBgAnimation()
  enterImmersiveChrome()
}

function stopTimer({ credit = false, stopAudio = false } = {}) {
  running.value = false
  hiddenAt = null
  if (tickRef.value) {
    clearInterval(tickRef.value)
    tickRef.value = null
  }
  if (credit && sessionStarted.value) creditElapsedFocus()
  persistSession()
  if (stopAudio) stopFocusAudio()
  else pauseFocusAudio()
  stopBgAnimation()
  exitImmersiveChrome()
}

function pause() {
  stopTimer({ credit: true })
}

function reset() {
  stopTimer({ credit: false, stopAudio: true })
  remaining.value = totalSeconds.value
  elapsed.value = 0
  creditedSeconds.value = 0
  minuteDraft.value = selectedMinutes.value
  persistSession()
}

function completeSession() {
  stopTimer({ credit: false, stopAudio: true })
  creditElapsedFocus()
  toast.focusSessionSaved()
  remaining.value = selectedMinutes.value * 60
  elapsed.value = 0
  creditedSeconds.value = 0
  minuteDraft.value = selectedMinutes.value
  clearActiveSession()
}

function openNoiseSheet() {
  noiseSheetOpen.value = true
}

function onNoiseConfirm(id) {
  pickNoise(id)
}

async function onNoiseUpload(payload) {
  try {
    await uploadSharedNoise(payload)
    noiseSheetRef.value?.finishUpload(true)
    toast.soundUploaded()
  } catch (e) {
    noiseSheetRef.value?.finishUpload(false)
    toast.show(e?.message || 'Upload failed')
  }
}

async function onNoiseRemoved(id) {
  try {
    await removeSharedNoise(currentUser.value?.id, id)
    stopFocusAudio()
    toast.soundRemoved()
  } catch {
    toast.show('Could not remove')
  }
}

function pickNoise(id) {
  setSound(id)
  syncAudio()
  persistSession()
}

function syncAudio() {
  const noise = getNoiseById(prefs.value.soundId)
  if (running.value && noise?.audioUrl) {
    playFocusAudio(noise.audioUrl)
  } else if (noise?.audioUrl) {
    pauseFocusAudio()
  } else {
    stopFocusAudio()
  }
}

function applyBackgroundElapsed() {
  if (!hiddenAt) return
  const elapsedSec = Math.floor((Date.now() - hiddenAt) / 1000)
  hiddenAt = null
  if (elapsedSec <= 0) return
  remaining.value = Math.max(0, remaining.value - elapsedSec)
  elapsed.value = totalSeconds.value - remaining.value
  if (remaining.value === 0) {
    if (running.value) completeSession()
    else {
      remaining.value = 0
      clearActiveSession()
    }
  } else {
    persistSession()
  }
}

function toggleVisibility() {
  setVisibility(prefs.value.visibility === 'public' ? 'private' : 'public')
}

watch([running, () => prefs.value.soundId], syncAudio)

onShow(async () => {
  await Promise.all([
    refreshNoiseLibrary(),
    fetchFocusSessions(currentUser.value?.id),
  ])
  restoreSession()
  resumeRunningTimerIfNeeded()
  applyBackgroundElapsed()
  syncAudio()
})
onHide(() => {
  if (running.value) {
    hiddenAt = Date.now()
    persistSession()
    return
  }
  pauseFocusAudio()
})
onBeforeUnmount(() => {
  stopTimer({ credit: false, stopAudio: true })
  clearChromeFadeTimer()
  clearBgShiftTimer()
  stopBgAnimation()
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}

.page.t-dark {
  background: #0a0c0e;
}

.focusCanvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
}

.page.t-dark .focusCanvas {
  filter: invert(1) hue-rotate(180deg);
}

.bg {
  position: absolute; inset: 0; z-index: 0;
  background: radial-gradient(900rpx 640rpx at 50% 8%, rgba(46, 99, 255, 0.12), transparent 62%),
    linear-gradient(180deg, #f8faff, #eef1f7);
}
.bgLiveStack {
  position: absolute;
  inset: 0;
  z-index: 0;
  opacity: 0;
  transition: opacity 1.5s ease;
  pointer-events: none;
  overflow: hidden;
}
.bgLiveStack.active { opacity: 1; }

.focusRunVeil {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: rgba(255, 255, 255, 0.5);
  pointer-events: none;
  opacity: 0;
  animation: focusVeilIn 1.5s ease forwards;
}
.page.t-dark .focusRunVeil {
  background: rgba(0, 0, 0, 0.5);
  filter: invert(1) hue-rotate(180deg);
}
@keyframes focusVeilIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.bgLiveLayer {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 6s ease-in-out;
  pointer-events: none;
}
.bgLiveLayer.on { opacity: 1; }
.bgLiveBlur {
  position: absolute;
  inset: -12%;
  width: 124%;
  height: 124%;
  filter: blur(var(--bg-blur, 56px));
  -webkit-filter: blur(var(--bg-blur, 56px));
  will-change: transform, filter;
  animation: focusBgDrift ease-in-out infinite alternate;
  transform: translateZ(0);
}
.bgRegion {
  position: absolute;
  border-radius: 42% 38% 44% 40%;
  overflow: hidden;
  opacity: 0.94;
  transform: rotate(var(--region-tilt, 0deg));
  transition: opacity 6s ease-in-out;
}
.bgBridge {
  position: absolute;
  pointer-events: none;
  border-radius: 999px;
  opacity: 0.88;
  mix-blend-mode: normal;
}
@keyframes focusBgDrift {
  0% {
    transform: scale(1) translate3d(0, 0, 0);
    filter: blur(var(--bg-blur, 56px)) brightness(var(--focus-bright-lo, 1));
  }
  100% {
    transform: scale(1.04) translate3d(0, -12rpx, 0);
    filter: blur(var(--bg-blur, 56px)) brightness(var(--focus-bright-hi, 1));
  }
}

.focusChrome {
  opacity: 1;
  transition: opacity 1.5s ease;
}
.focusChrome.is-hidden {
  opacity: 0;
  pointer-events: none;
}
.focusChrome.is-locked { visibility: hidden; }
.headerWrap {
  position: relative;
  z-index: 2;
}

.scroll {
  position: relative;
  z-index: 2;
  height: 100vh;
  box-sizing: border-box;
  padding-top: var(--shell-header-offset, 148rpx);
}
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

.dialStage {
  --ring-center-r: 178rpx;
  --ring-inner-r: 178rpx;
  --ring-outer-r: 246rpx;
  --ring-groove-r: calc(var(--ring-inner-r) + (var(--ring-outer-r) - var(--ring-inner-r) * 0.62));
  --dial-btn-gap: 36rpx;
  width: calc(var(--ring-outer-r) * 2 + var(--dial-btn-gap) * 2);
  min-height: calc(var(--ring-outer-r) * 2);
  display: flex;
  align-items: center;
  justify-content: center;
}

.resetDot {
  position: absolute;
  top: calc(50% + var(--ring-outer-r) - 44rpx);
  right: calc(50% - var(--ring-outer-r) - 52rpx);
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

.ringStack {
  position: relative;
  width: calc(var(--ring-outer-r) * 2);
  height: calc(var(--ring-outer-r) * 2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.knobShadow {
  position: absolute;
  left: 12%;
  right: 12%;
  bottom: -6rpx;
  height: 20rpx;
  border-radius: 50%;
  background: rgba(16, 24, 40, 0.07);
  filter: blur(10rpx);
  pointer-events: none;
}

.ringGroove,
.ringTexture,
.ringTrack,
.ringFill,
.ringGlow,
.ringTipWrap {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
}

.ringGroove,
.ringTexture,
.ringTrack,
.ringFill,
.ringGlow {
  mask:
    radial-gradient(
      circle,
      transparent var(--ring-inner-r),
      #000 var(--ring-inner-r),
      #000 var(--ring-outer-r),
      transparent var(--ring-outer-r)
    );
  -webkit-mask:
    radial-gradient(
      circle,
      transparent var(--ring-inner-r),
      #000 var(--ring-inner-r),
      #000 var(--ring-outer-r),
      transparent var(--ring-outer-r)
    );
}

.ringGroove {
  background:
    linear-gradient(180deg, rgba(16, 24, 40, 0.05) 0%, rgba(255, 255, 255, 0.06) 100%);
  box-shadow:
    inset 0 5rpx 14rpx rgba(16, 24, 40, 0.07),
    inset 0 -2rpx 8rpx rgba(255, 255, 255, 0.55);
}

.ringTexture {
  opacity: 0.28;
  background:
    repeating-conic-gradient(
      from 0deg,
      rgba(255, 255, 255, 0.05) 0deg 1.5deg,
      transparent 1.5deg 7deg
    ),
    radial-gradient(circle at 50% 38%, rgba(255, 255, 255, 0.08), transparent 62%);
}

.ringTrack {
  background: rgba(142, 142, 147, 0.08);
}

.ringFill {
  transition: background 500ms linear, opacity 500ms linear;
}
.ringGlow {
  transition: opacity 500ms linear, background 500ms linear;
}

.ringTipWrap {
  z-index: 5;
  transform-origin: center center;
  transition: transform 500ms linear;
}

.ringStartMark {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
}
.ringStartMark::after {
  content: '';
  position: absolute;
  left: 50%;
  top: calc(50% - var(--ring-groove-r));
  width: 2.5rpx;
  height: 16rpx;
  margin-left: -1.25rpx;
  margin-top: -8rpx;
  border-radius: 999rpx;
  background: hsla(220, 8%, 46%, 0.34);
  box-shadow: 0 0 8rpx hsla(220, 10%, 40%, 0.12);
}

.ringPointerSpan {
  position: absolute;
  left: 50%;
  top: calc(50% - var(--ring-outer-r));
  width: 2.5rpx;
  height: calc(var(--ring-outer-r) - var(--ring-inner-r));
  margin-left: -1.25rpx;
  border-radius: 999rpx;
  background: linear-gradient(
    180deg,
    hsla(220, 14%, 16%, 0.56) 0%,
    hsla(220, 12%, 24%, 0.46) 48%,
    hsla(220, 10%, 32%, 0.38) 100%
  );
  box-shadow: 0 0 8rpx hsla(220, 12%, 18%, 0.22);
  pointer-events: none;
}

.ringPointerMark {
  position: absolute;
  left: 50%;
  top: calc(50% - var(--ring-outer-r));
  width: 3.5rpx;
  height: 26rpx;
  margin-left: -1.75rpx;
  margin-top: -13rpx;
  border-radius: 999rpx;
  background: linear-gradient(
    180deg,
    hsl(220, 14%, 12%) 0%,
    hsl(220, 12%, 20%) 42%,
    hsl(220, 10%, 28%) 100%
  );
  box-shadow:
    0 1rpx 3rpx rgba(8, 10, 16, 0.38),
    0 0 10rpx rgba(16, 20, 28, 0.18);
}

.ringTip {
  position: absolute;
  left: 50%;
  top: calc(50% - var(--ring-outer-r));
  width: 11rpx;
  height: 11rpx;
  margin-left: -5.5rpx;
  margin-top: -5.5rpx;
  border-radius: 50%;
  background:
    radial-gradient(circle at 38% 32%, hsl(220, 8%, 58%) 0%, hsl(220, 9%, 44%) 42%, hsl(220, 10%, 32%) 78%, hsl(220, 10%, 24%) 100%);
  box-shadow:
    0 1rpx 1rpx rgba(255, 255, 255, 0.22) inset,
    0 2rpx 10rpx rgba(16, 24, 40, 0.28),
    0 0 14rpx rgba(48, 48, 54, 0.22);
}
.ringTip::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 2rpx;
  height: 2rpx;
  margin: -1rpx 0 0 -1rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.56);
}

.timeStepRow {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 6;
  width: calc(var(--ring-outer-r) * 2 + var(--dial-btn-gap) * 2 + 52rpx);
  margin-left: calc((var(--ring-outer-r) * 2 + var(--dial-btn-gap) * 2 + 52rpx) / -2);
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
  transform: translateY(-50%);
}
.timeStepBtn {
  pointer-events: auto;
  width: 52rpx;
  height: 52rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.72);
  border: 1rpx solid rgba(142, 142, 147, 0.18);
  box-shadow: none;
  transition: transform 150ms ease, background 180ms ease;
}
.timeStepBtn:active { transform: scale(0.92); background: rgba(142, 142, 147, 0.12); }
.timeStepGlyph {
  font-size: 32rpx;
  font-weight: 300;
  line-height: 1;
  color: rgba(60, 60, 67, 0.72);
}

.centerCol {
  position: relative;
  z-index: 4;
  width: calc(var(--ring-center-r, 188rpx) * 2);
  height: calc(var(--ring-center-r, 188rpx) * 2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.centerCol.editable { cursor: grab; }

.centerCap {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  opacity: 0.52;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background:
    radial-gradient(circle at 38% 32%, rgba(248, 250, 255, 0.42) 0%, rgba(238, 241, 247, 0.28) 42%, rgba(238, 241, 247, 0.22) 100%);
  box-shadow:
    0 2rpx 8rpx rgba(16, 24, 40, 0.025),
    inset 0 1rpx 3rpx rgba(255, 255, 255, 0.35),
    inset 0 -6rpx 14rpx rgba(16, 24, 40, 0.03);
}

.centerDimple {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 44rpx;
  height: 22rpx;
  margin-left: -22rpx;
  margin-top: -8rpx;
  border-radius: 0 0 22rpx 22rpx;
  opacity: 0.65;
  background:
    radial-gradient(ellipse 100% 90% at 50% 0%, rgba(16, 24, 40, 0.08), rgba(16, 24, 40, 0.02) 68%, transparent 100%);
  box-shadow:
    inset 0 4rpx 10rpx rgba(16, 24, 40, 0.07),
    inset 0 1rpx 2rpx rgba(255, 255, 255, 0.12);
}

.centerContent {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}

.digitRow {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 2rpx;
}

.minField {
  width: 140rpx;
  text-align: center;
  font-size: 92rpx;
  font-weight: 200;
  letter-spacing: -4rpx;
  color: rgba(16, 24, 40, 0.94);
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
  background: transparent;
  border: none;
  padding: 0;
  line-height: 1;
}

.sep {
  font-size: 68rpx;
  font-weight: 200;
  color: rgba(16, 24, 40, 0.24);
  line-height: 1;
}

.secField {
  font-size: 92rpx;
  font-weight: 200;
  letter-spacing: -4rpx;
  color: rgba(16, 24, 40, 0.28);
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.timer {
  font-size: 96rpx;
  font-weight: 200;
  letter-spacing: -4rpx;
  color: rgba(16, 24, 40, 0.94);
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

.playOrb {
  position: absolute;
  left: 50%;
  bottom: calc(50% - var(--ring-inner-r) + 20rpx);
  z-index: 4;
  width: 76rpx;
  height: 76rpx;
  margin-left: -38rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #007aff;
  border: none;
  box-shadow: none;
  transition: transform 180ms ease, opacity 220ms ease;
}
.playOrb:active { transform: scale(0.96); opacity: 0.88; }
.playOrb.pause {
  background: rgba(60, 60, 67, 0.88);
}

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
  flex-direction: column;
  align-items: center;
  gap: 14rpx;
  opacity: 0.82;
}

.weekStat {
  font-size: 22rpx;
  font-weight: 640;
  color: rgba(16, 24, 40, 0.48);
  letter-spacing: 0.2rpx;
}
.t-dark .weekStat { color: rgba(245, 247, 255, 0.5); }

.noisePill {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 10rpx 18rpx 10rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.42);
  border: 1rpx solid rgba(16, 24, 40, 0.05);
  backdrop-filter: blur(10px);
}

.noisePillOrb {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(46, 99, 255, 0.1);
}
.noisePillOrb.muted {
  background: transparent;
  border: 2rpx dashed rgba(142, 142, 147, 0.32);
}

.noisePillLabel {
  font-size: 24rpx;
  font-weight: 560;
  color: rgba(16, 24, 40, 0.58);
}

.noiseGlyph { width: 22rpx; height: 22rpx; position: relative; }
.ic-silence::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 16rpx;
  height: 16rpx;
  margin: -8rpx 0 0 -8rpx;
  border: 2rpx solid rgba(142, 142, 147, 0.68);
  border-radius: 50%;
  background: transparent;
  box-sizing: border-box;
}

.ic-water::before {
  content: '';
  position: absolute;
  left: 3rpx;
  right: 3rpx;
  bottom: 5rpx;
  height: 2rpx;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 999rpx;
  box-shadow: 0 -5rpx 0 rgba(255, 255, 255, 0.55);
}

.ic-forest::before,
.ic-forest::after {
  content: '';
  position: absolute;
  bottom: 3rpx;
  width: 0;
  height: 0;
  border-left: 6rpx solid transparent;
  border-right: 6rpx solid transparent;
  border-bottom: 12rpx solid rgba(255, 255, 255, 0.88);
}
.ic-forest::before { left: 3rpx; }
.ic-forest::after { right: 3rpx; transform: scale(0.82); opacity: 0.75; }

.ic-beach::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 3rpx;
  width: 8rpx;
  height: 8rpx;
  margin-left: -4rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
}
.ic-beach::after {
  content: '';
  position: absolute;
  left: 2rpx;
  right: 2rpx;
  bottom: 4rpx;
  height: 2rpx;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 999rpx;
}

.ic-cafe::before {
  content: '';
  position: absolute;
  left: 6rpx;
  right: 6rpx;
  bottom: 4rpx;
  height: 8rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.88);
  border-top: none;
  border-radius: 0 0 3rpx 3rpx;
}

.ic-library::before,
.ic-library::after {
  content: '';
  position: absolute;
  bottom: 4rpx;
  width: 5rpx;
  height: 12rpx;
  background: rgba(255, 255, 255, 0.82);
  border-radius: 2rpx 2rpx 0 0;
}
.ic-library::before { left: 5rpx; }
.ic-library::after { right: 5rpx; height: 10rpx; opacity: 0.72; }

.ic-rain::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 3rpx;
  width: 12rpx;
  height: 7rpx;
  margin-left: -6rpx;
  border-radius: 7rpx 7rpx 3rpx 3rpx;
  background: rgba(255, 255, 255, 0.82);
}

.ic-wind::before {
  content: '';
  position: absolute;
  left: 3rpx;
  top: 9rpx;
  width: 14rpx;
  height: 2rpx;
  background: rgba(255, 255, 255, 0.82);
  border-radius: 999rpx;
  box-shadow: 0 -5rpx 0 rgba(255, 255, 255, 0.55);
}

.ic-fire::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 3rpx;
  width: 0;
  height: 0;
  margin-left: -5rpx;
  border-left: 5rpx solid transparent;
  border-right: 5rpx solid transparent;
  border-bottom: 12rpx solid rgba(255, 255, 255, 0.88);
}

.weekStrip {
  width: 100%;
  max-width: 520rpx;
  height: 72rpx;
  display: flex;
  align-items: flex-end;
  gap: 8rpx;
  padding: 0 8rpx;
  opacity: 0.12;
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
.wFill {
  width: 100%;
  background: rgba(46, 99, 255, 0.72);
  border-radius: 8rpx 8rpx 0 0;
  transition: height 380ms cubic-bezier(0.2, 0.7, 0.1, 1);
}

.spacer { height: 16rpx; }
</style>
