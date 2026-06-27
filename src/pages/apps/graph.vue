<template>
  <view class="page" :class="themeClass">
    <view class="graphCanvas">
      <view class="bg" />

      <view class="shell">
        <view
          id="graphPlotViewport"
          class="plotViewport"
          @touchstart="onTouchStart"
          @touchmove.stop.prevent="onTouchMove"
          @touchend="onTouchEnd"
          @touchcancel="onTouchEnd"
          <!-- #ifdef H5 -->
          @wheel.prevent="onWheel"
          @mousedown="onMouseDown"
          @mousemove="onMouseMove"
          @mouseup="onMouseUp"
          @mouseleave="onMouseUp"
          <!-- #endif -->
        >
          <view v-once class="plotCanvasWrap">
            <canvas
              id="graphPlotCanvas"
              canvas-id="graphPlotCanvas"
              type="2d"
              class="plotCanvas"
            />
          </view>
          <view v-if="panelCollapsed" class="zoomHint" aria-hidden="true">
            <text class="zoomHintText">Scroll / pinch · drag to pan</text>
          </view>
        </view>

        <view class="inputDock" :class="{ collapsed: panelCollapsed }">
          <view class="curveTabRow">
            <view
              v-for="(curve, index) in curves"
              :key="index"
              class="curveTab tap"
              :class="{ on: curve.expanded, hasExpr: !!curve.text.trim() }"
              role="button"
              @tap="onCurveTab(index)"
            >
              <view class="curveTabDot" :style="{ background: curveColor(index) }" />
              <text class="curveTabLabel">C{{ index + 1 }}</text>
              <text v-if="curve.text.trim()" class="curveTabExpr">{{ curvePreview(curve.text) }}</text>
              <text v-else class="curveTabExpr empty">tap to edit</text>
            </view>
          </view>

          <view class="dockHandle tap" role="button" @tap="onTogglePanel">
            <view class="handleBar" aria-hidden="true" />
            <text class="handleHint">{{ panelCollapsed ? 'Expand keyboard' : 'Hide keyboard' }}</text>
          </view>

          <scroll-view
            v-if="expandedCurveIndex >= 0 && !panelCollapsed"
            class="dockEditorScroll"
            scroll-y
            :show-scrollbar="false"
          >
            <view class="dockEditor">
              <view class="displayPanel">
                <view class="displayCap" aria-hidden="true" />
                <view class="displayInner">
                  <view class="curveTitleRow">
                    <view class="curveDot" :style="{ background: curveColor(expandedCurveIndex) }" />
                    <text class="curveTitle">Curve {{ expandedCurveIndex + 1 }}</text>
                  </view>

                  <view class="exprEditor" @tap="focusExpr">
                    <view v-if="!activeCurveText" class="exprPlaceholder">y = f(x) · x² + y² = 1</view>
                    <view v-else class="exprRow">
                      <view class="cursorHit tap" @tap.stop="setExprCursor(0)">
                        <view v-if="activeField === 'expr' && activeCurveCursor === 0" class="caret" aria-hidden="true" />
                      </view>
                      <template v-for="(ch, index) in exprChars" :key="'e-' + index">
                        <text
                          class="exprChar tap"
                          :class="{ fracBar: ch === '⁄' }"
                          @tap.stop="setExprCursor(index + 1)"
                        >{{ ch }}</text>
                        <view class="cursorHit tap" @tap.stop="setExprCursor(index + 1)">
                          <view v-if="activeField === 'expr' && activeCurveCursor === index + 1" class="caret" aria-hidden="true" />
                        </view>
                      </template>
                    </view>
                  </view>

                  <text v-if="activeCurveError" class="statusLine error">{{ activeCurveError }}</text>

                  <view class="toolbar">
                    <view class="toolBtn tap" role="button" @tap="setExprCursor(Math.max(0, activeCurveCursor - 1))">
                      <text class="toolLabel">◀</text>
                    </view>
                    <view class="toolBtn tap" role="button" @tap="setExprCursor(Math.min(activeCurveText.length, activeCurveCursor + 1))">
                      <text class="toolLabel">▶</text>
                    </view>
                    <view class="toolBtn tap" :class="{ on: sciOpen }" role="button" @tap="sciOpen = !sciOpen">
                      <text class="toolLabel">f(x)</text>
                    </view>
                  </view>
                </view>
              </view>

              <view v-if="sciOpen" class="sciPanel">
                <view v-for="key in sciKeys" :key="key.id" class="key sci tap" role="button" @tap="onKey(key)">
                  <text class="keyLabel">{{ key.label }}</text>
                </view>
              </view>

              <view class="keypad">
                <view
                  v-for="key in basicKeys"
                  :key="key.id"
                  class="key tap"
                  :class="key.kind"
                  :style="keyStyle(key)"
                  role="button"
                  @tap="onKey(key)"
                >
                  <text class="keyLabel">{{ key.label }}</text>
                </view>
              </view>
            </view>
          </scroll-view>
        </view>
      </view>
    </view>

    <view class="graphChrome headerWrap">
      <AppHeader nav-mode="back" />
    </view>

    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import { useGraphSession } from '@/composables/useGraphSession'
