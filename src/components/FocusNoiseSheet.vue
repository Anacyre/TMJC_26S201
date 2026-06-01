<template>
  <Teleport to="body">
    <view v-if="open" class="overlay" :class="[themeClass, { show: visible }]" @tap="close">
      <view class="sheet" @tap.stop>
        <view class="grabber" />

        <view v-if="mode === 'pick'" class="head">
          <text class="title">Ambient sound</text>
          <text class="sub">Choose a background for focus</text>
        </view>
        <view v-else class="head">
          <text class="title">Add sound</text>
          <text class="sub">MP3 or WAV, up to 30 minutes</text>
        </view>

        <scroll-view v-if="mode === 'pick'" class="body" scroll-y :show-scrollbar="false">
          <view class="grid">
            <view
              v-for="n in sounds"
              :key="n.id"
              class="tile tap"
              :class="{ on: pendingId === n.id }"
              role="button"
              @tap="pendingId = n.id"
              @longpress="onLongPress(n)"
            >
              <view class="iconOrb" :class="{ muted: n.id === 'silence' }" :style="orbStyle(n)">
                <view class="noiseIcon" :class="'ic-' + (n.icon || 'silence')" />
              </view>
              <text class="tileLabel">{{ n.name }}</text>
            </view>
          </view>
        </scroll-view>

        <scroll-view v-else class="body" scroll-y :show-scrollbar="false">
          <view class="fieldBlock">
            <text class="fieldLabel">Name</text>
            <input class="fieldInput" v-model="addName" maxlength="24" placeholder="Sound name" placeholder-class="ph" />
          </view>

          <view class="fieldBlock">
            <text class="fieldLabel">Icon</text>
            <view class="iconGrid">
              <view
                v-for="ic in iconPresets"
                :key="ic.id"
                class="iconPick tap"
                :class="{ on: addIcon === ic.id }"
                role="button"
                @tap="addIcon = ic.id"
              >
                <view class="iconOrb sm" :style="{ background: ic.color }">
                  <view class="noiseIcon" :class="'ic-' + ic.id" />
                </view>
                <text class="iconPickLabel">{{ ic.label }}</text>
              </view>
            </view>
          </view>

          <view class="fieldBlock">
            <text class="fieldLabel">Audio file</text>
            <view class="fileRow tap" role="button" @tap="pickFile">
              <text class="fileText">{{ addFileLabel }}</text>
            </view>
          </view>
        </scroll-view>

        <view class="foot">
          <view v-if="mode === 'pick' && isAdmin" class="ghostRow">
            <view class="ghostBtn tap" role="button" @tap="toggleVis">
              <view class="eyeMini" :class="{ open: visibility === 'public' }" />
              <text class="ghostText">Public hours</text>
            </view>
          </view>

          <view class="actions">
            <template v-if="mode === 'pick'">
              <view v-if="isAdmin" class="secBtn tap" role="button" @tap="enterAdd">
                <text class="secBtnText">Add</text>
              </view>
              <view class="mainBtn tap" :class="{ disabled: !pendingId }" role="button" @tap="confirmPick">
                <text class="mainBtnText">Confirm</text>
              </view>
            </template>
            <template v-else>
              <view class="secBtn tap" role="button" @tap="mode = 'pick'">
                <text class="secBtnText">Back</text>
              </view>
              <view class="mainBtn tap" :class="{ loading: uploading, disabled: !canSubmitAdd }" role="button" @tap="submitAdd">
                <text class="mainBtnText">{{ uploading ? 'Uploading…' : 'Upload' }}</text>
              </view>
            </template>
          </view>
        </view>
      </view>
    </view>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { useTheme } from '@/composables/useTheme'
import { deleteConfirm } from '@/composables/useConfirmDelete'
import { NOISE_ICON_PRESETS, chooseFocusSoundFile } from '@/lib/focusNoise'

const props = defineProps({
  open: { type: Boolean, default: false },
  sounds: { type: Array, default: () => [] },
  selectedId: { type: String, default: 'silence' },
  visibility: { type: String, default: 'public' },
  isAdmin: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'confirm', 'toggle-visibility', 'upload', 'uploaded', 'removed'])

const { themeClass } = useTheme()
const visible = ref(false)
const mode = ref('pick')
const pendingId = ref('silence')
const addName = ref('')
const addIcon = ref('water')
const addFile = ref(null)
const addFileName = ref('')
const addDuration = ref(0)
const uploading = ref(false)

