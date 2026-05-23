<template>
  <view class="overlay" :class="{ show: open }" @tap="close">
    <view class="sheet" @tap.stop @touchstart="onTouchStart" @touchend="onTouchEnd">
      <view class="sheetTop">
        <view class="backBtn" role="button" @tap="close"><text class="backText">‹ Back</text></view>
      </view>
      <view class="searchBar">
        <text class="searchIcon">⌕</text>
        <input
          class="searchInput"
          v-model="query"
          :focus="open"
          confirm-type="search"
          placeholder="Search tasks, notices, members..."
          placeholder-class="placeholder"
        />
        <view v-if="query" class="clearBtn" role="button" @tap="query = ''">
          <text class="clearText">Clear</text>
        </view>
      </view>

      <scroll-view class="body" scroll-y :show-scrollbar="false">
        <view class="section">
          <text class="title">Recent searches</text>
          <view class="chips">
            <view v-for="item in recent" :key="item" class="chip" role="button" @tap="query = item">
              <text class="chipText">{{ item }}</text>
            </view>
          </view>
        </view>

        <view class="section">
          <text class="title">Tasks</text>
          <view v-for="x in resultTasks.slice(0, 4)" :key="x.id" class="row" role="button" @tap="openTask(x)">
            <text class="rowTitle" :number-of-lines="1">{{ x.title }}</text>
            <text class="rowMeta">{{ x.deadline }}</text>
          </view>
        </view>

        <view class="section">
          <text class="title">Communities</text>
          <view v-for="x in resultCommunities.slice(0, 3)" :key="x.id" class="row" role="button" @tap="openCommunity(x)">
            <text class="rowTitle" :number-of-lines="1">{{ x.name }}</text>
            <text class="rowMeta">{{ x.active }} active</text>
          </view>
        </view>

        <view class="section">
          <text class="title">Members</text>
          <view v-for="x in resultMembers.slice(0, 3)" :key="x.id" class="row" role="button" @tap="openMember(x)">
            <text class="rowTitle">{{ x.name }}</text>
            <text class="rowMeta">{{ x.mbti }}</text>
          </view>
        </view>

        <view class="section">
          <text class="title">Notifications</text>
          <view v-for="x in resultNotifications.slice(0, 3)" :key="x.id" class="row" role="button" @tap="openNotice(x)">
            <text class="rowTitle" :number-of-lines="1">{{ x.title }}</text>
            <text class="rowMeta">{{ x.type }}</text>
          </view>
        </view>

        <view class="section">
          <text class="title">Resources</text>
          <view v-for="x in resultResources.slice(0, 3)" :key="x.id" class="row" role="button" @tap="openResource(x)">
            <text class="rowTitle" :number-of-lines="1">{{ x.title }}</text>
            <text class="rowMeta">{{ x.type }}</text>
          </view>
        </view>
        <view class="bottomGap" />
      </scroll-view>
    </view>
  </view>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { onHide, onBackPress } from '@dcloudio/uni-app'
import { useGlobalSearch } from '@/composables/useGlobalSearch'

const {
  open,
  query,
  recent,
  resultTasks,
  resultCommunities,
  resultMembers,
  resultNotifications,
  resultResources,
  closeSearch,
} = useGlobalSearch()
const touchY = ref(0)

function close() {
  closeSearch()
}

function toast(title) {
  uni.showToast({ title, icon: 'none' })
}

function openTask(x) {
  close()
  uni.navigateTo({ url: `/pages/task/detail?id=${encodeURIComponent(x.id)}` })
}

function openNotice(x) {
  close()
  uni.navigateTo({ url: `/pages/notice/detail?id=${encodeURIComponent(x.id)}` })
}
function openCommunity(x) {
  close()
  uni.navigateTo({ url: `/pages/community/feed?id=${encodeURIComponent(x.id)}` })
}
function openMember(x) {
  close()
  uni.navigateTo({ url: `/pages/member/profile?id=${encodeURIComponent(x.id)}` })
}
function openResource(x) {
  close()
  uni.navigateTo({ url: `/pages/study/detail?id=${encodeURIComponent(x.id)}` })
}
function onTouchStart(e) {
  touchY.value = e.changedTouches?.[0]?.clientY || 0
}
function onTouchEnd(e) {
  const endY = e.changedTouches?.[0]?.clientY || 0
  if (endY - touchY.value > 120) close()
}