import { useTheme } from '@/composables/useTheme'
import {
  CURVE_COLORS,
  GRAPH_INSERTS,
  deleteBefore,
  estimateSpecsExtent,
  insertAt,
  mathToScreen,
  parseGraphInput,
  resolveExplicitSteps,
  resolveImplicitGrid,
  resolveZoomLimits,
  sampleExplicitX,
  sampleExplicitY,
  sampleImplicit,
  screenToMath,
  viewBoundsFromCamera,
} from '@/lib/graphPlotter'

const { themeClass, isDark } = useTheme()
const instance = getCurrentInstance()
const {
  curves,
  activeCurve,
  panelCollapsed,
  sciOpen,
  activeField,
  setCurveDraft,
  toggleCurve,
  togglePanel,
} = useGraphSession()

const centerX = ref(0)
const centerY = ref(0)
const scale = ref(40)
const zoomMin = ref(4)
const zoomMax = ref(800)

let canvasNode = null
let ctx = null
let canvasW = 0
let canvasH = 0
let dpr = 1
let canvasReady = false
let drawPending = false
let drawNeedsReinit = false
let drawAgain = false
let resizeObserver = null
const plotLayers = ref([])
let viewportRect = { left: 0, top: 0, width: 0, height: 0 }

const panState = { active: false, lastX: 0, lastY: 0 }
const pinchState = { active: false, startDist: 0 }

const sciKeys = [
  { id: 'sin', label: 'sin', insert: 'sin' },
  { id: 'cos', label: 'cos', insert: 'cos' },
  { id: 'tan', label: 'tan', insert: 'tan' },
  { id: 'log', label: 'log', insert: 'log' },
  { id: 'ln', label: 'ln', insert: 'ln' },
  { id: 'square', label: 'x²', insert: 'square' },
  { id: 'sqrt', label: '√', insert: 'sqrt' },
  { id: 'pi', label: 'π', insert: 'pi' },
  { id: 'e', label: 'e', insert: 'e' },
]

const basicKeys = [
  { id: 'clear', label: 'C', kind: 'func', action: 'clear' },
  { id: 'back', label: '⌫', kind: 'func', action: 'backspace' },
  { id: 'x', label: 'x', kind: 'var', insert: 'x' },
  { id: 'y', label: 'y', kind: 'var', insert: 'y' },
  { id: 'lparen', label: '(', kind: 'func', insert: 'lparen' },
  { id: 'rparen', label: ')', kind: 'func', insert: 'rparen' },
  { id: 'power', label: '^', kind: 'var', insert: 'power' },
  { id: 'eq', label: '=', kind: 'op', insert: 'eq' },
  { id: '7', label: '7', kind: 'num', action: 'digit', value: '7' },
  { id: '8', label: '8', kind: 'num', action: 'digit', value: '8' },
  { id: '9', label: '9', kind: 'num', action: 'digit', value: '9' },
  { id: 'divide', label: '÷', kind: 'op', insert: 'divide' },
  { id: '4', label: '4', kind: 'num', action: 'digit', value: '4' },
  { id: '5', label: '5', kind: 'num', action: 'digit', value: '5' },
  { id: '6', label: '6', kind: 'num', action: 'digit', value: '6' },
  { id: 'multiply', label: '×', kind: 'op', insert: 'multiply' },
  { id: '1', label: '1', kind: 'num', action: 'digit', value: '1' },
  { id: '2', label: '2', kind: 'num', action: 'digit', value: '2' },
  { id: '3', label: '3', kind: 'num', action: 'digit', value: '3' },
  { id: 'minus', label: '−', kind: 'op', insert: 'minus' },
  { id: '0', label: '0', kind: 'num wide', action: 'digit', value: '0' },
  { id: 'dot', label: '.', kind: 'num', insert: 'dot' },
  { id: 'plus', label: '+', kind: 'op', insert: 'plus' },
  { id: 'plot', label: 'Plot all', kind: 'eq tall', action: 'plot', placement: { gridColumn: '1 / -1' } },
]

