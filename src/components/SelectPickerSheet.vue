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

        <scroll-view class="body" scroll-y :show-scrollbar="false">
          <view class="list">
            <view
              v-for="opt in options"
              :key="opt"
              class="row tap"
              :class="{ on: opt === selected }"
              role="button"
              @tap="pick(opt)"
            >
              <view class="chip" :class="colorClass(opt)">
                <view class="chipDot" />
                <text class="chipText">{{ opt }}</text>
              </view>
              <text v-if="opt === selected" class="check">OK</text>
            </view>
          </view>

          <view v-if="allowCreate" class="createBlock">
            <text class="createLabel">Add new</text>
            <view class="createRow">
              <input
                class="createInput"
                v-model="draft"
                :placeholder="createPlaceholder"
                placeholder-class="ph"
                maxlength="24"
              />
              <view class="createBtn" role="button" @tap="commitCreate">
                <text class="createBtnText">Add</text>
              </view>
            </view>
          </view>
        </scroll-view>
      </view>
    </view>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({
  open: { type: Boolean, default: false },
  options: { type: Array, default: () => [] },
  selected: { type: String, default: '' },
  allowCreate: { type: Boolean, default: false },
  kind: { type: String, default: 'subject' },
})

const emit = defineEmits(['close', 'pick', 'create'])

const { themeClass } = useTheme()
const visible = ref(false)
const draft = ref('')

const createPlaceholder = computed(() =>
  props.kind === 'subject' ? 'e.g. Biology' : 'e.g. Project'
)

function colorClass(name) {
  const n = String(name || '').toLowerCase()
  if (n.includes('math')) return 'c-blue'
  if (n.includes('phys')) return 'c-violet'
  if (n.includes('chem')) return 'c-green'
  if (n.includes('econ')) return 'c-amber'
  if (n === 'gp' || n.includes('general')) return 'c-rose'
  return 'c-slate'
}

function close() {
  visible.value = false
  setTimeout(() => emit('close'), 220)
}

function pick(value) {
  emit('pick', value)
  close()
}

function commitCreate() {
  const value = draft.value.trim()
  if (!value) return
  emit('create', value)
  emit('pick', value)
  close()
}

watch(
  () => props.open,
  (next) => {
    if (next) {
      draft.value = ''
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
  z-index: 130;
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
  max-height: min(68vh, 620px);
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
  max-height: calc(min(68vh, 620px) - 48rpx);
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

.chip.c-blue { background: rgba(46, 99, 255, 0.10); border-color: rgba(46, 99, 255, 0.22); }
.chip.c-blue .chipDot { background: rgba(46, 99, 255, 0.95); }
.chip.c-blue .chipText { color: rgba(46, 99, 255, 0.96); }
.chip.c-violet { background: rgba(120, 90, 220, 0.10); border-color: rgba(120, 90, 220, 0.22); }
.chip.c-violet .chipDot { background: rgba(120, 90, 220, 0.95); }
.chip.c-green { background: rgba(36, 160, 110, 0.10); border-color: rgba(36, 160, 110, 0.22); }
.chip.c-green .chipDot { background: rgba(36, 160, 110, 0.95); }
.chip.c-amber { background: rgba(220, 140, 30, 0.12); border-color: rgba(220, 140, 30, 0.24); }
.chip.c-amber .chipDot { background: rgba(220, 140, 30, 0.95); }
.chip.c-rose { background: rgba(220, 80, 110, 0.10); border-color: rgba(220, 80, 110, 0.22); }
.chip.c-rose .chipDot { background: rgba(220, 80, 110, 0.95); }

.check {
  font-size: 18rpx;
  font-weight: 760;
  color: rgba(46, 99, 255, 0.96);
  letter-spacing: 0.4rpx;
}
.t-dark .check { color: rgba(170, 200, 255, 0.96); }

.createBlock {
  margin-top: 8rpx;
  margin-bottom: 8rpx;
  padding: 18rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx dashed rgba(46, 99, 255, 0.28);
}
.t-dark .createBlock {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(120, 160, 255, 0.32);
}
.createLabel {
  font-size: 20rpx;
  font-weight: 660;
  color: rgba(16, 24, 40, 0.55);
}
.t-dark .createLabel { color: rgba(245, 247, 255, 0.55); }
.createRow {
  margin-top: 12rpx;
  display: flex;
  gap: 10rpx;
  align-items: center;
}
.createInput {
  flex: 1;
  height: 76rpx;
  padding: 0 16rpx;
  border-radius: 18rpx;
  background: rgba(16, 24, 40, 0.04);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.92);
}
.t-dark .createInput {
  background: #23272d;
  border-color: rgba(255, 255, 255, 0.08);
  color: #f5f7fa;
}
.ph { color: rgba(16, 24, 40, 0.35); }
.t-dark .ph { color: rgba(245, 247, 255, 0.35); }
.createBtn {
  height: 76rpx;
  padding: 0 22rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(180deg, #5a8eff, #2e63ff);
}
.createBtnText { color: #fff; font-size: 20rpx; font-weight: 720; }
</style>
