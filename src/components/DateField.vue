<template>
  <view class="dateField" :class="themeClass">
    <picker
      :mode="mode"
      :value="pickerValue"
      :start="start"
      :end="end"
      :fields="fields"
      @change="onChange"
    >
      <view class="control">
        <view class="left">
          <view class="iconWrap">
            <view v-if="mode === 'date'" class="cal">
              <view class="calBar" />
              <view class="calDot a" />
              <view class="calDot b" />
              <view class="calDot c" />
            </view>
            <view v-else class="clock">
              <view class="hand" />
            </view>
          </view>
          <view class="textCol">
            <text v-if="label" class="label">{{ label }}</text>
            <text class="value" :class="{ placeholder: !modelValue }">
              {{ displayValue }}
            </text>
          </view>
        </view>
        <view v-if="modelValue && clearable" class="clearBtn" role="button" catch:tap="onClear" @tap.stop="onClear">
          <text class="clearText">×</text>
        </view>
      </view>
    </picker>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({
  modelValue: { type: String, default: '' },
  /** date | time */
  mode: { type: String, default: 'date' },
  label: { type: String, default: '' },
  placeholder: { type: String, default: 'Select date' },
  start: { type: String, default: '' },
  end: { type: String, default: '' },
  fields: { type: String, default: 'day' },
  clearable: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue', 'change', 'clear'])

const { themeClass } = useTheme()

const pickerValue = computed(() => {
  if (props.modelValue) return props.modelValue
  if (props.mode === 'time') {
    const d = new Date()
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

const displayValue = computed(() => {
  if (!props.modelValue) return props.placeholder
  if (props.mode === 'time') return props.modelValue
  const parts = props.modelValue.split('-')
  if (parts.length < 3) return props.modelValue
  const [y, m, d] = parts
  const date = new Date(Number(y), Number(m) - 1, Number(d))
  if (Number.isNaN(date.getTime())) return props.modelValue
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return `${weekdays[date.getDay()]} · ${months[date.getMonth()]} ${date.getDate()}`
})

function onChange(e) {
  const value = e.detail.value
  emit('update:modelValue', value)
  emit('change', value)
}

function onClear() {
  emit('update:modelValue', '')
  emit('clear')
}
</script>

<style scoped>
.dateField {
  width: 100%;
}

.control {
  min-height: 84rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14rpx;
  padding: 14rpx 16rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.78);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
  transition: border-color 200ms ease, background 200ms ease;
}
.t-dark .control {
  background: #23272d;
  border-color: rgba(255, 255, 255, 0.08);
}

.left {
  display: flex;
  align-items: center;
  gap: 12rpx;
  flex: 1;
  min-width: 0;
}

.iconWrap {
  width: 40rpx;
  height: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  background: rgba(46, 99, 255, 0.10);
}
.t-dark .iconWrap { background: rgba(120, 160, 255, 0.14); }

.cal {
  position: relative;
  width: 22rpx;
  height: 22rpx;
  border-radius: 4rpx;
  border: 1.4rpx solid rgba(46, 99, 255, 0.88);
}
.cal .calBar {
  position: absolute;
  left: -1.4rpx;
  right: -1.4rpx;
  top: 4rpx;
  height: 1.6rpx;
  background: rgba(46, 99, 255, 0.88);
}
.cal .calDot { position: absolute; width: 3rpx; height: 3rpx; border-radius: 50%; background: rgba(46, 99, 255, 0.88); }
.cal .calDot.a { top: 9rpx; left: 4rpx; }
.cal .calDot.b { top: 9rpx; left: 10rpx; }
.cal .calDot.c { top: 14rpx; left: 4rpx; }
.t-dark .cal,
.t-dark .cal .calBar,
.t-dark .cal .calDot { border-color: rgba(170, 200, 255, 0.92); background: rgba(170, 200, 255, 0.92); }
.t-dark .cal { background: transparent; }

.clock {
  position: relative;
  width: 22rpx;
  height: 22rpx;
  border-radius: 50%;
  border: 1.4rpx solid rgba(46, 99, 255, 0.88);
}
.clock .hand {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 6rpx;
  height: 1.4rpx;
  background: rgba(46, 99, 255, 0.88);
  transform: translateY(-50%) rotate(-32deg);
  transform-origin: left center;
  border-radius: 999rpx;
}
.t-dark .clock { border-color: rgba(170, 200, 255, 0.92); }
.t-dark .clock .hand { background: rgba(170, 200, 255, 0.92); }

.textCol {
  display: flex;
  flex-direction: column;
  gap: 2rpx;
  min-width: 0;
}

.label {
  font-size: 18rpx;
  color: rgba(16, 24, 40, 0.48);
}
.t-dark .label { color: rgba(245, 247, 255, 0.46); }

.value {
  font-size: 24rpx;
  font-weight: 700;
  color: rgba(16, 24, 40, 0.92);
}
.t-dark .value { color: rgba(245, 247, 255, 0.92); }
.value.placeholder {
  color: rgba(16, 24, 40, 0.36);
  font-weight: 540;
}
.t-dark .value.placeholder { color: rgba(245, 247, 255, 0.36); }

.clearBtn {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: rgba(16, 24, 40, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
}
.t-dark .clearBtn { background: rgba(255, 255, 255, 0.08); }
.clearText {
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.6);
  font-weight: 400;
  line-height: 1;
}
.t-dark .clearText { color: rgba(245, 247, 255, 0.6); }
</style>