const expandedCurveIndex = computed(() => curves.value.findIndex((c) => c.expanded))

const activeCurveText = computed(() => {
  const i = activeCurve.value
  return curves.value[i]?.text || ''
})

const activeCurveCursor = computed(() => curves.value[activeCurve.value]?.cursor ?? 0)

const activeCurveError = computed(() => curves.value[activeCurve.value]?.error || '')

const exprChars = computed(() => [...(activeCurveText.value || '')].map((ch) => (ch === '/' ? '⁄' : ch)))

function curveColor(index) {
  const c = CURVE_COLORS[index] || CURVE_COLORS[0]
  return isDark.value ? c.dark : c.light
}

function curvePreview(text) {
  const t = String(text || '').trim()
  if (t.length <= 10) return t
  return `${t.slice(0, 9)}…`
}

function keyStyle(key) {
  if (!key.placement) return {}
  const style = {}
  if (key.placement.gridColumn != null) style.gridColumn = key.placement.gridColumn
  if (key.placement.gridRow != null) style.gridRow = key.placement.gridRow
  return style
}

function focusExpr() {
  activeField.value = 'expr'
}

function setExprCursor(index) {
  activeField.value = 'expr'
  const curve = curves.value[activeCurve.value]
  if (curve) curve.cursor = index
}

function onTogglePanel() {
  togglePanel()
  nextTick(() => scheduleDraw(true))
}

function onCurveTab(index) {
  toggleCurve(index)
  nextTick(() => scheduleDraw(true))
}

function insertToActive(specKey) {
  const spec = GRAPH_INSERTS[specKey]
  if (!spec) return
  const i = activeCurve.value
  const text = curves.value[i]?.text || ''
  const cursor = curves.value[i]?.cursor ?? 0
  const next = insertAt(text, cursor, spec.text, spec.cursor)
  setCurveDraft(i, next.text, next.cursor)
}

function onKey(key) {
  if (key.action === 'clear') {
    setCurveDraft(activeCurve.value, '', 0)
    plotAll()
    return
  }

  if (key.action === 'backspace') {
    const i = activeCurve.value
    const next = deleteBefore(curves.value[i].text, curves.value[i].cursor)
    setCurveDraft(i, next.text, next.cursor)
    return
  }

  if (key.action === 'plot') {
    plotAll()
    return
  }

  if (key.insert) {
    insertToActive(key.insert)
    return
  }

  if (key.action === 'digit') {
    const i = activeCurve.value
    const next = insertAt(curves.value[i].text, curves.value[i].cursor, key.value, 1)
    setCurveDraft(i, next.text, next.cursor)
  }
}

function updateZoomLimits() {
  const specs = plotLayers.value.map((l) => l.spec).filter(Boolean)
  if (!specs.length || !canvasW || !canvasH) {
    zoomMin.value = 2
    zoomMax.value = 2400
    return
  }
  const extent = estimateSpecsExtent(specs, 'rad')
  const limits = resolveZoomLimits(extent, canvasW, canvasH)
  zoomMin.value = limits.minScale
  zoomMax.value = limits.maxScale
}

function plotAll() {
  const layers = []
  curves.value.forEach((curve, index) => {
    curve.error = ''
    const trimmed = curve.text.trim()
    if (!trimmed) return
    const parsed = parseGraphInput(trimmed, 'rad')
    if (!parsed.ok) {
      curve.error = parsed.error
      return
    }
    layers.push({ index, spec: parsed.spec, label: parsed.spec.label })
  })
  plotLayers.value = layers
  updateZoomLimits()
  scale.value = Math.min(zoomMax.value, Math.max(zoomMin.value, scale.value))
  flushDraw()
}

function applyCanvasSize(width, height) {
  if (!canvasNode || !ctx) return false
  if (width < 2 || height < 2) return false
  const nextW = Math.floor(width)
  const nextH = Math.floor(height)
  if (nextW === canvasW && nextH === canvasH) return false
  canvasW = nextW
  canvasH = nextH
  canvasNode.width = Math.floor(canvasW * dpr)
  canvasNode.height = Math.floor(canvasH * dpr)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  canvasReady = true
  return true
}