onBackPress(() => {
  if (!open.value) return false
  close()
  return true
})

onHide(() => {
  if (open.value) close()
})

function onEsc(event) {
  if (event?.key !== 'Escape') return
  if (!open.value) return
  close()
}

onMounted(() => {
  if (typeof window !== 'undefined') window.addEventListener('keydown', onEsc)
})

onUnmounted(() => {
  if (typeof window !== 'undefined') window.removeEventListener('keydown', onEsc)
})
</script>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 80; opacity: 0; pointer-events: none; transition: opacity 240ms ease; background: rgba(12, 18, 34, 0.32); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);}
.t-dark .overlay { background: rgba(0,0,0,.5);}
.overlay.show { opacity: 1; pointer-events: auto; }
.sheet { position: absolute; left: 10rpx; right: 10rpx; top: 84rpx; bottom: 10rpx; border-radius: 34rpx; background: rgba(255,255,255,0.84); border:1rpx solid rgba(255,255,255,0.6); box-shadow: 0 40rpx 120rpx rgba(8,12,24,.22); transform: scale(.985) translateY(24rpx); transition: transform 320ms cubic-bezier(.2,.7,.1,1); overflow: hidden; padding-bottom: env(safe-area-inset-bottom);}
.t-dark .sheet { background: #1a1d21; border-color: rgba(255,255,255,.06); box-shadow: 0 40rpx 120rpx rgba(0,0,0,.55);}
.overlay.show .sheet { transform: scale(1) translateY(0);}
.sheetTop{padding:10rpx 18rpx 0}
.backBtn{height:52rpx;display:flex;align-items:center}
.backText{font-size:22rpx;color:rgba(46,99,255,.95)}
.t-dark .backText { color: rgba(170,200,255,.95);}
.searchBar { margin: 18rpx; padding: 14rpx 16rpx; border-radius: 22rpx; background: rgba(255,255,255,.7); border: 1rpx solid rgba(18,24,40,.08); display:flex; align-items:center; gap: 10rpx;}
.t-dark .searchBar { background: #23272d; border-color: rgba(255,255,255,.06);}
.searchIcon { font-size: 22rpx; color: rgba(16,24,40,.52);}
.t-dark .searchIcon { color: rgba(245,247,255,.6);}
.searchInput { flex:1; font-size: 26rpx; color: rgba(16,24,40,.9);}
.t-dark .searchInput { color: #f5f7fa;}
.placeholder { color: rgba(16,24,40,.35);}
.t-dark .placeholder { color: rgba(245,247,255,.34);}
.clearBtn { padding: 8rpx 12rpx; border-radius: 999rpx; background: rgba(16,24,40,.06);}
.t-dark .clearBtn { background: rgba(255,255,255,.06);}
.clearText { font-size: 20rpx; color: rgba(16,24,40,.68);}
.t-dark .clearText { color: rgba(245,247,255,.7);}
.body { height: calc(100% - 102rpx); padding: 0 18rpx; }
.section { margin-top: 12rpx; padding: 14rpx; border-radius: 22rpx; background: rgba(255,255,255,.62); border: 1rpx solid rgba(16,24,40,.06);}
.t-dark .section { background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.06);}
.title { font-size: 20rpx; color: rgba(16,24,40,.56); font-weight:640;}
.t-dark .title { color: rgba(245,247,255,.6);}
.chips { display: flex; flex-wrap: wrap; gap: 8rpx; margin-top: 8rpx;}
.chip { padding: 8rpx 14rpx; border-radius: 999rpx; background: rgba(16,24,40,.06);}
.t-dark .chip { background: rgba(255,255,255,.06);}
.chipText { font-size: 19rpx; color: rgba(16,24,40,.72);}
.t-dark .chipText { color: rgba(245,247,255,.7);}
.row { padding: 10rpx 6rpx; display: flex; align-items: center; justify-content: space-between; gap: 12rpx;}
.rowTitle { flex: 1; min-width: 0; font-size: 22rpx; font-weight: 680; color: rgba(16,24,40,.9);}
.t-dark .rowTitle { color: #f5f7fa;}
.rowMeta { font-size: 19rpx; color: rgba(16,24,40,.52);}
.t-dark .rowMeta { color: #9aa4b2;}
.bottomGap { height: 28rpx; }
</style>
