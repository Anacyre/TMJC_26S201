<template>
  <view class="page" :class="themeClass">
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
      v-if="isDarkTheme"
      class="auroraStack"
      :class="{ active: running }"
      aria-hidden="true"
    >
      <view
        v-for="(band, index) in auroraBands"
        :key="'aurora-' + index"
        class="auroraBand"
        :style="auroraBandStyle(band)"
      />
    </view>

    <view class="focusChrome headerWrap" :class="chromeClass">
      <AppHeader nav-mode="back" />
    </view>

    <scroll-view class="scroll" scroll-y :show-scrollbar="false" :enhanced="true">
      <view class="safe">

        <view class="stage">
          <view
            v-if="showReset"
            class="resetDot tap focusChrome"
            :class="chromeClass"
            role="button"
            aria-label="Reset"
            @tap="reset"
          />

          <view class="ringStack">
            <view class="ringPlate" />
            <view class="ringOuterRim" />
            <view class="ringBg" />
            <view class="ringInnerRim" />
            <view class="ringFill" :style="ringStyle" />
            <view class="ringGlow" :style="ringGlowStyle" />

            <view v-if="canAdjustTime" class="timeStepRow">
              <view class="timeStepBtn tap" role="button" aria-label="Minus 10 minutes" @tap.stop="adjustSessionTime(-10)">
                <text class="timeStepGlyph">−</text>
              </view>
              <view class="timeStepBtn tap" role="button" aria-label="Plus 10 minutes" @tap.stop="adjustSessionTime(10)">
                <text class="timeStepGlyph">+</text>
              </view>
            </view>

            <view
              class="centerCol"
              :class="{ editable: canAdjustTime }"
              @touchstart.stop="onDragStart"
              @touchmove.stop.prevent="onDragMove"
              @touchend.stop="onDragEnd"
              @touchcancel.stop="onDragEnd"
            >
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

        <view class="weekStrip focusChrome" :class="chromeClass">
          <view v-for="d in weekTotals" :key="d.key" class="wBar">
            <view class="wFill" :style="{ height: barHeight(d.minutes) + '%' }" />
          </view>
        </view>

        <view class="spacer" />
      </view>
    </scroll-view>

    <view class="focusChrome" :class="chromeClass">
      <GlobalSearchOverlay />
    </view>
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
import { useAdminMode } from '@/composables/useAdminMode'
import { toast } from '@/composables/useToast'

const { themeClass } = useTheme()
const { currentUser } = useUserStore()
const { isAdminActive: isAdmin } = useAdminMode()

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
const creditedSeconds = ref(saved?.creditedSeconds ?? 0)
const running = ref(false)
const tickRef = ref(null)
const chromeHidden = ref(false)
const chromeLocked = ref(false)
const bgLayers = ref([null, null])
const bgFront = ref(0)
const bgMotionMs = ref(9000)
const auroraBands = ref([])
let chromeFadeTimer = null
let bgShiftTimer = null
let auroraShiftTimer = null

const AURORA_BAND_COUNT = 4
const AURORA_TOP_MAX = 30

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

const isDarkTheme = computed(() => themeClass.value === 't-dark')

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
  if (isDarkTheme.value) {
    return {
      '--focus-bright-lo': String(1 + 0.004 * s),
      '--focus-bright-hi': String(1 + 0.018 * s),
    }
  }
  return {
    '--focus-bright-lo': String(1 - 0.035 * s),
    '--focus-bright-hi': String(1 + 0.018 * s),
  }
})

function themeLiftFromBoost(rawBoost) {
  const magnitude = Math.abs(rawBoost || 0)
  if (isDarkTheme.value) {
    return Math.round(magnitude * (0.05 + 0.07 * brightnessBoost.value))
  }
  const scaled = Math.round(magnitude * (0.14 + 0.2 * brightnessBoost.value))
  return -scaled
}

function clampSat(value) {
  return Math.max(FOCUS_BG_SAT_MIN, Math.round(value))
}

