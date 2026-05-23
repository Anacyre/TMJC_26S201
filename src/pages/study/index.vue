<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader title="Study" nav-mode="back" :show-avatar="false" />
    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
      <view class="grid">
        <view v-for="s in subjectsView" :key="s.id" class="card" role="button" @tap="openSubject(s.id)">
          <view class="icon">{{ s.icon }}</view>
          <text class="name">{{ s.name }}</text>
          <text class="meta">{{ s.filesCount }} files · {{ s.updatedLabel }}</text>
        </view>
      </view>
      <view class="listHead"><text>Latest Resources</text></view>
      <view v-for="r in latestResourcesView.slice(0,3)" :key="r.id" class="row" role="button" @tap="openResource(r.id)">
        <text class="rTitle">{{ r.title }}</text>
        <text class="rMeta">{{ r.type }} · {{ r.uploaderName }}</text>
      </view>
      <view class="gap" />
    </scroll-view>
    <BottomNav active="study" />
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed } from 'vue'
import BottomNav from '@/components/BottomNav.vue'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import { useTheme } from '@/composables/useTheme'
import { useStudyStore } from '@/composables/useStudyStore'
const { themeClass } = useTheme()
const { subjects, latestResources } = useStudyStore()

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

const subjectsView = computed(() =>
  subjects.value.map((s) => ({
    ...s,
    updatedLabel: shortTimeLabel(s.updatedAt),
  }))
)

const latestResourcesView = computed(() => latestResources.value)

function openSubject(id) { uni.navigateTo({ url: `/pages/study/feed?id=${id}`, animationType: 'pop-in', animationDuration: 240 }) }
function openResource(id) { uni.navigateTo({ url: `/pages/study/detail?id=${id}`, animationType: 'slide-in-right', animationDuration: 220 }) }
</script>

<style scoped>
.page{min-height:100vh;position:relative;overflow:hidden}.bg{position:absolute;inset:0;background:radial-gradient(1200rpx 800rpx at 40% 0%,rgba(40,110,255,.16),transparent 60%),linear-gradient(180deg,#f8faff,#f1f4fa)}.t-dark .bg{background:radial-gradient(1200rpx 800rpx at 40% 0%,rgba(60,120,255,.14),transparent 58%),linear-gradient(180deg,#111315,#0e1014)}
.scroll{position:relative;z-index:1;height:calc(100vh - 110rpx);padding:6rpx 28rpx 180rpx}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12rpx}.card{padding:18rpx;border-radius:24rpx;background:rgba(255,255,255,.74);border:1rpx solid rgba(255,255,255,.6);box-shadow:0 14rpx 44rpx rgba(12,20,40,.08);transition:transform 180ms ease,background 220ms ease,border-color 220ms ease}.t-dark .card{background:#1a1d21;border-color:rgba(255,255,255,.06);box-shadow:0 18rpx 52rpx rgba(0,0,0,.36)}.card:active{transform:scale(.985)}
.icon{width:54rpx;height:54rpx;border-radius:16rpx;background:rgba(46,99,255,.12);display:flex;align-items:center;justify-content:center;color:rgba(46,99,255,.95);font-size:24rpx;font-weight:700}.t-dark .icon{background:rgba(120,160,255,.16);color:rgba(170,200,255,.96)}.name{display:block;margin-top:12rpx;font-size:24rpx;font-weight:730;color:rgba(16,24,40,.9)}.t-dark .name{color:#f5f7fa}.meta{display:block;margin-top:4rpx;font-size:19rpx;color:rgba(16,24,40,.54)}.t-dark .meta{color:#9aa4b2}
.listHead{margin-top:18rpx;padding:8rpx 2rpx;font-size:21rpx;color:rgba(16,24,40,.58)}.t-dark .listHead{color:rgba(245,247,255,.58)}.row{margin-top:10rpx;padding:16rpx;border-radius:20rpx;background:rgba(255,255,255,.7);border:1rpx solid rgba(16,24,40,.04);transition:background 220ms ease,border-color 220ms ease}.t-dark .row{background:#1a1d21;border-color:rgba(255,255,255,.06)}.rTitle{font-size:22rpx;font-weight:700;color:rgba(16,24,40,.9)}.t-dark .rTitle{color:#f5f7fa}.rMeta{display:block;margin-top:6rpx;font-size:19rpx;color:rgba(16,24,40,.54)}.t-dark .rMeta{color:#9aa4b2}.gap{height:24rpx}
</style>