const iconPresets = NOISE_ICON_PRESETS

const addFileLabel = computed(() => addFileName.value || 'Choose MP3 or WAV…')
const canSubmitAdd = computed(() => !!addName.value.trim() && !!addFile.value && !uploading.value)

watch(() => props.open, async (v) => {
  if (v) {
    pendingId.value = props.selectedId || 'silence'
    mode.value = 'pick'
    addName.value = ''
    addIcon.value = 'water'
    addFile.value = null
    addFileName.value = ''
    await nextTick()
    visible.value = true
  } else {
    visible.value = false
  }
})

function orbStyle(n) {
  if (n.id === 'silence') return {}
  return { background: n.color }
}

function close() {
  visible.value = false
  setTimeout(() => emit('close'), 220)
}

function confirmPick() {
  if (!pendingId.value) return
  emit('confirm', pendingId.value)
  close()
}

function toggleVis() {
  emit('toggle-visibility')
}

function enterAdd() {
  mode.value = 'add'
}

async function pickFile() {
  try {
    const chosen = await chooseFocusSoundFile()
    addFile.value = chosen.picked
    addDuration.value = chosen.durationSeconds
    addFileName.value = chosen.picked.name || chosen.baseName
    if (!addName.value.trim()) addName.value = chosen.baseName
  } catch (e) {
    if (String(e?.errMsg || e?.message || '').includes('cancel')) return
    uni.showToast({ title: e?.message || 'Could not read file', icon: 'none' })
  }
}

async function submitAdd() {
  if (!canSubmitAdd.value || uploading.value) return
  uploading.value = true
  emit('upload', {
    name: addName.value.trim(),
    icon: addIcon.value,
    picked: addFile.value,
    durationSeconds: addDuration.value,
  })
}

async function onLongPress(n) {
  if (!props.isAdmin || n.source !== 'shared' || n.id === 'silence') return
  const ok = await deleteConfirm.focusNoise(n.name)
  if (ok) emit('removed', n.id)
}

watch(mode, (v) => {
  if (v === 'add') {
    addName.value = ''
    addIcon.value = 'water'
    addFile.value = null
    addFileName.value = ''
    addDuration.value = 0
  }
})

function finishUpload(ok = true) {
  uploading.value = false
  if (!ok) return
  mode.value = 'pick'
  addName.value = ''
  addIcon.value = 'water'
  addFile.value = null
  addFileName.value = ''
  addDuration.value = 0
}

defineExpose({ finishUpload })
</script>

<style scoped>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(8, 12, 20, 0);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  transition: background 220ms ease;
}
.overlay.show { background: rgba(8, 12, 20, 0.38); }

.sheet {
  width: 100%;
  max-width: 680rpx;
  max-height: 78vh;
  padding: 12rpx 24rpx calc(20rpx + env(safe-area-inset-bottom));
  border-radius: 28rpx 28rpx 0 0;
  background: rgba(255, 255, 255, 0.94);
  backdrop-filter: blur(18px);
  transform: translateY(110%);
  transition: transform 260ms ease;
}
.overlay.show .sheet { transform: translateY(0); }
.t-dark .sheet { background: rgba(26, 29, 33, 0.96); }

.grabber {
  width: 56rpx;
  height: 8rpx;
  margin: 0 auto 16rpx;
  border-radius: 999rpx;
  background: rgba(16, 24, 40, 0.12);
}
.t-dark .grabber { background: rgba(255, 255, 255, 0.14); }

.head { margin-bottom: 18rpx; }
.title {
  display: block;
  font-size: 30rpx;
  font-weight: 740;
  color: rgba(16, 24, 40, 0.92);
}
.t-dark .title { color: rgba(245, 247, 255, 0.92); }
.sub {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.48);
}
.t-dark .sub { color: rgba(245, 247, 255, 0.48); }

.body { max-height: 52vh; }

.grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  padding-bottom: 8rpx;
}
.tile {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
  padding: 14rpx 8rpx;
  border-radius: 20rpx;
  border: 1rpx solid transparent;
}
.tile.on {
  background: rgba(46, 99, 255, 0.08);
  border-color: rgba(46, 99, 255, 0.22);
}

