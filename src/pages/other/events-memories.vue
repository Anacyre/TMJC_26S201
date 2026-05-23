<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader title="Events & Memories" nav-mode="back" :show-avatar="false" />
    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
      <view v-for="x in timeline" :key="x.id" class="card">
        <text class="date">{{ x.date }}</text>
        <text class="title">{{ x.title }}</text>
        <text class="desc">{{ x.desc }}</text>
        <view class="photo">{{ x.photo }}</view>
      </view>
      <view class="gap" />
    </scroll-view>
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import { useTheme } from '@/composables/useTheme'
const { themeClass } = useTheme()
const timeline = ref([
  { id: 'e1', date: 'May 2026', title: 'Class Hacknight', desc: 'A calm evening of tiny builds and demos.', photo: 'Event Photo Placeholder' },
  { id: 'e2', date: 'Apr 2026', title: 'Sports Day', desc: 'Shared highlights and snapshots.', photo: 'Activity Post Placeholder' },
  { id: 'e3', date: 'Mar 2026', title: 'Community Showcase', desc: 'Creative work from art and coding circles.', photo: 'Timeline Card Placeholder' },
])
</script>

<style scoped>
.page{min-height:100vh;position:relative;overflow:hidden}.bg{position:absolute;inset:0;background:radial-gradient(1200rpx 800rpx at 40% 0%,rgba(40,110,255,.16),transparent 60%),linear-gradient(180deg,#f8faff,#f1f4fa)}.t-dark .bg{background:radial-gradient(1200rpx 800rpx at 40% 0%,rgba(60,120,255,.14),transparent 58%),linear-gradient(180deg,#111315,#0e1014)}
.scroll{position:relative;z-index:1;height:calc(100vh - 110rpx);padding:6rpx 24rpx 40rpx}.card{margin-top:12rpx;padding:18rpx;border-radius:24rpx;background:rgba(255,255,255,.74);border:1rpx solid rgba(255,255,255,.6);box-shadow:0 14rpx 44rpx rgba(12,20,40,.08)}.t-dark .card{background:#1a1d21;border-color:rgba(255,255,255,.06);box-shadow:0 18rpx 52rpx rgba(0,0,0,.36)}
.date{font-size:18rpx;color:rgba(46,99,255,.9);font-weight:700}.t-dark .date{color:rgba(170,200,255,.95)}.title{display:block;margin-top:8rpx;font-size:24rpx;font-weight:740;color:rgba(16,24,40,.92)}.t-dark .title{color:#f5f7fa}.desc{display:block;margin-top:6rpx;font-size:20rpx;color:rgba(16,24,40,.6)}.t-dark .desc{color:#9aa4b2}.photo{margin-top:12rpx;height:160rpx;border-radius:16rpx;background:rgba(16,24,40,.04);border:1rpx solid rgba(16,24,40,.04);display:flex;align-items:center;justify-content:center;font-size:18rpx;color:rgba(16,24,40,.4)}.t-dark .photo{background:#23272d;border-color:rgba(255,255,255,.04);color:rgba(245,247,255,.4)}
.gap{height:24rpx}
</style>
