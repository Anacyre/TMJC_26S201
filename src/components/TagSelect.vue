<template>
  <view class="tagSelect" :class="themeClass">
    <view class="control tap" role="button" @tap="pickerOpen = true">
      <view class="left">
        <view class="chip" :class="resolvedColorClass">
          <view class="chipDot" />
          <text class="chipText">{{ modelValue || placeholder }}</text>
        </view>
      </view>
      <view class="chev"><text class="chevText">&gt;</text></view>
    </view>

    <SelectPickerSheet
      :open="pickerOpen"
      :options="pickerRange"
      :selected="modelValue"
      :allow-create="allowCreate && canCreate"
      :kind="kind"
      @close="pickerOpen = false"
      @pick="onPick"
      @create="onCreate"
    />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useTheme } from '@/composables/useTheme'
import SelectPickerSheet from '@/components/SelectPickerSheet.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: 'Select tag' },
  allowCreate: { type: Boolean, default: false },
  canCreate: { type: Boolean, default: false },
  kind: { type: String, default: 'subject' },
  color: { type: String, default: '' },
})

const emit = defineEmits(['update:modelValue', 'create'])

const { themeClass } = useTheme()
const pickerOpen = ref(false)

const pickerRange = computed(() =>
  props.options.map((o) => (typeof o === 'string' ? o : o.name || o.label))
)

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

function onPick(value) {
  emit('update:modelValue', value)
}

function onCreate(value) {
  emit('create', value)
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
  transition: border-color 200ms ease, background 200ms ease, transform 140ms ease;
}
.t-dark .control {
  background: #23272d;
  border-color: rgba(255, 255, 255, 0.08);
}
.control.tap:active { transform: scale(0.99); }

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
  opacity: 0.45;
}
.chevText { font-size: 22rpx; color: rgba(16, 24, 40, 0.55); font-weight: 300; }
.t-dark .chevText { color: rgba(245, 247, 255, 0.55); }
</style>
