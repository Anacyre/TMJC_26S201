<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader title="Resource" nav-mode="back" />
    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
      <view class="card pad">
        <view class="head">
          <text class="type">{{ resource.type }}</text>
          <text class="time">{{ timeLabel }}</text>
        </view>
        <text class="title">{{ resource.title }}</text>
        <text class="meta">Uploaded by {{ resource.uploaderName || 'Unknown' }}</text>
        <view class="preview"><text class="previewText">File preview placeholder</text></view>
        <view class="actions">
          <view class="btn primary" role="button" @tap="onDownload">
            <text class="btnTextPrimary">Download</text>
          </view>
          <view class="btn" :class="{ on: likedState }" role="button" @tap="onLike">
            <text class="btnText">{{ likedState ? 'â™?Liked' : 'â™?Like' }}</text>
          </view>
        </view>
      </view>
      <view class="card pad sub">
        <text class="sec">Comments</text>
        <view class="emptyInline">
          <EmptyState
            variant="posts"
            title="No comments yet"
            subtitle="Discussion threads on resources will appear here."
          />
        </view>
      </view>
      <view class="gap" />
    </scroll-view>
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useTheme } from '@/composables/useTheme'
import { useStudyStore } from '@/composables/useStudyStore'
import { toast } from '@/composables/useToast'

const { themeClass } = useTheme()
const { getResourceById, toggleResourceLike, downloadResource } = useStudyStore()
const id = ref('r1')
const resource = computed(() => getResourceById(id.value))
const likedState = computed(() => !!resource.value?.liked)
const timeLabel = computed(() => shortTimeLabel(resource.value?.createdAt))

function shortTimeLabel(iso) {
  if (!iso) return 'just now'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d ago`
  return new Date(iso).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })
}

function onLike() {
  if (!resource.value?.id) return
  toggleResourceLike(resource.value.id)
  toast.updated()
}

async function onDownload() {
  if (!resource.value?.id) return
  await downloadResource(resource.value.id)
  toast.show('Download queued')
}

onLoad((q) => {
  id.value = q?.id || 'r1'
})
</script>

<style scoped>
.page {
  min-height: 100vh;
  position: relative;
  overflow: hidden;
}
.bg {
  position: absolute;
  inset: 0;
  z-index: 0;
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.16), transparent 60%),
    linear-gradient(180deg, #f8faff, #f1f4fa);
}
.t-dark .bg {
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%),
    linear-gradient(180deg, #111315, #0e1014);
}
.scroll {
  position: relative;
  z-index: 1;
  height: calc(100vh - 110rpx);
  padding: 4rpx 28rpx 40rpx;
}
.card {
  margin-top: 12rpx;
  border-radius: 28rpx;
  background: rgba(255, 255, 255, 0.74);
  border: 1rpx solid rgba(255, 255, 255, 0.6);
  box-shadow: 0 16rpx 50rpx rgba(12, 20, 40, 0.08);
  transition: background 220ms ease, border-color 220ms ease;
}
.t-dark .card {
  background: #1a1d21;
  border-color: rgba(255, 255, 255, 0.06);
  box-shadow: 0 22rpx 60rpx rgba(0, 0, 0, 0.4);
}
.pad {
  padding: 20rpx 22rpx;
}
.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10rpx;
}
.type {
  font-size: 18rpx;
  font-weight: 720;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: rgba(46, 99, 255, 0.12);
  color: rgba(46, 99, 255, 0.96);
}
.t-dark .type {
  background: rgba(120, 160, 255, 0.16);
  color: rgba(170, 200, 255, 0.95);
}
.time {
  font-size: 18rpx;
  color: rgba(16, 24, 40, 0.5);
}
.t-dark .time {
  color: #9aa4b2;
}
.title {
  display: block;
  margin-top: 12rpx;
  font-size: 30rpx;
  font-weight: 760;
  color: rgba(16, 24, 40, 0.92);
}
.t-dark .title {
  color: #f5f7fa;
}
.meta {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.56);
}
.t-dark .meta {
  color: #9aa4b2;
}
.preview {
  margin-top: 14rpx;
  height: 220rpx;
  border-radius: 18rpx;
  background: rgba(16, 24, 40, 0.04);
  border: 1rpx solid rgba(16, 24, 40, 0.04);
  display: flex;
  align-items: center;
  justify-content: center;
}
.t-dark .preview {
  background: #23272d;
  border-color: rgba(255, 255, 255, 0.04);
}
.previewText {
  font-size: 20rpx;
  color: rgba(16, 24, 40, 0.46);
}
.t-dark .previewText {
  color: rgba(245, 247, 255, 0.45);
}
.actions {
  margin-top: 14rpx;
  display: flex;
  gap: 10rpx;
}
.btn {
  flex: 1;
  height: 74rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 24, 40, 0.05);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  transition: transform 160ms ease, background 200ms ease;
}
.t-dark .btn {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.08);
}
.btn:active {
  transform: scale(0.98);
}
.btn.primary {
  background: linear-gradient(180deg, #5a8eff, #2e63ff);
  border-color: transparent;
  box-shadow: 0 16rpx 40rpx rgba(46, 99, 255, 0.28);
}
.btn.on {
  background: rgba(46, 99, 255, 0.14);
  border-color: rgba(46, 99, 255, 0.22);
}
.btnText {
  font-size: 21rpx;
  font-weight: 720;
  color: rgba(16, 24, 40, 0.78);
}
.t-dark .btnText {
  color: rgba(245, 247, 255, 0.82);
}
.btn.on .btnText {
  color: rgba(46, 99, 255, 0.96);
}
.btnTextPrimary {
  font-size: 21rpx;
  font-weight: 740;
  color: #fff;
}
.sec {
  font-size: 22rpx;
  font-weight: 640;
  color: rgba(16, 24, 40, 0.62);
}
.t-dark .sec {
  color: rgba(245, 247, 255, 0.62);
}
.emptyInline { padding: 8rpx 0; }
.gap {
  height: 24rpx;
}
</style>
