<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader title="Community" nav-mode="back" :show-avatar="false" />

    <view class="noticeEntry" role="button" @tap="openNotifications">
      <text class="noticeTitle">Notices</text>
      <text class="noticeSub">Class feed · homework · events</text>
    </view>

    <view class="tabs">
      <view class="seg" :class="{ on: tab === 'communities' }" role="button" @tap="tab = 'communities'"><text>Communities</text></view>
      <view class="seg" :class="{ on: tab === 'members' }" role="button" @tap="tab = 'members'"><text>Members</text></view>
    </view>

    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
      <view v-if="tab === 'communities'" class="list">
        <view v-if="isAdmin" class="addRow"><view class="addBtn" role="button" @tap="showAddCommunity = true">+ Add Community</view></view>
        <view v-for="c in communitiesView" :key="c.id" class="card" role="button" @tap="openFeed(c.id)">
          <view class="row">
            <view class="icon">{{ c.icon }}</view>
            <view class="meta">
              <text class="name">{{ c.name }}</text>
              <text class="desc">{{ c.desc }}</text>
            </view>
            <text class="online">{{ c.online }} online</text>
          </view>
          <view class="foot">
            <text class="active">{{ c.active }} active</text>
            <text class="latest">{{ c.latest }}</text>
          </view>
        </view>
      </view>

      <view v-else class="grid">
        <view v-for="m in members" :key="m.id" class="mCard" role="button" @tap="openMember(m.id)">
          <view class="mAvatar">{{ initials(m.name) }}</view>
          <text class="mName">{{ m.name }}</text>
          <text class="mMbti">{{ m.mbti }}</text>
          <text class="mInterests" :number-of-lines="1">{{ m.interests }}</text>
        </view>
      </view>
      <view class="gap" />
    </scroll-view>
    <view class="overlay" :class="{ show: showAddCommunity }" @tap="showAddCommunity = false">
      <view class="sheet" @tap.stop>
        <text class="sheetTitle">Create Community</text>
        <input class="input" v-model="draft.name" placeholder="Community Name" placeholder-class="ph" />
        <input class="input" v-model="draft.desc" placeholder="Description" placeholder-class="ph" />
        <input class="input" v-model="draft.icon" placeholder="Icon" placeholder-class="ph" />
        <input class="input" v-model="draft.bannerColor" placeholder="Banner Color (#6AA6FF)" placeholder-class="ph" />
        <view class="create" role="button" @tap="createCommunity">Create</view>
      </view>
    </view>
    <BottomNav active="community" />
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import BottomNav from '@/components/BottomNav.vue'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import { useTheme } from '@/composables/useTheme'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { useUserStore } from '@/composables/useUserStore'

const { themeClass } = useTheme()
const { communities, members, addCommunity } = useCommunityStore()
const { currentUser } = useUserStore()
const tab = ref('communities')
const showAddCommunity = ref(false)
const isAdmin = currentUser.value.role === 'admin'
const draft = ref({ name: '', desc: '', icon: '◉', bannerColor: '#6AA6FF' })

const communitiesView = computed(() =>
  communities.value.map((c) => ({
    ...c,
    online: c.online ?? Math.max(4, Math.floor((c.name?.length || 8) * 1.8)),
    active: c.active ?? Math.max(12, Math.floor((c.name?.length || 8) * 4.2)),
    latest: c.latest || 'just now',
  }))
)

function initials(name) {
  return name.split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()
}
function openFeed(id) {
  uni.navigateTo({ url: `/pages/community/feed?id=${id}`, animationType: 'pop-in', animationDuration: 240 })
}
function openMember(id) {
  uni.navigateTo({ url: `/pages/member/profile?id=${id}`, animationType: 'slide-in-right', animationDuration: 220 })
}
function openNotifications() {
  uni.navigateTo({ url: '/pages/notifications/index' })
}
function createCommunity() {
  if (!draft.value.name.trim()) return
  addCommunity({
    name: draft.value.name.trim(),
    desc: draft.value.desc.trim() || 'New class space',
    icon: draft.value.icon.trim() || '◉',
    bannerColor: draft.value.bannerColor.trim() || '#6AA6FF',
  })
  showAddCommunity.value = false
  draft.value = { name: '', desc: '', icon: '◉', bannerColor: '#6AA6FF' }
}
</script>