function updateViewportRect() {
  return new Promise((resolve) => {
    uni.createSelectorQuery()
      .in(instance?.proxy)
      .select('#graphPlotViewport')
      .boundingClientRect()
      .exec((res) => {
        const rect = res?.[0]
        if (rect?.width > 0 && rect?.height > 0) viewportRect = rect
        resolve(viewportRect)
      })
  })
}

function initCanvas() {
  return new Promise((resolve) => {
    uni.createSelectorQuery()
      .in(instance?.proxy)
      .select('#graphPlotCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        const info = res?.[0]
        if (!info?.node) {
          resolve(false)
          return
        }
        if (!canvasNode) {
          canvasNode = info.node
          ctx = canvasNode.getContext('2d')
          dpr = uni.getSystemInfoSync().pixelRatio || 1
        }
        resolve(applyCanvasSize(info.width, info.height) || canvasReady)
      })
  })
}

function flushDraw() {
  if (drawPending) {
    drawAgain = true
    return
  }
  drawPending = true
  requestAnimationFrame(() => {
    drawPending = false
    draw()
    if (drawAgain) {
      drawAgain = false
      flushDraw()
    }
  })
}

function scheduleDraw(forceReinit = false) {
  if (forceReinit) drawNeedsReinit = true
  if (drawPending) {
    drawAgain = true
    return
  }
  drawPending = true
  requestAnimationFrame(async () => {
    const reinit = drawNeedsReinit
    drawNeedsReinit = false
    drawPending = false
    if (reinit || !canvasReady) {
      await updateViewportRect()
      const resized = await initCanvas()
      if (resized) updateZoomLimits()
    }
    draw()
    if (drawAgain) {
      drawAgain = false
      flushDraw()
    }
  })
}

function gridColor() {
  return isDark.value ? 'rgba(255, 255, 255, 0.10)' : 'rgba(16, 24, 40, 0.10)'
}

function axisColor() {
  return isDark.value ? 'rgba(255, 255, 255, 0.52)' : 'rgba(16, 24, 40, 0.52)'
}

function axisAccentColor() {
  return isDark.value ? 'rgba(170, 200, 255, 0.88)' : 'rgba(46, 99, 255, 0.88)'
}

function bgFill() {
  return isDark.value ? 'rgba(18, 20, 24, 0.72)' : 'rgba(255, 255, 255, 0.72)'
}

function drawGrid(bounds) {
  const step = pickGridStep(Math.min(
    (bounds.xmax - bounds.xmin) / 8,
    (bounds.ymax - bounds.ymin) / 8,
  ))

  ctx.strokeStyle = gridColor()
  ctx.lineWidth = 1
  ctx.beginPath()

  const xStart = Math.ceil(bounds.xmin / step) * step
  for (let x = xStart; x <= bounds.xmax; x += step) {
    const { sx } = mathToScreen(x, 0, centerX.value, centerY.value, scale.value, canvasW, canvasH)
    ctx.moveTo(sx, 0)
    ctx.lineTo(sx, canvasH)
  }

  const yStart = Math.ceil(bounds.ymin / step) * step
  for (let y = yStart; y <= bounds.ymax; y += step) {
    const { sy } = mathToScreen(0, y, centerX.value, centerY.value, scale.value, canvasW, canvasH)
    ctx.moveTo(0, sy)
    ctx.lineTo(canvasW, sy)
  }
  ctx.stroke()

  if (bounds.xmin <= 0 && bounds.xmax >= 0) {
    const x0 = mathToScreen(0, 0, centerX.value, centerY.value, scale.value, canvasW, canvasH)
    ctx.strokeStyle = axisAccentColor()
    ctx.lineWidth = 2.8
    ctx.beginPath()
    ctx.moveTo(x0.sx, 0)
    ctx.lineTo(x0.sx, canvasH)
    ctx.stroke()
  }

  if (bounds.ymin <= 0 && bounds.ymax >= 0) {
    const y0 = mathToScreen(0, 0, centerX.value, centerY.value, scale.value, canvasW, canvasH)
    ctx.strokeStyle = axisAccentColor()
    ctx.lineWidth = 2.8
    ctx.beginPath()
    ctx.moveTo(0, y0.sy)
    ctx.lineTo(canvasW, y0.sy)
    ctx.stroke()
  }
}