.iconOrb {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(46, 99, 255, 0.12);
}
.iconOrb.sm { width: 56rpx; height: 56rpx; }
.iconOrb.muted {
  background: transparent;
  border: 2rpx dashed rgba(142, 142, 147, 0.35);
}

.tileLabel {
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.72);
  text-align: center;
}
.t-dark .tileLabel { color: rgba(245, 247, 255, 0.72); }

.noiseIcon { width: 28rpx; height: 28rpx; position: relative; }
.iconOrb.sm .noiseIcon { width: 24rpx; height: 24rpx; }

.ic-silence::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 20rpx;
  height: 20rpx;
  margin: -10rpx 0 0 -10rpx;
  border: 2rpx solid rgba(142, 142, 147, 0.72);
  border-radius: 50%;
  background: transparent;
  box-sizing: border-box;
}

.ic-water::before {
  content: '';
  position: absolute;
  left: 4rpx;
  right: 4rpx;
  bottom: 6rpx;
  height: 2rpx;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 999rpx;
  box-shadow: 0 -6rpx 0 rgba(255, 255, 255, 0.55), 0 -12rpx 0 rgba(255, 255, 255, 0.28);
}

.ic-forest::before,
.ic-forest::after {
  content: '';
  position: absolute;
  bottom: 4rpx;
  width: 0;
  height: 0;
  border-left: 7rpx solid transparent;
  border-right: 7rpx solid transparent;
  border-bottom: 14rpx solid rgba(255, 255, 255, 0.88);
}
.ic-forest::before { left: 4rpx; }
.ic-forest::after { right: 4rpx; transform: scale(0.82); opacity: 0.75; }

.ic-beach::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 4rpx;
  width: 10rpx;
  height: 10rpx;
  margin-left: -5rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.9);
  box-shadow: 0 12rpx 0 -2rpx rgba(255, 255, 255, 0.55);
}
.ic-beach::after {
  content: '';
  position: absolute;
  left: 2rpx;
  right: 2rpx;
  bottom: 5rpx;
  height: 2rpx;
  background: rgba(255, 255, 255, 0.75);
  border-radius: 999rpx;
}

.ic-cafe::before {
  content: '';
  position: absolute;
  left: 7rpx;
  right: 7rpx;
  bottom: 5rpx;
  height: 10rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.88);
  border-top: none;
  border-radius: 0 0 4rpx 4rpx;
}
.ic-cafe::after {
  content: '';
  position: absolute;
  right: 3rpx;
  top: 10rpx;
  width: 6rpx;
  height: 8rpx;
  border: 2rpx solid rgba(255, 255, 255, 0.72);
  border-left: none;
  border-radius: 0 6rpx 6rpx 0;
}

.ic-library::before,
.ic-library::after {
  content: '';
  position: absolute;
  bottom: 5rpx;
  width: 6rpx;
  height: 14rpx;
  background: rgba(255, 255, 255, 0.82);
  border-radius: 2rpx 2rpx 0 0;
}
.ic-library::before { left: 6rpx; }
.ic-library::after { right: 6rpx; height: 11rpx; opacity: 0.72; }

.ic-rain::before {
  content: '';
  position: absolute;
  left: 50%;
  top: 4rpx;
  width: 14rpx;
  height: 8rpx;
  margin-left: -7rpx;
  border-radius: 8rpx 8rpx 4rpx 4rpx;
  background: rgba(255, 255, 255, 0.82);
}
.ic-rain::after {
  content: '';
  position: absolute;
  left: 8rpx;
  bottom: 4rpx;
  width: 2rpx;
  height: 8rpx;
  background: rgba(255, 255, 255, 0.65);
  border-radius: 999rpx;
  box-shadow: 6rpx 2rpx 0 rgba(255, 255, 255, 0.45), 12rpx -1rpx 0 rgba(255, 255, 255, 0.35);
}

.ic-wind::before {
  content: '';
  position: absolute;
  left: 4rpx;
  top: 10rpx;
  width: 16rpx;
  height: 2rpx;
  background: rgba(255, 255, 255, 0.82);
  border-radius: 999rpx;
  box-shadow: 0 -6rpx 0 rgba(255, 255, 255, 0.55), 0 6rpx 0 rgba(255, 255, 255, 0.45);
}