function buildGradientBackground(seed) {
  const g = seed
  const dark = isDarkTheme.value
  const lift = themeLiftFromBoost(g.lBoost)
  const l1 = clampLight((dark ? 30 : 62) + lift, dark ? 18 : 48, dark ? 38 : 78)
  const l2 = clampLight((dark ? 24 : 56) + Math.round(lift * 0.6), dark ? 14 : 42, dark ? 32 : 72)
  const baseL = clampLight((dark ? 6 : 96) + Math.round(lift * 0.32), dark ? 4 : 86, dark ? 9 : 99)
  const baseL2 = clampLight((dark ? 5 : 92) + Math.round(lift * 0.26), dark ? 3 : 82, dark ? 8 : 99)
  const a1 = clampAlpha((dark ? 0.09 : 0.14) + lift * 0.0035, dark ? 0.035 : 0.06, dark ? 0.12 : 0.24)
  const a2 = clampAlpha((dark ? 0.055 : 0.08) + lift * 0.0025, dark ? 0.022 : 0.03, dark ? 0.085 : 0.18)
  const sat = clampSat(g.s)
  const satSoft = Math.max(FOCUS_BG_SAT_MIN - 6, Math.round(sat * 0.88))
  const satMuted = Math.max(26, Math.round(sat * 0.56))
  return `radial-gradient(140% 120% at ${g.x1}% 12%, hsla(${g.h1}, ${sat}%, ${l1}%, ${a1}), transparent 68%), radial-gradient(130% 110% at ${g.x2}% 86%, hsla(${g.h2}, ${satSoft}%, ${l2}%, ${a2}), transparent 64%), linear-gradient(165deg, hsl(${g.h1}, ${satMuted}%, ${baseL}%), hsl(${g.h3}, ${Math.round(satMuted * 0.85)}%, ${baseL2}%))`
}

function regionCenter(layout) {
  return { x: layout.left + layout.w / 2, y: layout.top + layout.h / 2 }
}