function pickGridStep(rough) {
  const pow = 10 ** Math.floor(Math.log10(Math.max(rough, 1e-6)))
  const norm = rough / pow
  if (norm <= 1) return pow
  if (norm <= 2) return 2 * pow
  if (norm <= 5) return 5 * pow
  return 10 * pow
}

function drawPolyline(points, color) {
  if (!points.length) return
  ctx.strokeStyle = color
  ctx.beginPath()
  const first = mathToScreen(points[0].x, points[0].y, centerX.value, centerY.value, scale.value, canvasW, canvasH)
  ctx.moveTo(first.sx, first.sy)
  for (let i = 1; i < points.length; i += 1) {
    const { sx, sy } = mathToScreen(points[i].x, points[i].y, centerX.value, centerY.value, scale.value, canvasW, canvasH)
    ctx.lineTo(sx, sy)
  }
  ctx.stroke()
}

function drawCurvePoints(points, color) {
  ctx.lineWidth = 2.4
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  let run = []
  for (const p of points) {
    if (!p) {
      drawPolyline(run, color)
      run = []
      continue
    }
    run.push(p)
  }
  drawPolyline(run, color)
}

function drawPolylines(polylines, color) {
  ctx.lineWidth = 2.4
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  for (const chain of polylines) {
    if (Array.isArray(chain[0])) {
      for (const [a, b] of chain) drawPolyline([a, b], color)
    } else {
      drawPolyline(chain, color)
    }
  }
}

function drawSpec(spec, color, bounds) {
  if (spec.mode === 'implicit') {
    const { cols, rows } = resolveImplicitGrid(canvasW, canvasH, bounds)
    drawPolylines(sampleImplicit(spec.fn, bounds, cols, rows, 'rad'), color)
    return
  }
  const steps = resolveExplicitSteps(canvasW, canvasH, bounds)
  if (spec.mode === 'explicit-y') {
    drawCurvePoints(sampleExplicitY(spec.fn, bounds, steps, 'rad'), color)
    return
  }
  drawCurvePoints(sampleExplicitX(spec.fn, bounds, steps, 'rad'), color)
}

function draw() {
  if (!ctx || !canvasW || !canvasH) return
  ctx.clearRect(0, 0, canvasW, canvasH)
  ctx.fillStyle = bgFill()
  ctx.fillRect(0, 0, canvasW, canvasH)

  const bounds = viewBoundsFromCamera(centerX.value, centerY.value, scale.value, canvasW, canvasH)
  drawGrid(bounds)

  for (const layer of plotLayers.value) {
    drawSpec(layer.spec, curveColor(layer.index), bounds)
  }
}

function zoomAt(screenX, screenY, factor) {
  const sx = Math.max(0, Math.min(canvasW, screenX))
  const sy = Math.max(0, Math.min(canvasH, screenY))
  const before = screenToMath(sx, sy, centerX.value, centerY.value, scale.value, canvasW, canvasH)
  scale.value = Math.min(zoomMax.value, Math.max(zoomMin.value, scale.value * factor))
  const after = screenToMath(sx, sy, centerX.value, centerY.value, scale.value, canvasW, canvasH)
  centerX.value += before.x - after.x
  centerY.value += before.y - after.y
  flushDraw()
}

function localFromTouch(t) {
  const p = { x: t.x ?? t.clientX ?? t.pageX ?? 0, y: t.y ?? t.clientY ?? t.pageY ?? 0 }
  if (typeof t.x === 'number' && typeof t.y === 'number') {
    return { x: Math.max(0, Math.min(canvasW, t.x)), y: Math.max(0, Math.min(canvasH, t.y)) }
  }
  return {
    x: Math.max(0, Math.min(canvasW, p.x - viewportRect.left)),
    y: Math.max(0, Math.min(canvasH, p.y - viewportRect.top)),
  }
}

function touchDist(t1, t2) {
  const p1 = localFromTouch(t1)
  const p2 = localFromTouch(t2)
  return Math.hypot(p1.x - p2.x, p1.y - p2.y)
}

function touchMid(t1, t2) {
  const p1 = localFromTouch(t1)
  const p2 = localFromTouch(t2)
  return { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 }
}

