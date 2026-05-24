<template>
  <Teleport to="body">
    <view
      v-if="open"
      class="overlay"
      :class="[themeClass, { show: visible }]"
      @tap="close"
    >
      <view class="sheet" @tap.stop>
        <view class="grabber" />

        <scroll-view v-if="mode === 'time'" class="body" scroll-y :show-scrollbar="false">
          <view class="list">
            <view
              v-for="opt in timeOptions"
              :key="opt.value"
              class="row tap"
              :class="{ on: opt.value === selected }"
              role="button"
              @tap="pick(opt.value)"
            >
              <view class="chip c-slate">
                <view class="chipDot" />
                <text class="chipText">{{ opt.label }}</text>
              </view>
              <text v-if="opt.value === selected" class="check">OK</text>
            </view>
          </view>
        </scroll-view>

        <view v-else class="calBody">
          <view class="calHead">
            <view class="navBtn tap" role="button" @tap="prevMonth">
              <text class="navText">‹</text>
            </view>
            <view class="calTitleWrap">
              <text class="monthLabel">{{ monthLabel }}</text>
              <view class="todayBtn tap" role="button" @tap="goToday">
                <text class="todayBtnText">Today</text>
              </view>
            </view>
            <view class="navBtn tap" role="button" @tap="nextMonth">
              <text class="navText">›</text>
            </view>
          </view>

          <view class="weekHead">
            <text v-for="d in weekdayLabels" :key="d" class="weekCell">{{ d }}</text>
          </view>

          <view class="grid">
            <view
              v-for="cell in calendarCells"
              :key="cell.key"
              class="dayCell tap"
              :class="{
                off: !cell.inMonth,
                today: cell.isToday,
                on: cell.value === selected,
                disabled: cell.disabled,
              }"
              role="button"
              @tap="pickDay(cell)"
            >
              <text class="dayNum">{{ cell.day }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({
  open: { type: Boolean, default: false },
  mode: { type: String, default: 'date' },
  selected: { type: String, default: '' },
  start: { type: String, default: '' },
  end: { type: String, default: '' },
})

const emit = defineEmits(['close', 'pick'])

const { themeClass } = useTheme()
const visible = ref(false)
const viewYear = ref(0)
const viewMonth = ref(0)

const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const weekdayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function parseDate(value) {
  if (!value) return null
  const parts = value.split('-')
  if (parts.length < 3) return null
  const date = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  return Number.isNaN(date.getTime()) ? null : date
}

function formatIso(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatTimeLabel(value) {
  const [h, m] = value.split(':')
  const hour = Number(h)
  const minute = Number(m)
  if (Number.isNaN(hour) || Number.isNaN(minute)) return value
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const hour12 = hour % 12 || 12
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`
}

const minDate = computed(() => {
  const parsed = parseDate(props.start)
  if (parsed) {
    parsed.setHours(0, 0, 0, 0)
    return parsed
  }
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setFullYear(d.getFullYear() - 1)
  return d
})

const maxDate = computed(() => {
  const parsed = parseDate(props.end)
  if (parsed) {
    parsed.setHours(0, 0, 0, 0)
    return parsed
  }
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setFullYear(d.getFullYear() + 2)
  return d
})

const timeOptions = computed(() => {
  const list = []
  for (let h = 0; h < 24; h += 1) {
    for (const m of [0, 30]) {
      const value = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
      list.push({ value, label: formatTimeLabel(value) })
    }
  }
  return list
})

const monthLabel = computed(() => `${monthNames[viewMonth.value]} ${viewYear.value}`)

const calendarCells = computed(() => {
  const first = new Date(viewYear.value, viewMonth.value, 1)
  const startPad = first.getDay()
  const daysInMonth = new Date(viewYear.value, viewMonth.value + 1, 0).getDate()
  const prevMonthDays = new Date(viewYear.value, viewMonth.value, 0).getDate()

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const cells = []
  for (let i = 0; i < 42; i += 1) {
    let day
    let inMonth = true
    let month = viewMonth.value
    let year = viewYear.value

    if (i < startPad) {
      day = prevMonthDays - startPad + i + 1
      inMonth = false
      month -= 1
      if (month < 0) {
        month = 11
        year -= 1
      }
    } else if (i >= startPad + daysInMonth) {
      day = i - startPad - daysInMonth + 1
      inMonth = false
      month += 1
      if (month > 11) {
        month = 0
        year += 1
      }
    } else {
      day = i - startPad + 1
    }

    const date = new Date(year, month, day)
    date.setHours(0, 0, 0, 0)
    const value = formatIso(date)
    const disabled = date < minDate.value || date > maxDate.value

    cells.push({
      key: `${year}-${month}-${day}-${i}`,
      day,
      inMonth,
      value,
      disabled,
      isToday: date.getTime() === today.getTime(),
    })
  }
  return cells
})

function syncViewMonth() {
  const base = parseDate(props.selected) || new Date()
  viewYear.value = base.getFullYear()
  viewMonth.value = base.getMonth()
}

function goToday() {
  const today = new Date()
  viewYear.value = today.getFullYear()
  viewMonth.value = today.getMonth()
}

function prevMonth() {
  if (viewMonth.value === 0) {
    viewMonth.value = 11
    viewYear.value -= 1
  } else {
    viewMonth.value -= 1
  }
}

function nextMonth() {
  if (viewMonth.value === 11) {
    viewMonth.value = 0
    viewYear.value += 1
  } else {
    viewMonth.value += 1
  }
}

function pickDay(cell) {
  if (cell.disabled) return
  pick(cell.value)
}

function close() {
  visible.value = false
  setTimeout(() => emit('close'), 220)
}

function pick(value) {
  emit('pick', value)
  close()
}

watch(
  () => props.open,
  (next) => {
    if (next) {
      syncViewMonth()
      nextTick(() => {
        visible.value = true
      })
    } else {
      visible.value = false
    }
  },
  { immediate: true }
)
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 140;
  opacity: 0;
  pointer-events: none;
  background: rgba(8, 12, 24, 0.38);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: opacity 0.22s ease;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}
.overlay.show {
  opacity: 1;
  pointer-events: auto;
}

.sheet {
  width: 100%;
  max-width: 720px;
  max-height: min(72vh, 680px);
  border-radius: 32rpx 32rpx 0 0;
  padding: 0 22rpx calc(18rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.94);
  border: 1rpx solid rgba(255, 255, 255, 0.65);
  border-bottom: none;
  box-shadow: 0 -20rpx 60rpx rgba(12, 20, 40, 0.12);
  transform: translateY(110%);
  transition: transform 0.28s cubic-bezier(0.34, 1.1, 0.64, 1);
}
.overlay.show .sheet {
  transform: translateY(0);
}
.t-dark .sheet {
  background: rgba(26, 29, 33, 0.96);
  border-color: rgba(255, 255, 255, 0.08);
  box-shadow: 0 -24rpx 70rpx rgba(0, 0, 0, 0.45);
}

.grabber {
  width: 72rpx;
  height: 8rpx;
  margin: 14rpx auto 12rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.16);
}
.t-dark .grabber {
  background: rgba(245, 247, 255, 0.2);
}

.body {
  max-height: calc(min(72vh, 680px) - 48rpx);
}

.calBody {
  padding-bottom: 8rpx;
}

.calHead {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
  padding: 0 4rpx 12rpx;
}

.calTitleWrap {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.todayBtn {
  min-height: 44rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(46, 99, 255, 0.10);
  border: 1rpx solid rgba(46, 99, 255, 0.22);
}
.t-dark .todayBtn {
  background: rgba(120, 160, 255, 0.14);
  border-color: rgba(120, 160, 255, 0.28);
}
.todayBtnText {
  font-size: 20rpx;
  font-weight: 720;
  color: rgba(46, 99, 255, 0.96);
}
.t-dark .todayBtnText {
  color: rgba(170, 200, 255, 0.96);
}

.navBtn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 24, 40, 0.05);
}
.t-dark .navBtn {
  background: rgba(255, 255, 255, 0.06);
}
.navText {
  font-size: 34rpx;
  line-height: 1;
  color: rgba(16, 24, 40, 0.72);
  font-weight: 300;
}
.t-dark .navText {
  color: rgba(245, 247, 255, 0.72);
}

.monthLabel {
  font-size: 26rpx;
  font-weight: 740;
  color: rgba(16, 24, 40, 0.88);
}
.t-dark .monthLabel {
  color: rgba(245, 247, 255, 0.88);
}

.weekHead {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4rpx;
  margin-bottom: 6rpx;
}
.weekCell {
  text-align: center;
  font-size: 18rpx;
  font-weight: 660;
  color: rgba(16, 24, 40, 0.42);
  padding: 6rpx 0;
}
.t-dark .weekCell {
  color: rgba(245, 247, 255, 0.38);
}

.grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6rpx;
}

.dayCell {
  position: relative;
  aspect-ratio: 1;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 24, 40, 0.03);
  border: 1rpx solid transparent;
  transition: background 180ms ease, border-color 180ms ease, transform 140ms ease;
}
.t-dark .dayCell {
  background: rgba(255, 255, 255, 0.04);
}
.dayCell.tap:active {
  transform: scale(0.96);
}
.dayCell.off {
  opacity: 0.34;
}
.dayCell.today:not(.on) {
  background: rgba(46, 99, 255, 0.04);
  border-color: rgba(46, 99, 255, 0.16);
}
.t-dark .dayCell.today:not(.on) {
  background: rgba(120, 160, 255, 0.06);
  border-color: rgba(120, 160, 255, 0.18);
}
.dayCell.today:not(.on) .dayNum {
  color: rgba(46, 99, 255, 0.58);
  font-weight: 700;
}
.t-dark .dayCell.today:not(.on) .dayNum {
  color: rgba(170, 200, 255, 0.58);
}
.dayCell.today:not(.on)::after {
  content: '';
  position: absolute;
  bottom: 7rpx;
  width: 5rpx;
  height: 5rpx;
  border-radius: 50%;
  background: rgba(46, 99, 255, 0.38);
}
.t-dark .dayCell.today:not(.on)::after {
  background: rgba(170, 200, 255, 0.38);
}
.dayCell.on {
  background: linear-gradient(180deg, rgba(90, 142, 255, 0.96), rgba(46, 99, 255, 0.96));
  border-color: rgba(46, 99, 255, 0.96);
  box-shadow: 0 4rpx 14rpx rgba(46, 99, 255, 0.22);
}
.dayCell.today.on::after {
  display: none;
}
.t-dark .dayCell.on {
  background: linear-gradient(180deg, rgba(100, 150, 255, 0.96), rgba(70, 120, 255, 0.96));
  border-color: rgba(120, 160, 255, 0.96);
  box-shadow: 0 4rpx 14rpx rgba(70, 120, 255, 0.28);
}
.dayCell.disabled {
  opacity: 0.22;
  pointer-events: none;
}

.dayNum {
  font-size: 22rpx;
  font-weight: 680;
  color: rgba(16, 24, 40, 0.82);
}
.t-dark .dayNum {
  color: rgba(245, 247, 255, 0.82);
}
.dayCell.on .dayNum {
  color: #fff;
  font-weight: 760;
}
.t-dark .dayCell.on .dayNum {
  color: rgba(245, 247, 255, 0.98);
}

.list {
  display: flex;
  flex-direction: column;
  gap: 10rpx;
  padding-bottom: 8rpx;
}

.row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16rpx 18rpx;
  border-radius: 22rpx;
  background: rgba(16, 24, 40, 0.03);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  transition: transform 140ms ease, background 180ms ease, border-color 180ms ease;
}
.t-dark .row {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.row.tap:active { transform: scale(0.99); }
.row.on {
  background: rgba(46, 99, 255, 0.08);
  border-color: rgba(46, 99, 255, 0.22);
}
.t-dark .row.on {
  background: rgba(120, 160, 255, 0.12);
  border-color: rgba(120, 160, 255, 0.28);
}

.chip {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 8rpx 14rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.06);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
}
.t-dark .chip {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}
.chipDot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: rgba(16, 24, 40, 0.42);
}
.t-dark .chipDot { background: rgba(245, 247, 255, 0.42); }
.chipText {
  font-size: 22rpx;
  font-weight: 700;
  color: rgba(16, 24, 40, 0.86);
}
.t-dark .chipText { color: rgba(245, 247, 255, 0.86); }

.chip.c-slate { background: rgba(16, 24, 40, 0.06); border-color: rgba(16, 24, 40, 0.10); }
.chip.c-slate .chipDot { background: rgba(16, 24, 40, 0.6); }
.t-dark .chip.c-slate { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.10); }
.t-dark .chip.c-slate .chipDot { background: rgba(245, 247, 255, 0.6); }

.check {
  font-size: 18rpx;
  font-weight: 760;
  color: rgba(46, 99, 255, 0.96);
  letter-spacing: 0.4rpx;
}
.t-dark .check { color: rgba(170, 200, 255, 0.96); }
</style>
