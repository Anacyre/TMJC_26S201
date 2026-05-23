<template>
  <view class="tagSelect" :class="themeClass">
    <picker
      mode="selector"
      :range="pickerRange"
      :value="selectedIndex"
      @change="onPick"
    >
      <view class="control">
        <view class="left">
          <view class="chip" :class="resolvedColorClass">
            <view class="chipDot" />
            <text class="chipText">{{ modelValue || placeholder }}</text>
          </view>
        </view>
        <view class="chev"><text class="chevText">▾</text></view>
      </view>
    </picker>
    <view v-if="allowCreate && canCreate" class="newRow" role="button" @tap="openCreate">
      <text class="newText">＋ New tag</text>
    </view>
    <view class="overlay" :class="{ show: creating }" @tap="creating = false">
      <view class="sheet" @tap.stop>
        <text class="title">New {{ kind }}</text>
        <input
          class="input"
          v-model="draftName"
          :placeholder="'e.g. ' + (kind === 'subject' ? 'Biology' : 'Project')"
          placeholder-class="placeholder"
          maxlength="24"
        />
        <view class="commit" role="button" @tap="commitNew">
          <text class="commitText">Create</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select tag' },
  allowCreate: { type: Boolean, default: false },
  canCreate: { type: Boolean, default: false },
  kind: { type: String, default: 'subject' },
  /** Optional override color for the chip swatch */
  color: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'create'])

const { themeClass } = useTheme()
const creating = ref(false)
const draftName = ref('')

const pickerRange = computed(() => props.options.map((o) => (typeof o === 'string' ? o : o.name || o.label)))

const selectedIndex = computed(() => {
  const idx = pickerRange.value.findIndex((x) => x === props.modelValue)
  return idx >= 0 ? idx : 0
})

const resolvedColorClass = computed(() => {
  const name = (props.modelValue || '').toLowerCase()
  if (props.color) return `c-${props.color}`
  if (name.includes('math')) return 'c-blue'
  if (name.includes('phys')) return 'c-violet'
  if (name.includes('chem')) return 'c-green'
  if (name.includes('econ')) return 'c-amber'
  if (name === 'gp' || name.includes('general')) return 'c-rose'
  return 'c-slate'
})

function onPick(e) {
  const idx = Number(e.detail.value)
  const choice = pickerRange.value[idx]
  if (choice) emit('update:modelValue', choice)
}

function openCreate() {
  draftName.value = ''
  creating.value = true
}

function commitNew() {
  const value = draftName.value.trim()
  if (!value) return
  emit('create', value)
  emit('update:modelValue', value)
  creating.value = false
}
</script>

<style scoped>
.tagSelect { width: 100%; }

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

.left { display: flex; align-items: center; flex: 1; min-width: 0; }

.chip {
  display: inline-flex;
  align-items: center;
  gap: 10rpx;
  padding: 10rpx 16rpx;
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

.chip.c-blue { background: rgba(46, 99, 255, 0.10); border-color: rgba(46, 99, 255, 0.22); }
.chip.c-blue .chipDot { background: rgba(46, 99, 255, 0.95); }
.chip.c-blue .chipText { color: rgba(46, 99, 255, 0.96); }
.chip.c-violet { background: rgba(120, 90, 220, 0.10); border-color: rgba(120, 90, 220, 0.22); }
.chip.c-violet .chipDot { background: rgba(120, 90, 220, 0.95); }
.chip.c-violet .chipText { color: rgba(120, 90, 220, 0.96); }
.chip.c-green { background: rgba(36, 160, 110, 0.10); border-color: rgba(36, 160, 110, 0.22); }
.chip.c-green .chipDot { background: rgba(36, 160, 110, 0.95); }
.chip.c-green .chipText { color: rgba(36, 160, 110, 0.96); }
.chip.c-amber { background: rgba(220, 140, 30, 0.12); border-color: rgba(220, 140, 30, 0.24); }
.chip.c-amber .chipDot { background: rgba(220, 140, 30, 0.95); }
.chip.c-amber .chipText { color: rgba(180, 110, 20, 0.96); }
.t-dark .chip.c-amber .chipText { color: rgba(245, 200, 130, 0.96); }
.chip.c-rose { background: rgba(220, 80, 110, 0.10); border-color: rgba(220, 80, 110, 0.22); }
.chip.c-rose .chipDot { background: rgba(220, 80, 110, 0.95); }
.chip.c-rose .chipText { color: rgba(220, 80, 110, 0.96); }
.chip.c-slate { background: rgba(16, 24, 40, 0.06); border-color: rgba(16, 24, 40, 0.10); }
.chip.c-slate .chipDot { background: rgba(16, 24, 40, 0.6); }
.t-dark .chip.c-slate { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.10); }
.t-dark .chip.c-slate .chipDot { background: rgba(245, 247, 255, 0.6); }

.chev {
  width: 30rpx;
  height: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.5;
}
.chevText { font-size: 18rpx; color: rgba(16, 24, 40, 0.6); }
.t-dark .chevText { color: rgba(245, 247, 255, 0.6); }

.newRow {
  margin-top: 10rpx;
  padding: 12rpx 16rpx;
  border-radius: 18rpx;
  border: 1rpx dashed rgba(46, 99, 255, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 180ms ease;
}
.newRow:active { background: rgba(46, 99, 255, 0.06); }
.newText { font-size: 20rpx; color: rgba(46, 99, 255, 0.92); font-weight: 700; }
.t-dark .newText { color: rgba(170, 200, 255, 0.94); }

.overlay {
  position: fixed; inset: 0; z-index: 90;
  background: rgba(8, 12, 24, 0.4);
  backdrop-filter: blur(14px);
  opacity: 0; pointer-events: none;
  transition: opacity 0.22s ease;
}
.overlay.show { opacity: 1; pointer-events: auto; }
.sheet {
  position: absolute; left: 24rpx; right: 24rpx; bottom: 24rpx;
  padding: 24rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.92);
  border: 1rpx solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 36rpx 100rpx rgba(8, 12, 24, 0.22);
}
.t-dark .sheet {
  background: #1a1d21;
  border-color: rgba(255, 255, 255, 0.08);
}
.title { font-size: 24rpx; font-weight: 720; color: rgba(16, 24, 40, 0.92); }
.t-dark .title { color: #f5f7fa; }
.input {
  margin-top: 12rpx;
  height: 78rpx;
  padding: 0 16rpx;
  border-radius: 18rpx;
  background: rgba(16, 24, 40, 0.04);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
  font-size: 24rpx;
  color: rgba(16, 24, 40, 0.92);
}
.t-dark .input {
  background: #23272d;
  border-color: rgba(255, 255, 255, 0.08);
  color: #f5f7fa;
}
.placeholder { color: rgba(16, 24, 40, 0.35); }
.t-dark .placeholder { color: rgba(245, 247, 255, 0.35); }
.commit {
  margin-top: 14rpx;
  height: 78rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #5a8eff, #2e63ff);
  box-shadow: 0 14rpx 36rpx rgba(46, 99, 255, 0.28);
}
.commitText { color: #fff; font-size: 22rpx; font-weight: 720; }
</style>