function onTouchStart(e) {
  updateViewportRect()
  const touches = e.touches || e.changedTouches
  if (touches.length >= 2) {
    pinchState.active = true
    pinchState.startDist = touchDist(touches[0], touches[1])
    panState.active = false
    return
  }
  const p = localFromTouch(touches[0])
  panState.active = true
  panState.lastX = p.x
  panState.lastY = p.y
}

function onTouchMove(e) {
  const touches = e.touches
  if (pinchState.active && touches.length >= 2) {
    const dist = touchDist(touches[0], touches[1])
    if (pinchState.startDist > 0) {
      zoomAt(touchMid(touches[0], touches[1]).x, touchMid(touches[0], touches[1]).y, dist / pinchState.startDist)
      pinchState.startDist = dist
    }
    return
  }
  if (!panState.active || !touches?.length) return
  const p = localFromTouch(touches[0])
  centerX.value -= (p.x - panState.lastX) / scale.value
  centerY.value += (p.y - panState.lastY) / scale.value
  panState.lastX = p.x
  panState.lastY = p.y
  flushDraw()
}

function onTouchEnd(e) {
  const touches = e.touches
  if (!touches || touches.length < 2) pinchState.active = false
  if (!touches || touches.length === 0) panState.active = false
}

// #ifdef H5
function onWheel(e) {
  const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12
  const rect = e.currentTarget?.getBoundingClientRect?.()
  zoomAt(rect ? e.clientX - rect.left : e.offsetX, rect ? e.clientY - rect.top : e.offsetY, factor)
}

function onMouseDown(e) {
  panState.active = true
  panState.lastX = e.clientX
  panState.lastY = e.clientY
}

function onMouseMove(e) {
  if (!panState.active) return
  centerX.value -= (e.clientX - panState.lastX) / scale.value
  centerY.value += (e.clientY - panState.lastY) / scale.value
  panState.lastX = e.clientX
  panState.lastY = e.clientY
  flushDraw()
}

function onMouseUp() {
  panState.active = false
}

function bindResizeObserver() {
  if (typeof ResizeObserver === 'undefined') return
  const el = document.getElementById('graphPlotViewport')
  if (!el) return
  resizeObserver = new ResizeObserver(() => {
    scheduleDraw(true)
  })
  resizeObserver.observe(el)
}
// #endif

function bindWindowResize() {
  uni.onWindowResize?.(() => scheduleDraw(true))
}

onMounted(async () => {
  await nextTick()
  await updateViewportRect()
  await initCanvas()
  plotAll()
  // #ifdef H5
  await nextTick()
  bindResizeObserver()
  // #endif
  bindWindowResize()
})

watch(isDark, () => scheduleDraw())
watch(panelCollapsed, () => nextTick(() => scheduleDraw(true)))

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
})
</script>