<style scoped>
.page{min-height:100vh;position:relative;overflow:hidden}.bg{position:absolute;inset:0;background:radial-gradient(1200rpx 800rpx at 40% 0%,rgba(40,110,255,.16),transparent 60%),linear-gradient(180deg,rgba(248,250,255,1),rgba(241,244,250,1))}.t-dark .bg{background:radial-gradient(1200rpx 800rpx at 40% 0%,rgba(60,120,255,.14),transparent 58%),linear-gradient(180deg,#111315,#0e1014)}
.noticeEntry{position:relative;z-index:2;margin:10rpx 28rpx 0;padding:14rpx 16rpx;border-radius:20rpx;background:rgba(255,255,255,.74);border:1rpx solid rgba(16,24,40,.06);transition:background 220ms ease,border-color 220ms ease}.t-dark .noticeEntry{background:#1a1d21;border-color:rgba(255,255,255,.06)}.noticeEntry:active{transform:scale(.99)}.noticeTitle{font-size:22rpx;font-weight:740;color:rgba(16,24,40,.92)}.t-dark .noticeTitle{color:#f5f7fa}.noticeSub{display:block;margin-top:4rpx;font-size:18rpx;color:rgba(16,24,40,.5)}.t-dark .noticeSub{color:#9aa4b2}
.tabs{position:relative;z-index:2;margin:12rpx 28rpx 0;padding:6rpx;background:rgba(255,255,255,.62);border:1rpx solid rgba(16,24,40,.06);border-radius:20rpx;display:flex}.t-dark .tabs{background:#1a1d21;border-color:rgba(255,255,255,.06)}.seg{flex:1;height:62rpx;border-radius:16rpx;display:flex;align-items:center;justify-content:center;font-size:22rpx;color:rgba(16,24,40,.62);transition:background 220ms ease,color 220ms ease}.t-dark .seg{color:rgba(245,247,255,.7)}.seg.on{background:rgba(46,99,255,.14);color:rgba(46,99,255,.96)}.t-dark .seg.on{background:rgba(120,160,255,.16);color:rgba(170,200,255,.96)}
.scroll{position:relative;z-index:1;height:calc(100vh - 360rpx);padding:14rpx 28rpx 200rpx}.list{display:flex;flex-direction:column;gap:12rpx}
.addRow{display:flex;justify-content:flex-end}.addBtn{height:60rpx;padding:0 16rpx;border-radius:16rpx;background:rgba(46,99,255,.14);color:rgba(46,99,255,.95);display:flex;align-items:center}
.card,.mCard{border-radius:26rpx;background:rgba(255,255,255,.74);border:1rpx solid rgba(255,255,255,.6);box-shadow:0 14rpx 44rpx rgba(12,20,40,.08);transition:background 220ms ease,border-color 220ms ease,transform 180ms ease}.t-dark .card,.t-dark .mCard{background:#1a1d21;border-color:rgba(255,255,255,.06);box-shadow:0 18rpx 56rpx rgba(0,0,0,.4)}.card:active,.mCard:active{transform:scale(.99)}
.card{padding:18rpx}.row{display:flex;align-items:center;gap:12rpx}.icon{width:54rpx;height:54rpx;border-radius:16rpx;background:rgba(46,99,255,.12);display:flex;align-items:center;justify-content:center;color:rgba(46,99,255,.95);font-size:24rpx;font-weight:700}.t-dark .icon{background:rgba(120,160,255,.16);color:rgba(170,200,255,.96)}.meta{flex:1;min-width:0;display:flex;flex-direction:column}.name{font-size:24rpx;font-weight:730;color:rgba(16,24,40,.92)}.t-dark .name{color:#f5f7fa}.desc{font-size:20rpx;color:rgba(16,24,40,.56)}.t-dark .desc{color:#9aa4b2}.online{font-size:18rpx;color:rgba(16,24,40,.5)}.t-dark .online{color:#9aa4b2}.foot{margin-top:14rpx;display:flex;justify-content:space-between;padding-top:12rpx;border-top:1rpx solid rgba(16,24,40,.04)}.t-dark .foot{border-top-color:rgba(255,255,255,.04)}.active,.latest{font-size:19rpx;color:rgba(16,24,40,.6)}.t-dark .active,.t-dark .latest{color:rgba(245,247,255,.6)}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12rpx}.mCard{padding:18rpx;display:flex;flex-direction:column;gap:6rpx}.mAvatar{width:54rpx;height:54rpx;border-radius:50%;background:rgba(46,99,255,.14);display:flex;align-items:center;justify-content:center;color:rgba(46,99,255,.96);font-size:20rpx;font-weight:760;margin-bottom:6rpx}.t-dark .mAvatar{background:rgba(120,160,255,.16);color:rgba(170,200,255,.96)}.mName{font-size:22rpx;font-weight:730;color:rgba(16,24,40,.92)}.t-dark .mName{color:#f5f7fa}.mMbti{font-size:18rpx;color:rgba(46,99,255,.9)}.t-dark .mMbti{color:rgba(170,200,255,.95)}.mInterests{font-size:19rpx;color:rgba(16,24,40,.54)}.t-dark .mInterests{color:#9aa4b2}.gap{height:24rpx}
.overlay{position:fixed;inset:0;z-index:40;opacity:0;pointer-events:none;background:rgba(8,12,24,.32);backdrop-filter:blur(12px);transition:opacity .22s ease}.overlay.show{opacity:1;pointer-events:auto}
.sheet{position:absolute;left:14rpx;right:14rpx;bottom:14rpx;padding:18rpx;border-radius:28rpx;background:rgba(255,255,255,.86);border:1rpx solid rgba(255,255,255,.6);box-shadow:0 30rpx 90rpx rgba(8,12,24,.22)}.t-dark .sheet{background:#1a1d21;border-color:rgba(255,255,255,.08);box-shadow:0 36rpx 100rpx rgba(0,0,0,.55)}
.sheetTitle{font-size:24rpx;font-weight:740;color:rgba(16,24,40,.92)}.t-dark .sheetTitle{color:#f5f7fa}.input{height:74rpx;margin-top:10rpx;padding:0 14rpx;border-radius:16rpx;background:rgba(16,24,40,.04);border:1rpx solid rgba(16,24,40,.06);color:rgba(16,24,40,.92)}.t-dark .input{background:#23272d;border-color:rgba(255,255,255,.06);color:#f5f7fa}.ph{color:rgba(16,24,40,.35)}.t-dark .ph{color:rgba(245,247,255,.32)}.create{margin-top:12rpx;height:74rpx;border-radius:18rpx;background:linear-gradient(180deg,#5a8eff,#2e63ff);display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 14rpx 36rpx rgba(46,99,255,.28)}
</style>
