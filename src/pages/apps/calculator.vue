<template>
  <view class="page" :class="themeClass">
    <view class="calcCanvas">
      <view class="bg" />

      <view class="shell">
        <view class="displayPanel">
          <view class="displayCap" aria-hidden="true" />
          <view class="displayInner">
            <scroll-view
              v-if="history.length"
              class="historyScroll"
              scroll-y
              :show-scrollbar="false"
            >
              <view
                v-for="item in history.slice(0, 6)"
                :key="item.id"
                class="historyItem tap"
                role="button"
                @tap="loadHistory(item)"
              >
                <text v-if="item.expression" class="historyExpr">{{ item.expression }} = {{ item.result }}</text>
                <text v-else class="historyResult">= {{ item.result }}</text>
              </view>
            </scroll-view>

            <view v-if="draftText" class="exprEditor">
              <view class="exprRow">
                <view class="cursorHit tap" @tap.stop="setCursor(0)">
                  <view v-if="draftCursor === 0" class="caret" aria-hidden="true" />
                </view>
                <template v-for="(ch, index) in exprChars" :key="'c-' + index">
                  <text
                    class="exprChar tap"
                    :class="{ fracBar: ch === '⁄' }"
                    @tap.stop="setCursor(index + 1)"
                  >{{ ch }}</text>
                  <view class="cursorHit tap" @tap.stop="setCursor(index + 1)">
                    <view v-if="draftCursor === index + 1" class="caret" aria-hidden="true" />
                  </view>
                </template>
              </view>
            </view>

            <text v-if="lockedResult && !draftText" class="mainResult">= {{ lockedResult }}</text>
            <text v-else-if="livePreview" class="resultLine">= {{ livePreview }}</text>

            <view class="toolbar">
              <view class="toolBtn tap" role="button" @tap="toggleAngle">
                <text class="toolLabel">{{ angleMode === 'deg' ? 'DEG' : 'RAD' }}</text>
              </view>
              <view class="toolBtn tap" role="button" @tap="setCursor(Math.max(0, draftCursor - 1))">
                <text class="toolLabel">◀</text>
              </view>
              <view class="toolBtn tap" role="button" @tap="setCursor(Math.min(draftText.length, draftCursor + 1))">
                <text class="toolLabel">▶</text>
              </view>
              <view
                class="toolBtn tap"
                :class="{ on: sciOpen }"
                role="button"
                @tap="sciOpen = !sciOpen"
              >
                <text class="toolLabel">f(x)</text>
              </view>
            </view>
          </view>
        </view>

        <view v-if="sciOpen" class="sciPanel">
          <view
            v-for="key in sciKeys"
            :key="key.id"
            class="key sci tap"
            role="button"
            :aria-label="key.label"
            @tap="onKey(key)"
          >
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
            :aria-label="key.label"
            @tap="onKey(key)"
          >
            <text class="keyLabel">{{ key.label }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="calcChrome headerWrap">
      <AppHeader nav-mode="back" />
    </view>

    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import { useTheme } from '@/composables/useTheme'
import { useCalculatorSession } from '@/composables/useCalculatorSession'
import { CALC_INSERTS, deleteBefore, evaluateExpression, formatResultOperand, insertAt, isLeadingOperatorInsert } from '@/lib/scientificCalc'

const { themeClass } = useTheme()
const {
  draftText,
  draftCursor,
  angleMode,
  history,
  setDraft,
  setAngleMode,
  pushHistory,
} = useCalculatorSession()

const lockedResult = ref('')
const sciOpen = ref(false)

const livePreview = computed(() => {
  if (lockedResult.value) return ''
  const text = draftText.value.trim()
  if (!text) return ''
  const outcome = evaluateExpression(text, angleMode.value)
  return outcome.ok ? outcome.display : ''
})

const sciKeys = [
  { id: 'sin', label: 'sin', insert: 'sin' },
  { id: 'cos', label: 'cos', insert: 'cos' },
  { id: 'tan', label: 'tan', insert: 'tan' },
  { id: 'log', label: 'log', insert: 'log' },
  { id: 'ln', label: 'ln', insert: 'ln' },
  { id: 'square', label: 'x²', insert: 'square' },
  { id: 'power', label: '^', insert: 'power' },
  { id: 'sqrt', label: '√', insert: 'sqrt' },
  { id: 'pi', label: 'π', insert: 'pi' },
  { id: 'e', label: 'e', insert: 'e' },
  { id: 'exp', label: 'eˣ', insert: 'exp' },
  { id: 'factorial', label: '!', insert: 'factorial' },
  { id: 'frac', label: '⁄', insert: 'frac' },
  { id: 'reciprocal', label: '1/x', insert: 'reciprocal' },
  { id: 'negWrap', label: '±', action: 'negWrap' },
  { id: 'percent', label: '%', action: 'percent' },
]

const basicKeys = [
  { id: 'clear', label: 'C', kind: 'func', action: 'clear' },
  { id: 'back', label: '⌫', kind: 'func', action: 'backspace' },
  { id: 'lparen', label: '(', kind: 'func', insert: 'lparen' },
  { id: 'rparen', label: ')', kind: 'func', insert: 'rparen' },
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
  { id: 'plus', label: '+', kind: 'op', insert: 'plus', placement: { gridColumn: 4, gridRow: 5 } },
  { id: 'equals', label: '=', kind: 'eq tall', action: 'equals', placement: { gridColumn: '1 / -1', gridRow: 6 } },
]

function keyStyle(key) {
  if (!key.placement) return {}
  const style = {}
  if (key.placement.gridColumn != null) style.gridColumn = key.placement.gridColumn
  if (key.placement.gridRow != null) style.gridRow = key.placement.gridRow
  return style
}

const exprChars = computed(() => {
  const text = draftText.value || ''
  return [...text].map((ch) => (ch === '/' ? '⁄' : ch))
})

function toggleAngle() {
  setAngleMode(angleMode.value === 'deg' ? 'rad' : 'deg')
}

function setCursor(index) {
  draftCursor.value = index
}

function archiveLockedResult() {
  if (!lockedResult.value) return false
  pushHistory({ expression: '', result: lockedResult.value })
  lockedResult.value = ''
  return true
}

function applyDraft(nextText, nextCursor) {
  setDraft(nextText, nextCursor)
}

function lastResultOperand() {
  const raw = lockedResult.value || history.value[0]?.result || ''
  return formatResultOperand(raw)
}

function insertFromSpec(specKey) {
  const spec = CALC_INSERTS[specKey]
  if (!spec) return

  let text = draftText.value
  let cursor = draftCursor.value

  if (isLeadingOperatorInsert(specKey) && cursor === 0 && !text.trim()) {
    const operand = lastResultOperand()
    if (operand) {
      lockedResult.value = ''
      text = operand
      cursor = operand.length
    } else {
      archiveLockedResult()
    }
  } else {
    archiveLockedResult()
  }

  const next = insertAt(text, cursor, spec.text, spec.cursor)
  applyDraft(next.text, next.cursor)
}

function onKey(key) {
  if (key.action === 'clear') {
    applyDraft('', 0)
    lockedResult.value = ''
    return
  }

  if (key.action === 'backspace') {
    if (lockedResult.value && !draftText.value) {
      lockedResult.value = ''
      return
    }
    const next = deleteBefore(draftText.value, draftCursor.value)
    applyDraft(next.text, next.cursor)
    return
  }

  if (key.action === 'equals') {
    const text = draftText.value.trim()
    if (!text) return
    const outcome = evaluateExpression(text, angleMode.value)
    if (!outcome.ok) return
    pushHistory({ expression: text, result: outcome.display })
    setDraft('', 0)
    lockedResult.value = outcome.display
    return
  }

  if (key.action === 'percent') {
    archiveLockedResult()
    const next = insertAt(draftText.value, draftCursor.value, '/100', 4)
    applyDraft(next.text, next.cursor)
    return
  }

  if (key.action === 'negWrap') {
    archiveLockedResult()
    const next = insertAt(draftText.value, draftCursor.value, '(-)', 2)
    applyDraft(next.text, next.cursor)
    return
  }

  if (key.insert) {
    insertFromSpec(key.insert)
    return
  }

  if (key.action === 'digit') {
    archiveLockedResult()
    const next = insertAt(draftText.value, draftCursor.value, key.value, 1)
    applyDraft(next.text, next.cursor)
  }
}

function loadHistory(item) {
  lockedResult.value = ''
  if (item.expression) {
    setDraft(item.expression, item.expression.length)
    return
  }
  lockedResult.value = item.result
}
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

.calcCanvas {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: flex;
  flex-direction: column;
}

.bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background:
    radial-gradient(900rpx 640rpx at 50% 8%, rgba(46, 99, 255, 0.12), transparent 62%),
    linear-gradient(180deg, #f8faff, #eef1f7);
}

.t-dark .bg {
  background:
    radial-gradient(900rpx 640rpx at 50% 8%, rgba(60, 120, 255, 0.14), transparent 58%),
    linear-gradient(180deg, #111315, #0e1014);
}

.headerWrap {
  position: relative;
  z-index: 2;
}

.shell {
  position: relative;
  z-index: 1;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding:
    calc(var(--shell-header-offset, 148rpx) + 12rpx)
    24rpx
    calc(24rpx + env(safe-area-inset-bottom));
  gap: 12rpx;
  box-sizing: border-box;
  min-height: 100vh;
}

.displayPanel {
  position: relative;
  width: 100%;
  border-radius: 32rpx;
  overflow: hidden;
  flex-shrink: 0;
}

.displayCap {
  position: absolute;
  inset: 0;
  border-radius: 32rpx;
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  background:
    radial-gradient(circle at 38% 32%, rgba(248, 250, 255, 0.42) 0%, rgba(238, 241, 247, 0.28) 42%, rgba(238, 241, 247, 0.22) 100%);
  box-shadow:
    0 2rpx 8rpx rgba(16, 24, 40, 0.025),
    inset 0 1rpx 3rpx rgba(255, 255, 255, 0.35),
    inset 0 -6rpx 14rpx rgba(16, 24, 40, 0.03);
  border: 1rpx solid rgba(16, 24, 40, 0.05);
}

.t-dark .displayCap {
  background:
    radial-gradient(circle at 38% 32%, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.04) 42%, rgba(255, 255, 255, 0.02) 100%);
  border-color: rgba(255, 255, 255, 0.06);
}

.displayInner {
  position: relative;
  z-index: 1;
  padding: 16rpx 20rpx 14rpx;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.historyScroll {
  max-height: 72rpx;
}

.historyItem {
  display: flex;
  align-items: baseline;
  justify-content: flex-end;
  gap: 10rpx;
  min-width: 0;
  padding: 2rpx 0;
}

.historyExpr,
.historyResult {
  font-size: 18rpx;
  color: rgba(16, 24, 40, 0.38);
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.historyExpr {
  flex: 1;
  min-width: 0;
  text-align: right;
}

.historyResult {
  color: rgba(46, 99, 255, 0.62);
  flex-shrink: 0;
}

.t-dark .historyExpr {
  color: rgba(245, 247, 255, 0.32);
}

.t-dark .historyResult {
  color: rgba(170, 200, 255, 0.62);
}

.exprEditor {
  min-height: 64rpx;
  display: flex;
  align-items: flex-end;
  justify-content: flex-end;
  width: 100%;
}

.exprRow {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  width: 100%;
  min-height: 56rpx;
}

.exprChar {
  font-size: 44rpx;
  font-weight: 300;
  line-height: 1.15;
  color: rgba(16, 24, 40, 0.94);
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
}

.exprChar.fracBar {
  color: rgba(46, 99, 255, 0.88);
  font-weight: 520;
}

.t-dark .exprChar {
  color: rgba(245, 247, 255, 0.94);
}

.t-dark .exprChar.fracBar {
  color: rgba(170, 200, 255, 0.9);
}

.cursorHit {
  min-width: 6rpx;
  min-height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.caret {
  width: 3rpx;
  height: 42rpx;
  border-radius: 999rpx;
  background: rgba(46, 99, 255, 0.92);
  animation: blink 1.1s step-end infinite;
}

.t-dark .caret {
  background: rgba(170, 200, 255, 0.92);
}

@keyframes blink {
  50% { opacity: 0; }
}

.mainResult {
  font-size: 44rpx;
  font-weight: 300;
  color: rgba(16, 24, 40, 0.94);
  text-align: right;
  width: 100%;
  min-height: 56rpx;
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
}

.t-dark .mainResult {
  color: rgba(245, 247, 255, 0.94);
}

.resultLine {
  font-size: 30rpx;
  font-weight: 300;
  color: rgba(46, 99, 255, 0.92);
  text-align: right;
  font-feature-settings: 'tnum';
  font-variant-numeric: tabular-nums;
}

.t-dark .resultLine {
  color: rgba(170, 200, 255, 0.92);
}

.toolbar {
  display: flex;
  justify-content: flex-end;
  gap: 8rpx;
  margin-top: 4rpx;
}

.toolBtn {
  min-width: 56rpx;
  height: 44rpx;
  padding: 0 14rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.42);
  border: 1rpx solid rgba(142, 142, 147, 0.12);
  transition: transform 150ms ease, background 180ms ease;
}

.toolBtn.on {
  background: rgba(46, 99, 255, 0.14);
  border-color: rgba(46, 99, 255, 0.22);
}

.t-dark .toolBtn {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}

.t-dark .toolBtn.on {
  background: rgba(120, 160, 255, 0.16);
  border-color: rgba(120, 160, 255, 0.24);
}

.toolBtn:active {
  transform: scale(0.96);
}

.toolLabel {
  font-size: 18rpx;
  font-weight: 620;
  color: rgba(60, 60, 67, 0.62);
  letter-spacing: 0.4rpx;
}

.toolBtn.on .toolLabel {
  color: rgba(46, 99, 255, 0.96);
}

.t-dark .toolLabel {
  color: rgba(245, 247, 255, 0.48);
}

.t-dark .toolBtn.on .toolLabel {
  color: rgba(170, 200, 255, 0.96);
}

.sciPanel {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8rpx;
  flex-shrink: 0;
}

.keypad {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10rpx;
  flex-shrink: 0;
}

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

.key.sci {
  height: 64rpx;
  border-radius: 16rpx;
  background: rgba(255, 255, 255, 0.5);
}

.t-dark .key {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}

.t-dark .key.sci {
  background: rgba(255, 255, 255, 0.05);
}

.key:active {
  transform: scale(0.94);
  background: rgba(142, 142, 147, 0.12);
}

.key.num .keyLabel {
  font-size: 34rpx;
  font-weight: 420;
  color: rgba(16, 24, 40, 0.92);
}

.t-dark .key.num .keyLabel {
  color: rgba(245, 247, 255, 0.92);
}

.key.func {
  background: rgba(255, 255, 255, 0.42);
}

.t-dark .key.func {
  background: rgba(255, 255, 255, 0.04);
}

.key.func .keyLabel {
  font-size: 26rpx;
  font-weight: 560;
  color: rgba(60, 60, 67, 0.72);
}

.t-dark .key.func .keyLabel {
  color: rgba(245, 247, 255, 0.58);
}

.key.sci .keyLabel {
  font-size: 22rpx;
  font-weight: 560;
  color: rgba(46, 99, 255, 0.88);
}

.t-dark .key.sci .keyLabel {
  color: rgba(170, 200, 255, 0.9);
}

.key.op,
.key.eq {
  background: rgba(46, 99, 255, 0.12);
  border-color: rgba(46, 99, 255, 0.18);
}

.t-dark .key.op,
.t-dark .key.eq {
  background: rgba(120, 160, 255, 0.16);
  border-color: rgba(120, 160, 255, 0.22);
}

.key.op .keyLabel,
.key.eq .keyLabel {
  font-size: 34rpx;
  font-weight: 520;
  color: rgba(46, 99, 255, 0.96);
}

.t-dark .key.op .keyLabel,
.t-dark .key.eq .keyLabel {
  color: rgba(170, 200, 255, 0.96);
}

.key.eq {
  background: #007aff;
  border-color: transparent;
}

.key.eq.tall {
  height: auto;
  min-height: 104rpx;
  align-self: stretch;
}

.key.eq .keyLabel {
  color: #fff;
  font-weight: 600;
}

.key.eq.tall .keyLabel {
  font-size: 42rpx;
}

.key.wide {
  grid-column: span 2;
}
</style>