<style scoped>
.page { height: 100vh; height: 100dvh; position: relative; overflow: hidden; }
.page.t-dark { background: #0a0c0e; }
.graphCanvas { position: absolute; inset: 0; z-index: 0; display: flex; flex-direction: column; overflow: hidden; }
.bg {
  position: absolute; inset: 0; z-index: 0;
  background: radial-gradient(900rpx 640rpx at 50% 8%, rgba(46, 99, 255, 0.12), transparent 62%), linear-gradient(180deg, #f8faff, #eef1f7);
}
.t-dark .bg {
  background: radial-gradient(900rpx 640rpx at 50% 8%, rgba(60, 120, 255, 0.14), transparent 58%), linear-gradient(180deg, #111315, #0e1014);
}
.headerWrap { position: relative; z-index: 2; }
.shell {
  position: relative; z-index: 1; flex: 1; min-height: 0; display: flex; flex-direction: column;
  padding: calc(var(--shell-header-offset, 148rpx) + 12rpx) 24rpx calc(12rpx + env(safe-area-inset-bottom));
  gap: 10rpx; box-sizing: border-box; overflow: hidden;
}
.plotViewport {
  position: relative; flex: 1; min-height: 0; border-radius: 28rpx; overflow: hidden;
  border: 1rpx solid rgba(46, 99, 255, 0.16); background: rgba(255, 255, 255, 0.42); touch-action: none;
}
.t-dark .plotViewport { border-color: rgba(120, 160, 255, 0.22); background: rgba(255, 255, 255, 0.03); }
.plotCanvasWrap, .plotCanvas { width: 100%; height: 100%; display: block; }
.zoomHint {
  position: absolute; left: 16rpx; bottom: 14rpx; padding: 6rpx 12rpx; border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.06); pointer-events: none;
}
.zoomHintText { font-size: 18rpx; color: rgba(16, 24, 40, 0.42); }
.t-dark .zoomHintText { color: rgba(245, 247, 255, 0.38); }

.inputDock {
  flex: 0 0 auto; min-height: 0; max-height: 52vh; display: flex; flex-direction: column; gap: 8rpx;
  min-width: 0; position: relative; z-index: 2;
}
.inputDock.collapsed .dockEditorScroll { display: none; }
.dockEditorScroll { flex: 1; min-height: 0; max-height: 42vh; }
.dockHandle {
  display: flex; flex-direction: column; align-items: center; gap: 4rpx; padding: 8rpx 12rpx 4rpx;
  border-radius: 20rpx; background: rgba(255, 255, 255, 0.38); border: 1rpx solid rgba(46, 99, 255, 0.12);
}
.t-dark .dockHandle { background: rgba(255, 255, 255, 0.04); border-color: rgba(120, 160, 255, 0.16); }
.handleBar { width: 56rpx; height: 6rpx; border-radius: 999rpx; background: rgba(142, 142, 147, 0.35); }
.handleHint { font-size: 18rpx; color: rgba(16, 24, 40, 0.36); }
.t-dark .handleHint { color: rgba(245, 247, 255, 0.32); }

.dockEditor { display: flex; flex-direction: column; gap: 10rpx; }

.curveTabRow { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8rpx; flex-shrink: 0; }
.curveTab {
  display: flex; flex-direction: column; align-items: center; gap: 4rpx; padding: 12rpx 8rpx;
  border-radius: 20rpx; background: rgba(255, 255, 255, 0.72); border: 1rpx solid rgba(142, 142, 147, 0.14);
  min-width: 0; min-height: 96rpx; box-sizing: border-box;
}
.t-dark .curveTab { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.08); }
.curveTab.on { background: rgba(46, 99, 255, 0.10); border-color: rgba(46, 99, 255, 0.28); }
.t-dark .curveTab.on { background: rgba(120, 160, 255, 0.14); border-color: rgba(120, 160, 255, 0.28); }
.curveTabDot { width: 14rpx; height: 14rpx; border-radius: 50%; flex-shrink: 0; }
.curveTabLabel { font-size: 22rpx; font-weight: 680; color: rgba(16, 24, 40, 0.82); }
.t-dark .curveTabLabel { color: rgba(245, 247, 255, 0.82); }
.curveTabExpr {
  font-size: 16rpx; color: rgba(16, 24, 40, 0.42); max-width: 100%; overflow: hidden;
  text-overflow: ellipsis; white-space: nowrap;
}
.curveTabExpr.empty { color: rgba(16, 24, 40, 0.28); font-size: 14rpx; }
.t-dark .curveTabExpr { color: rgba(245, 247, 255, 0.38); }
.t-dark .curveTabExpr.empty { color: rgba(245, 247, 255, 0.24); }

.displayPanel { position: relative; width: 100%; border-radius: 32rpx; overflow: hidden; flex-shrink: 0; }
.displayCap {
  position: absolute; inset: 0; border-radius: 32rpx; backdrop-filter: blur(12px);
  background: radial-gradient(circle at 38% 32%, rgba(248, 250, 255, 0.42) 0%, rgba(238, 241, 247, 0.22) 100%);
  border: 1rpx solid rgba(16, 24, 40, 0.05);
}
.t-dark .displayCap {
  background: radial-gradient(circle at 38% 32%, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
  border-color: rgba(255, 255, 255, 0.06);
}
.displayInner { position: relative; z-index: 1; padding: 14rpx 18rpx 12rpx; display: flex; flex-direction: column; gap: 8rpx; }
.curveTitleRow { display: flex; align-items: center; gap: 8rpx; }
.curveDot { width: 16rpx; height: 16rpx; border-radius: 50%; }
.curveTitle { font-size: 20rpx; font-weight: 640; color: rgba(16, 24, 40, 0.55); }
.t-dark .curveTitle { color: rgba(245, 247, 255, 0.48); }
.exprEditor { min-height: 52rpx; display: flex; align-items: flex-end; justify-content: flex-end; width: 100%; }
.exprPlaceholder { font-size: 26rpx; color: rgba(16, 24, 40, 0.36); text-align: right; width: 100%; }
.exprRow { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; width: 100%; min-height: 44rpx; }
.exprChar { font-size: 34rpx; font-weight: 300; color: rgba(16, 24, 40, 0.94); }
.exprChar.fracBar { color: rgba(46, 99, 255, 0.88); font-weight: 520; }
.t-dark .exprChar { color: rgba(245, 247, 255, 0.94); }
.cursorHit { min-width: 4rpx; min-height: 40rpx; display: flex; align-items: center; justify-content: center; }
.caret { width: 3rpx; height: 34rpx; border-radius: 999rpx; background: rgba(46, 99, 255, 0.92); animation: blink 1.1s step-end infinite; }
.caret.small { height: 26rpx; }
@keyframes blink { 50% { opacity: 0; } }
.statusLine { font-size: 20rpx; text-align: right; }
.statusLine.error { color: rgba(255, 69, 58, 0.92); }

.toolbar { display: flex; justify-content: flex-end; gap: 8rpx; }
.toolBtn { min-width: 56rpx; height: 44rpx; padding: 0 14rpx; border-radius: 999rpx; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.42); border: 1rpx solid rgba(142, 142, 147, 0.12); }
.toolBtn.on { background: rgba(46, 99, 255, 0.14); border-color: rgba(46, 99, 255, 0.22); }
.toolLabel { font-size: 18rpx; font-weight: 620; color: rgba(60, 60, 67, 0.62); }
.toolBtn.on .toolLabel { color: rgba(46, 99, 255, 0.96); }

.sciPanel { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8rpx; flex-shrink: 0; }
.keypad { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10rpx; flex-shrink: 0; }
.key {
  height: 88rpx;
  border-radius: 22rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.72);
  border: 1rpx solid rgba(142, 142, 147, 0.14);
  transition: transform 150ms ease, background 180ms ease;
}
.key.sci { height: 64rpx; border-radius: 16rpx; background: rgba(255, 255, 255, 0.5); }
.key.var { background: rgba(46, 99, 255, 0.08); border-color: rgba(46, 99, 255, 0.16); }
.t-dark .key { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.08); }
.t-dark .key.sci { background: rgba(255, 255, 255, 0.05); }
.t-dark .key.var { background: rgba(120, 160, 255, 0.12); border-color: rgba(120, 160, 255, 0.18); }
.key:active { transform: scale(0.94); background: rgba(142, 142, 147, 0.12); }
.key.num .keyLabel { font-size: 34rpx; font-weight: 420; color: rgba(16, 24, 40, 0.92); }
.t-dark .key.num .keyLabel { color: rgba(245, 247, 255, 0.92); }
.key.func { background: rgba(255, 255, 255, 0.42); }
.t-dark .key.func { background: rgba(255, 255, 255, 0.04); }
.key.func .keyLabel { font-size: 26rpx; font-weight: 560; color: rgba(60, 60, 67, 0.72); }
.t-dark .key.func .keyLabel { color: rgba(245, 247, 255, 0.58); }
.key.var .keyLabel { font-size: 28rpx; font-weight: 560; color: rgba(46, 99, 255, 0.92); }
.t-dark .key.var .keyLabel { color: rgba(170, 200, 255, 0.96); }
.key.sci .keyLabel { font-size: 22rpx; font-weight: 560; color: rgba(46, 99, 255, 0.88); }
.t-dark .key.sci .keyLabel { color: rgba(170, 200, 255, 0.9); }
.key.op,
.key.eq { background: rgba(46, 99, 255, 0.12); border-color: rgba(46, 99, 255, 0.18); }
.t-dark .key.op,
.t-dark .key.eq { background: rgba(120, 160, 255, 0.16); border-color: rgba(120, 160, 255, 0.22); }
.key.op .keyLabel,
.key.eq .keyLabel { font-size: 34rpx; font-weight: 520; color: rgba(46, 99, 255, 0.96); }
.t-dark .key.op .keyLabel,
.t-dark .key.eq .keyLabel { color: rgba(170, 200, 255, 0.96); }
.key.eq { background: #007aff; border-color: transparent; }
.key.eq.tall { height: auto; min-height: 104rpx; align-self: stretch; }
.key.eq .keyLabel { color: #fff; font-weight: 600; }
.key.eq.tall .keyLabel { font-size: 42rpx; }
.key.wide { grid-column: span 2; }
</style>
