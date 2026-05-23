<template>
  <view class="wrap" :class="themeClass">
    <view class="bg" />
    <view class="indicatorTrack">
      <view class="indicator" :style="{ transform: `translateX(${indicatorX}%)` }" />
    </view>
    <view class="row">
      <view class="item" :class="{ active: active === 'tasks' }" role="button" @tap="go('tasks')">
        <view class="iconWrap"><view class="icon iconTasks"><view class="line top" /><view class="line bottom" /></view></view>
        <text class="label">Tasks</text>
      </view>
      <view class="item" :class="{ active: active === 'community' }" role="button" @tap="go('community')">
        <view class="iconWrap"><view class="icon iconCommunity"><view class="dot a" /><view class="dot b" /><view class="bridge" /></view></view>
        <text class="label">Community</text>
      </view>
      <view class="item homeItem" :class="{ active: active === 'home', bounce: bounceHome }" role="button" @tap="go('home')">
        <view class="iconWrap homeIconWrap">
          <view class="homeGlyph">
            <view class="homeRoof" />
            <view class="homeBase" />
          </view>
        </view>
        <text class="label">Home</text>
      </view>
      <view class="item" :class="{ active: active === 'study' }" role="button" @tap="go('study')">
        <view class="iconWrap"><view class="icon iconStudy"><view class="sheet a" /><view class="sheet b" /></view></view>
        <text class="label">Study</text>
      </view>
      <view class="item" :class="{ active: active === 'other' }" role="button" @tap="go('other')">
        <view class="iconWrap">
          <view class="iconOther">
            <view class="oDot" />
            <view class="oDot" />
            <view class="oDot" />
          </view>
        </view>
        <text class="label">Other</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { useTheme } from '@/composables/useTheme'

const props = defineProps({ active: { type: String, default: 'home' } })
const { themeClass } = useTheme()
const bounceHome = ref(false)
const tabs = ['tasks', 'community', 'home', 'study', 'other']

const indicatorX = computed(() => {
  const idx = tabs.indexOf(props.active)
  if (idx < 0) return 0
  return idx * 100
})

watch(
  () => props.active,
  (v) => {
    if (v === 'home' || v === 'tasks') {
      bounceHome.value = true
      setTimeout(() => (bounceHome.value = false), 160)
    }
  },
  { immediate: true }
)

function go(key) {
  if (key === props.active) return
  if (key === 'home') return uni.navigateTo({ url: '/pages/index/index', animationType: 'fade-in', animationDuration: 150 })
  if (key === 'tasks') return uni.navigateTo({ url: '/pages/tasks/index', animationType: 'slide-in-right', animationDuration: 160 })
  if (key === 'community') return uni.navigateTo({ url: '/pages/community/index', animationType: 'slide-in-right', animationDuration: 160 })
  if (key === 'study') return uni.navigateTo({ url: '/pages/study/index', animationType: 'slide-in-right', animationDuration: 160 })
  if (key === 'other') return uni.navigateTo({ url: '/pages/other/other', animationType: 'slide-in-right', animationDuration: 160 })
}
</script>