.ic-fire::before {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 4rpx;
  width: 0;
  height: 0;
  margin-left: -6rpx;
  border-left: 6rpx solid transparent;
  border-right: 6rpx solid transparent;
  border-bottom: 14rpx solid rgba(255, 255, 255, 0.88);
}
.ic-fire::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 8rpx;
  width: 0;
  height: 0;
  margin-left: -3rpx;
  border-left: 3rpx solid transparent;
  border-right: 3rpx solid transparent;
  border-bottom: 8rpx solid rgba(255, 220, 160, 0.95);
}

.fieldBlock { margin-bottom: 20rpx; }
.fieldLabel {
  display: block;
  margin-bottom: 8rpx;
  font-size: 22rpx;
  color: rgba(16, 24, 40, 0.58);
}
.t-dark .fieldLabel { color: rgba(245, 247, 255, 0.54); }
.fieldInput {
  height: 76rpx;
  padding: 0 18rpx;
  border-radius: 18rpx;
  background: rgba(16, 24, 40, 0.04);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  font-size: 26rpx;
  color: rgba(16, 24, 40, 0.92);
}
.t-dark .fieldInput {
  background: rgba(255, 255, 255, 0.05);
  border-color: rgba(255, 255, 255, 0.08);
  color: rgba(245, 247, 255, 0.92);
}
.ph { color: rgba(16, 24, 40, 0.32); }
.t-dark .ph { color: rgba(245, 247, 255, 0.28); }

.iconGrid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12rpx;
}
.iconPick {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6rpx;
  padding: 10rpx 4rpx;
  border-radius: 16rpx;
  border: 1rpx solid transparent;
}
.iconPick.on {
  background: rgba(46, 99, 255, 0.08);
  border-color: rgba(46, 99, 255, 0.2);
}
.iconPickLabel {
  font-size: 18rpx;
  color: rgba(16, 24, 40, 0.62);
}
.t-dark .iconPickLabel { color: rgba(245, 247, 255, 0.58); }

.fileRow {
  min-height: 76rpx;
  padding: 0 18rpx;
  border-radius: 18rpx;
  background: rgba(46, 99, 255, 0.06);
  border: 1rpx dashed rgba(46, 99, 255, 0.22);
  display: flex;
  align-items: center;
}
.fileText {
  font-size: 24rpx;
  color: rgba(46, 99, 255, 0.88);
}

.foot { margin-top: 12rpx; }
.ghostRow {
  display: flex;
  justify-content: center;
  margin-bottom: 12rpx;
  opacity: 0.28;
}
.ghostBtn {
  display: flex;
  align-items: center;
  gap: 8rpx;
}
.ghostText {
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.62);
}
.t-dark .ghostText { color: rgba(245, 247, 255, 0.62); }

.eyeMini {
  width: 22rpx;
  height: 14rpx;
  border-radius: 999rpx;
  border: 2rpx solid rgba(16, 24, 40, 0.45);
  position: relative;
}
.eyeMini::after {
  content: '';
  position: absolute;
  left: 50%;
  top: 50%;
  width: 6rpx;
  height: 6rpx;
  margin: -3rpx 0 0 -3rpx;
  border-radius: 50%;
  background: rgba(16, 24, 40, 0.45);
}
.eyeMini.open::before {
  content: '';
  position: absolute;
  left: -3rpx;
  right: -3rpx;
  top: 50%;
  height: 2rpx;
  margin-top: -1rpx;
  background: rgba(16, 24, 40, 0.35);
  transform: rotate(-28deg);
}
.t-dark .eyeMini { border-color: rgba(245, 247, 255, 0.45); }
.t-dark .eyeMini::after { background: rgba(245, 247, 255, 0.45); }

.actions {
  display: flex;
  gap: 12rpx;
}
.secBtn,
.mainBtn {
  flex: 1;
  height: 84rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.secBtn {
  background: rgba(16, 24, 40, 0.05);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
}
.t-dark .secBtn {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}
.mainBtn {
  background: linear-gradient(180deg, #4f86ff, #2e63ff);
}
.mainBtn.disabled { opacity: 0.45; }
.secBtnText {
  font-size: 26rpx;
  font-weight: 640;
  color: rgba(16, 24, 40, 0.72);
}
.t-dark .secBtnText { color: rgba(245, 247, 255, 0.72); }
.mainBtnText {
  font-size: 26rpx;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.96);
}

.tap:active { transform: scale(0.985); }
</style>