function seedToAnchorHsl(seed) {
  const dark = isDarkTheme.value
  const lift = themeLiftFromBoost(seed.lBoost)
  return {
    h: seed.h1,
    s: clampSat(seed.s),
    l: clampLight((dark ? 28 : 60) + lift, dark ? 16 : 46, dark ? 36 : 76),
    a: clampAlpha((dark ? 0.24 : 0.38) + lift * 0.0025, dark ? 0.12 : 0.22, dark ? 0.34 : 0.58),
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
  const dark = isDarkTheme.value
  let mixed = anchors[0]
  for (let i = 1; i < anchors.length; i += 1) {
    mixed = hslMean(mixed, anchors[i])
  }
  const top = hslMean(mixed, { ...mixed, l: mixed.l + (dark ? 2 : 6), a: mixed.a * 0.72 })
  const bottom = hslMean(mixed, { ...mixed, l: mixed.l - (dark ? 2 : 7), a: mixed.a * 0.65 })
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

function buildCometRingGradient(deg, dark) {
  if (deg <= 0) return 'transparent'

  const satTail = 11
  const satHead = 17
  const hueTail = 210
  const hueMid = 222
  const hueHead = 234
  const lTail = dark ? 50 : 80
  const lHead = dark ? 68 : 56
  const lMid = Math.round((lTail + lHead) / 2)

  const stops = dark
    ? [
        [0, hueTail, lTail, 0.035, satTail],
        [0.16, hueTail, lTail, 0.07, satTail],
        [0.38, hueMid, lMid, 0.16, satTail + 1],
        [0.62, hueMid, lMid - 1, 0.32, satTail + 2],
        [0.84, hueHead, lHead + 1, 0.62, satHead - 1],
        [0.96, hueHead, lHead + 2, 0.82, satHead],
        [1, hueHead, lHead + 3, 0.9, satHead],
      ]
    : [
        [0, hueTail, lTail, 0.028, satTail],
        [0.16, hueTail, lTail, 0.06, satTail],
        [0.38, hueMid, lMid, 0.14, satTail + 1],
        [0.62, hueMid, lMid - 2, 0.28, satTail + 2],
        [0.84, hueHead, lHead, 0.58, satHead - 1],
        [0.96, hueHead, lHead - 1, 0.76, satHead],
        [1, hueHead, lHead - 2, 0.84, satHead],
      ]

  const parts = stops.map(([t, h, l, a, sat]) => {
    const pos = deg * t
    return `hsla(${h}, ${sat}%, ${l}%, ${a}) ${fmtDeg(pos)}`
  })

  return `conic-gradient(from 0deg, ${parts.join(', ')}, transparent ${fmtDeg(deg)})`
}

const ringStyle = computed(() => {
  const pct = totalSeconds.value === 0 ? 0 : 1 - remaining.value / totalSeconds.value
  const deg = pct * 360
  return {
    background: buildCometRingGradient(deg, isDarkTheme.value),
    opacity: String(0.68 + pct * 0.24),
    filter: 'contrast(1.08)',
  }
})

const ringGlowStyle = computed(() => {
  const pct = totalSeconds.value === 0 ? 0 : 1 - remaining.value / totalSeconds.value
  const deg = pct * 360
  if (deg < 2) return { opacity: '0', background: 'transparent' }

  const dark = isDarkTheme.value
  const l = dark ? 70 : 54
  const sat = 16
  const tail = fmtDeg(Math.max(0, deg - 20))
  const warm = fmtDeg(Math.max(0, deg - 6))
  const tip = fmtDeg(deg)
  const after = fmtDeg(Math.min(360, deg + 4))

  return {
    opacity: String(0.28 + pct * 0.22),
    background: `conic-gradient(from 0deg, transparent 0deg, transparent ${tail}, hsla(228, ${sat - 2}%, ${l}%, 0.08) ${warm}, hsla(232, ${sat}%, ${l}%, 0.22) ${tip}, transparent ${after})`,
  }
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
  stopAuroraMotion()
}

function pickAuroraBand() {
  const hue = 118 + Math.floor(Math.random() * 50)
  return {
    left: 4 + Math.random() * 58,
    top: 2 + Math.random() * AURORA_TOP_MAX,
    w: 34 + Math.random() * 36,
    h: 11 + Math.random() * 15,
    rot: -38 + Math.random() * 76,
    hue,
    hue2: hue + 12 + Math.floor(Math.random() * 22),
    light: 58 + Math.floor(Math.random() * 16),
    sat: 40 + Math.floor(Math.random() * 24),
    alpha: 0.22 + Math.random() * 0.24,
    driftMs: 9000 + Math.floor(Math.random() * 7000),
  }
}

function auroraBandStyle(band) {
  if (!band) return { opacity: 0 }
  const innerA = Math.min(0.58, band.alpha + 0.14)
  const outerA = band.alpha * 0.52
  return {
    left: `${band.left}%`,
    top: `${band.top}%`,
    width: `${band.w}%`,
    height: `${band.h}%`,
    opacity: String(Math.min(0.95, band.alpha + 0.18)),
    transform: `rotate(${band.rot.toFixed(1)}deg)`,
    animationDuration: `${band.driftMs}ms`,
    background: `radial-gradient(ellipse 120% 96% at 50% 112%, hsla(${band.hue}, ${band.sat}%, ${band.light}%, ${innerA}) 0%, hsla(${band.hue2}, ${band.sat - 8}%, ${band.light - 6}%, ${outerA}) 44%, transparent 74%)`,
  }
}

function clearAuroraShiftTimer() {
  if (auroraShiftTimer) {
    clearInterval(auroraShiftTimer)
    auroraShiftTimer = null
  }
}

function shiftAuroraBands() {
  if (!running.value || !isDarkTheme.value) return
  auroraBands.value = auroraBands.value.map((band) => {
    if (Math.random() < 0.62) return pickAuroraBand()
    return {
      ...band,
      left: Math.max(2, Math.min(56, band.left + (Math.random() - 0.5) * 20)),
      top: Math.max(1, Math.min(AURORA_TOP_MAX, band.top + (Math.random() - 0.5) * 12)),
      rot: band.rot + (Math.random() - 0.5) * 18,
      hue: band.hue + Math.floor((Math.random() - 0.5) * 14),
      light: Math.max(54, Math.min(76, band.light + (Math.random() - 0.5) * 8)),
    }
  })
}

function scheduleAuroraShift() {
  clearAuroraShiftTimer()
  if (!running.value || !isDarkTheme.value) return
  auroraShiftTimer = setInterval(shiftAuroraBands, 2600 + Math.floor(Math.random() * 1400))
}

function startAuroraMotion() {
  stopAuroraMotion()
  if (!isDarkTheme.value) return
  auroraBands.value = Array.from({ length: AURORA_BAND_COUNT }, pickAuroraBand)
  scheduleAuroraShift()
}

function stopAuroraMotion() {
  clearAuroraShiftTimer()
  auroraBands.value = []
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
    running: false,
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
  startAuroraMotion()
  enterImmersiveChrome()
}

function stopTimer({ credit = false } = {}) {
  running.value = false
  if (tickRef.value) {
    clearInterval(tickRef.value)
    tickRef.value = null
  }
  if (credit && sessionStarted.value) creditElapsedFocus()
  persistSession()
  stopFocusAudio()
  stopBgAnimation()
  exitImmersiveChrome()
}

function pause() {
  stopTimer({ credit: true })
}

function reset() {
  stopTimer({ credit: false })
  remaining.value = totalSeconds.value
  elapsed.value = 0
  creditedSeconds.value = 0
  minuteDraft.value = selectedMinutes.value
  persistSession()
}

function completeSession() {
  stopTimer({ credit: false })
  creditElapsedFocus()
  toast.saved()
  remaining.value = selectedMinutes.value * 60
  elapsed.value = 0
  creditedSeconds.value = 0
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
    title: 'Remove sound?',
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

watch(isDarkTheme, (dark) => {
  if (running.value && dark) startAuroraMotion()
  else stopAuroraMotion()
})

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
  clearChromeFadeTimer()
  clearBgShiftTimer()
  stopAuroraMotion()
  stopBgAnimation()
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
  background: radial-gradient(900rpx 640rpx at 50% 8%, rgba(40, 90, 255, 0.07), transparent 62%),
    linear-gradient(180deg, #0e1012, #0a0c0e);
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

.auroraStack {
  position: absolute;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  overflow: hidden;
  opacity: 0;
  transition: opacity 2.2s ease;
  clip-path: inset(0 0 46% 0);
}
.auroraStack.active { opacity: 1; }
.auroraBand {
  position: absolute;
  border-radius: 46% 54% 40% 60%;
  pointer-events: none;
  filter: blur(42px);
  mix-blend-mode: screen;
  will-change: left, top, transform, opacity;
  transition:
    left 7s ease-in-out,
    top 6s ease-in-out,
    transform 8s ease-in-out,
    opacity 5s ease,
    background 6s ease;
  animation: auroraFloat ease-in-out infinite alternate;
}
@keyframes auroraFloat {
  0% {
    translate: 0 0;
    scale: 1;
  }
  100% {
    translate: 24rpx -14rpx;
    scale: 1.05;
  }
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
.t-dark .bgRegion { opacity: 0.78; }
.bgBridge {
  position: absolute;
  pointer-events: none;
  border-radius: 999px;
  opacity: 0.88;
  mix-blend-mode: normal;
}
.t-dark .bgBridge { opacity: 0.62; }
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
  --ring-track: 16rpx;
  --ring-center-r: 166rpx;
  filter: drop-shadow(0 14rpx 36rpx rgba(12, 20, 40, 0.05));
}
.t-dark .ringStack {
  filter: drop-shadow(0 16rpx 40rpx rgba(0, 0, 0, 0.22));
}

.ringPlate {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background:
    radial-gradient(circle at 32% 26%, rgba(255, 255, 255, 0.42), transparent 52%),
    linear-gradient(158deg, rgba(255, 255, 255, 0.28) 0%, rgba(244, 247, 255, 0.06) 48%, rgba(228, 234, 248, 0.14) 100%);
  box-shadow:
    inset 0 2rpx 4rpx rgba(255, 255, 255, 0.55),
    inset 0 -10rpx 28rpx rgba(16, 24, 40, 0.035);
  mask: radial-gradient(closest-side, transparent var(--ring-center-r), #000 calc(var(--ring-center-r) + 1rpx));
  -webkit-mask: radial-gradient(closest-side, transparent var(--ring-center-r), #000 calc(var(--ring-center-r) + 1rpx));
}
.t-dark .ringPlate {
  background:
    radial-gradient(circle at 32% 26%, rgba(255, 255, 255, 0.07), transparent 52%),
    linear-gradient(158deg, rgba(255, 255, 255, 0.05) 0%, rgba(18, 21, 26, 0.02) 48%, rgba(28, 32, 38, 0.12) 100%);
  box-shadow:
    inset 0 1rpx 3rpx rgba(255, 255, 255, 0.08),
    inset 0 -10rpx 28rpx rgba(0, 0, 0, 0.18);
}

.ringBg, .ringFill, .ringGlow, .ringOuterRim, .ringInnerRim {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
}

.ringOuterRim {
  mask: radial-gradient(closest-side, transparent calc(50% - 1rpx), #000 calc(50% - 1rpx), transparent 50%);
  -webkit-mask: radial-gradient(closest-side, transparent calc(50% - 1rpx), #000 calc(50% - 1rpx), transparent 50%);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.28), rgba(16, 24, 40, 0.05));
  opacity: 0.65;
}
.t-dark .ringOuterRim {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.1), rgba(0, 0, 0, 0.22));
  opacity: 0.5;
}

.ringBg {
  mask: radial-gradient(closest-side, transparent calc(50% - var(--ring-track)), #000 calc(50% - var(--ring-track)));
  -webkit-mask: radial-gradient(closest-side, transparent calc(50% - var(--ring-track)), #000 calc(50% - var(--ring-track)));
  opacity: 0.55;
  background:
    conic-gradient(
      from 0deg,
      hsla(222, 11%, 74%, 0.1) 0deg,
      hsla(228, 10%, 72%, 0.06) 180deg,
      hsla(222, 11%, 70%, 0.08) 360deg
    ),
    linear-gradient(165deg, rgba(16, 24, 40, 0.03) 0%, rgba(255, 255, 255, 0.05) 42%, rgba(16, 24, 40, 0.025) 100%);
}
.t-dark .ringBg {
  opacity: 0.5;
  background:
    conic-gradient(
      from 0deg,
      hsla(222, 10%, 50%, 0.14) 0deg,
      hsla(228, 9%, 48%, 0.08) 180deg,
      hsla(222, 10%, 46%, 0.11) 360deg
    ),
    linear-gradient(165deg, rgba(0, 0, 0, 0.12) 0%, rgba(255, 255, 255, 0.03) 42%, rgba(0, 0, 0, 0.08) 100%);
}

.ringInnerRim {
  mask:
    radial-gradient(closest-side, transparent var(--ring-center-r), #000 calc(var(--ring-center-r) + 1rpx), #000 calc(50% - var(--ring-track) - 1rpx), transparent calc(50% - var(--ring-track) + 2rpx));
  -webkit-mask:
    radial-gradient(closest-side, transparent var(--ring-center-r), #000 calc(var(--ring-center-r) + 1rpx), #000 calc(50% - var(--ring-track) - 1rpx), transparent calc(50% - var(--ring-track) + 2rpx));
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.22), rgba(16, 24, 40, 0.03));
  opacity: 0.7;
}
.t-dark .ringInnerRim {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.07), rgba(0, 0, 0, 0.14));
  opacity: 0.55;
}

.ringFill {
  transition: background 500ms linear, opacity 500ms linear, filter 500ms linear;
  mask: radial-gradient(closest-side, transparent calc(50% - var(--ring-track)), #000 calc(50% - var(--ring-track)));
  -webkit-mask: radial-gradient(closest-side, transparent calc(50% - var(--ring-track)), #000 calc(50% - var(--ring-track)));
}
.ringGlow {
  mask: radial-gradient(closest-side, transparent calc(50% - var(--ring-track)), #000 calc(50% - var(--ring-track)));
  -webkit-mask: radial-gradient(closest-side, transparent calc(50% - var(--ring-track)), #000 calc(50% - var(--ring-track)));
  transition: opacity 500ms linear, background 500ms linear;
}

.timeStepRow {
  position: absolute;
  left: 50%;
  top: 50%;
  z-index: 4;
  width: 520rpx;
  margin-left: -260rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
  pointer-events: none;
  transform: translateY(-50%);
}
.timeStepBtn {
  pointer-events: auto;
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.82);
  border: 1rpx solid rgba(46, 99, 255, 0.12);
  box-shadow: 0 8rpx 24rpx rgba(46, 99, 255, 0.12);
  transition: transform 150ms ease, background 180ms ease;
}
.t-dark .timeStepBtn {
  background: rgba(26, 29, 33, 0.88);
  border-color: rgba(120, 160, 255, 0.18);
  box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.28);
}
.timeStepBtn:active { transform: scale(0.92); background: rgba(46, 99, 255, 0.1); }
.timeStepGlyph {
  font-size: 34rpx;
  font-weight: 300;
  line-height: 1;
  color: rgba(46, 99, 255, 0.92);
}
.t-dark .timeStepGlyph { color: rgba(170, 200, 255, 0.92); }

.centerCol {
  position: relative;
  z-index: 3;
  width: calc(var(--ring-center-r, 166rpx) * 2);
  height: calc(var(--ring-center-r, 166rpx) * 2);
  border-radius: 50%;
  background: linear-gradient(152deg, rgba(255, 255, 255, 0.58) 0%, rgba(255, 255, 255, 0.42) 52%, rgba(248, 250, 255, 0.48) 100%);
  backdrop-filter: blur(24px) saturate(1.06);
  -webkit-backdrop-filter: blur(24px) saturate(1.06);
  border: 1rpx solid rgba(255, 255, 255, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 12rpx 36rpx rgba(12, 20, 40, 0.04),
    0 1rpx 6rpx rgba(255, 255, 255, 0.35) inset,
    0 -2rpx 8rpx rgba(16, 24, 40, 0.02) inset;
}
.t-dark .centerCol {
  background: linear-gradient(152deg, rgba(36, 40, 46, 0.58) 0%, rgba(24, 27, 32, 0.48) 52%, rgba(30, 34, 40, 0.52) 100%);
  border-color: rgba(255, 255, 255, 0.07);
  box-shadow:
    0 14rpx 40rpx rgba(0, 0, 0, 0.2),
    0 1rpx 5rpx rgba(255, 255, 255, 0.04) inset,
    0 -3rpx 10rpx rgba(0, 0, 0, 0.14) inset;
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
  z-index: 4;
  width: 88rpx;
  height: 88rpx;
  margin-left: -44rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(168deg, #6898ff 0%, #2e63ff 58%, #2454e8 100%);
  border: 1rpx solid rgba(255, 255, 255, 0.22);
  box-shadow:
    0 12rpx 32rpx rgba(46, 99, 255, 0.24),
    0 2rpx 6rpx rgba(255, 255, 255, 0.28) inset;
  transition: transform 180ms ease, background 220ms ease, box-shadow 220ms ease;
}
.playOrb.pause {
  background: linear-gradient(168deg, rgba(36, 42, 54, 0.96) 0%, rgba(16, 24, 40, 0.92) 100%);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow:
    0 10rpx 28rpx rgba(16, 24, 40, 0.22),
    0 1rpx 4rpx rgba(255, 255, 255, 0.06) inset;
}
.t-dark .playOrb.pause {
  background: linear-gradient(168deg, rgba(52, 56, 64, 0.94) 0%, rgba(28, 32, 38, 0.9) 100%);
  box-shadow:
    0 10rpx 28rpx rgba(0, 0, 0, 0.32),
    0 1rpx 4rpx rgba(255, 255, 255, 0.05) inset;
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