<style scoped>
.wrap { position: fixed; left: 16rpx; right: 16rpx; bottom: calc(16rpx + env(safe-area-inset-bottom)); z-index: 40; height: 116rpx; }
.bg { position:absolute; inset:0; border-radius: 34rpx; background: rgba(255,255,255,.68); border:1rpx solid rgba(255,255,255,.55); box-shadow: 0 30rpx 80rpx rgba(12,20,40,.12); backdrop-filter: blur(16px); transition: background 240ms ease, border-color 240ms ease;}
.t-dark .bg { background: rgba(26,29,33,.78); border-color: rgba(255,255,255,.06); box-shadow: 0 34rpx 100rpx rgba(0,0,0,.55);}
.indicatorTrack { position: absolute; inset: 10rpx 12rpx 14rpx 12rpx; }
.indicator { width: 20%; height: 78rpx; border-radius: 20rpx; background: rgba(46,99,255,.12); border: none; transition: transform 160ms cubic-bezier(0.34,1.2,0.64,1), opacity 150ms ease;}
.t-dark .indicator { background: rgba(46,99,255,.16); }
.row { position:relative; height:100%; display:grid; grid-template-columns:repeat(5,1fr); align-items:center; justify-content:stretch; padding:0 10rpx 4rpx;}
.item { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4rpx; min-height:0; opacity:.68; transition: opacity 150ms ease, transform 150ms cubic-bezier(0.34,1.2,0.64,1);}
.item:active { transform: scale(0.97);}
.item.active { opacity:1; transform: translateY(-1rpx);}
.iconWrap{width:100%;height:40rpx;display:flex;align-items:center;justify-content:center;transition:transform 260ms cubic-bezier(.2,.7,.1,1)}
.item.active .iconWrap{transform:scale(1.06)}
.icon { position: relative; width: 28rpx; height: 24rpx; }
.iconTasks .line { position:absolute; left: 0; right:0; border-radius: 9rpx; border: 2rpx solid rgba(16,24,40,.58);}
.iconTasks .top { top: 1rpx; height: 8rpx;}
.iconTasks .bottom { bottom: 1rpx; left: 4rpx; right: -4rpx; height: 8rpx;}
.iconCommunity .dot { position:absolute; width: 12rpx; height: 12rpx; border-radius:50%; border:2rpx solid rgba(16,24,40,.58);}
.iconCommunity .a { left: 2rpx; top: 6rpx;}
.iconCommunity .b { right: 2rpx; top: 6rpx;}
.iconCommunity .bridge { position:absolute; left: 8rpx; right: 8rpx; top: 10rpx; height: 2rpx; background: rgba(16,24,40,.58);}
.iconStudy .sheet { position:absolute; border-radius: 7rpx; border:2rpx solid rgba(16,24,40,.58);}
.iconStudy .sheet.a { inset: 0 6rpx 4rpx 0;}
.iconStudy .sheet.b { inset: 4rpx 0 0 6rpx;}
.t-dark .iconTasks .line,
.t-dark .iconCommunity .dot,
.t-dark .iconStudy .sheet { border-color: rgba(245,247,255,.62);}
.t-dark .iconCommunity .bridge { background: rgba(245,247,255,.62);}
.item.active .iconTasks .line,
.item.active .iconCommunity .dot,
.item.active .iconStudy .sheet { border-color: rgba(46,99,255,.92);}
.item.active .iconCommunity .bridge { background: rgba(46,99,255,.92);}

.iconOther { display: flex; align-items: center; gap: 4rpx; }
.oDot { width: 5rpx; height: 5rpx; border-radius: 50%; background: rgba(16,24,40,.58); }
.t-dark .oDot { background: rgba(245,247,255,.62); }
.item.active .oDot { background: rgba(46,99,255,.92); }

.label { font-size: 15rpx; color: rgba(16,24,40,.58); transition: color 260ms ease, opacity 260ms ease; line-height: 1.1; text-align:center;max-width:100%;}
.item.active .label { color: rgba(16,24,40,.88); font-weight: 650; opacity:1;}
.t-dark .label { color: rgba(245,247,255,.48); opacity:.92;}
.t-dark .item.active .label { color: rgba(245,247,255,.88);}

.homeIconWrap{width:38rpx;height:38rpx;border-radius:14rpx;background:rgba(46,99,255,.12);transition:background .22s ease;display:flex;align-items:center;justify-content:center;}
.homeItem.active .homeIconWrap{background:rgba(46,99,255,.22)}
.homeItem.bounce .homeIconWrap { animation: homeBounce 150ms cubic-bezier(0.34,1.2,0.64,1);}
@keyframes homeBounce { 0% { transform: scale(1);} 50% { transform: scale(1.03);} 100% { transform: scale(1);} }
.homeGlyph { position: relative; width: 20rpx; height: 20rpx; }
.homeRoof { position: absolute; top: 0; left: 50%; width: 16rpx; height: 10rpx; margin-left: -8rpx; border-top: 2rpx solid rgba(46,99,255,.95); border-left: 2rpx solid rgba(46,99,255,.95); border-right: 2rpx solid rgba(46,99,255,.95); border-top-left-radius: 6rpx; border-top-right-radius: 6rpx; }
.homeBase { position: absolute; bottom: 0; left: 2rpx; right: 2rpx; height: 8rpx; border: 2rpx solid rgba(46,99,255,.95); border-top: none; border-bottom-left-radius: 4rpx; border-bottom-right-radius: 4rpx; }
</style>
