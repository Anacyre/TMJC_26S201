<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader :title="pageTitle" nav-mode="back" />

    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
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

      <view class="gap" />
    </scroll-view>
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import AppHeader from '@/components/AppHeader.vue'
import { useTheme } from '@/composables/useTheme'
import {
  getPicker,
  completePicker,
  createAndCompletePicker,
  dropPicker,
} from '@/lib/pickerSession'

const { themeClass } = useTheme()

const sessionId = ref('')
const pageTitle = ref('Choose')
const options = ref([])
const selected = ref('')
const allowCreate = ref(false)
const kind = ref('subject')
const draft = ref('')

const createPlaceholder = computed(() =>
  kind.value === 'subject' ? 'e.g. Biology' : 'e.g. Project'
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

function pick(value) {
  if (!sessionId.value) return
  completePicker(sessionId.value, value)
}

function commitCreate() {
  const value = draft.value.trim()
  if (!value || !sessionId.value) return
  createAndCompletePicker(sessionId.value, value)
}

onLoad((q) => {
  sessionId.value = q?.id || ''
  const cfg = getPicker(sessionId.value)
  if (!cfg) {
    pageTitle.value = 'Choose'
    return
  }
  pageTitle.value = cfg.title || 'Choose'
  options.value = Array.isArray(cfg.options) ? cfg.options : []
  selected.value = cfg.value || ''
  allowCreate.value = !!cfg.allowCreate
  kind.value = cfg.kind || 'subject'
})

onUnload(() => {
  if (sessionId.value) dropPicker(sessionId.value)
})
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; }
.bg {
  position: absolute; inset: 0;
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.16), transparent 60%),
    linear-gradient(180deg, #f8faff, #f1f4fa);
}
.t-dark .bg {
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%),
    linear-gradient(180deg, #111315, #0e1014);
}

.scroll {
  position: relative; z-index: 1;
  height: calc(100vh - var(--shell-header-offset, 116rpx));
  padding: 12rpx 28rpx 40rpx;
}

.list { display: flex; flex-direction: column; gap: 10rpx; }

.row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16rpx 18rpx; border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.72);
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
  display: inline-flex; align-items: center; gap: 10rpx;
  padding: 8rpx 14rpx; border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.06);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
}
.t-dark .chip { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.08); }
.chipDot { width: 10rpx; height: 10rpx; border-radius: 50%; background: rgba(16, 24, 40, 0.42); }
.t-dark .chipDot { background: rgba(245, 247, 255, 0.42); }
.chipText { font-size: 22rpx; font-weight: 700; color: rgba(16, 24, 40, 0.86); }
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

.check { font-size: 18rpx; font-weight: 760; color: rgba(46, 99, 255, 0.96); letter-spacing: 0.4rpx; }
.t-dark .check { color: rgba(170, 200, 255, 0.96); }

.createBlock {
  margin-top: 24rpx; padding: 18rpx;
  border-radius: 22rpx;
  background: rgba(255, 255, 255, 0.62);
  border: 1rpx dashed rgba(46, 99, 255, 0.28);
}
.t-dark .createBlock {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(120, 160, 255, 0.32);
}
.createLabel { font-size: 20rpx; font-weight: 660; color: rgba(16, 24, 40, 0.55); }
.t-dark .createLabel { color: rgba(245, 247, 255, 0.55); }
.createRow { margin-top: 12rpx; display: flex; gap: 10rpx; align-items: center; }
.createInput {
  flex: 1; height: 76rpx; padding: 0 16rpx; border-radius: 18rpx;
  background: rgba(16, 24, 40, 0.04); border: 1rpx solid rgba(16, 24, 40, 0.08);
  font-size: 22rpx; color: rgba(16, 24, 40, 0.92);
}
.t-dark .createInput {
  background: #23272d; border-color: rgba(255, 255, 255, 0.08); color: #f5f7fa;
}
.ph { color: rgba(16, 24, 40, 0.35); }
.t-dark .ph { color: rgba(245, 247, 255, 0.35); }
.createBtn {
  height: 76rpx; padding: 0 22rpx; border-radius: 18rpx;
  display: flex; align-items: center; justify-content: center;
  background: linear-gradient(180deg, #5a8eff, #2e63ff);
}
.createBtnText { color: #fff; font-size: 20rpx; font-weight: 720; }
.gap { height: 32rpx; }
</style>
