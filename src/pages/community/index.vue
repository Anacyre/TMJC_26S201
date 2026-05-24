<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader />

    <TabPageContent
      tab-id="community"
    >
      <template #chrome>
    <view class="topRow">
      <view class="noticeEntry tap" role="button" @tap="openNotifications">
        <view class="noticeGlyph">
          <view class="ring" />
          <view class="bell" />
        </view>
        <view class="noticeBody">
          <text class="noticeTitle">Notices</text>
          <text class="noticeSub">{{ unreadCount }} unread</text>
        </view>
        <view class="noticeStat">
          <text class="noticeNum">{{ unreadCount }}</text>
          <text class="noticeChev">&gt;</text>
        </view>
      </view>
      <view v-if="isAdmin" class="manageBtn tap" role="button" @tap="openManage" aria-label="Manage">
        <view class="mGlyph">
          <view class="mDot" />
          <view class="mDot" />
          <view class="mDot" />
        </view>
      </view>
    </view>

    <view class="tabs">
      <view class="seg tap" :class="{ on: tab === 'communities' }" role="button" @tap="tab = 'communities'"><text>Spaces</text></view>
      <view class="seg tap" :class="{ on: tab === 'members' }" role="button" @tap="tab = 'members'"><text>Members</text></view>
    </view>

    <view v-if="isAdmin && tab === 'communities'" class="addFab" role="button" @tap="showAddCommunity = true" aria-label="Add community">
      <view class="plus">
        <view class="hLine" />
        <view class="vLine" />
      </view>
    </view>
      </template>

    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
      <SkeletonList v-if="loading && tab === 'communities'" variant="cards" :count="3" />
      <SkeletonList v-else-if="loading && tab === 'members'" variant="members" :count="4" />

      <view v-else-if="tab === 'communities'" class="list">
        <view v-if="!communities.length" class="emptyWrap">
          <EmptyState
            variant="posts"
            title="No spaces"
          />
        </view>
        <view v-for="c in communities" :key="c.id" class="card" role="button" @tap="openFeed(c.id)">
          <view class="row">
            <view class="icon">{{ c.icon }}</view>
            <view class="meta">
              <text class="name">{{ c.name }}</text>
              <text class="desc">{{ c.desc }}</text>
            </view>
            <view class="enterDot" />
          </view>
        </view>
      </view>

      <view v-else class="grid">
        <view v-if="!visibleMembers.length" class="emptyFull">
          <EmptyState
            variant="members"
            title="No members"
          />
        </view>
        <view v-for="m in visibleMembers" :key="m.id" class="mCard" role="button" @tap="openMember(m.id)">
          <view class="mAvatar">{{ initials(m.name) }}</view>
          <text class="mName">{{ m.name }}</text>
          <view class="mMetaRow">
            <text v-if="m.mbti" class="mMbti">{{ m.mbti }}</text>
            <text v-if="focusHoursFor(m.id)" class="mFocus">{{ focusHoursFor(m.id) }}</text>
          </view>
          <text v-if="m.interests" class="mInterests" :number-of-lines="1">{{ m.interests }}</text>
        </view>
      </view>
      <view class="gap" />
    </scroll-view>
    </TabPageContent>

    <view class="overlay" :class="{ show: showAddCommunity }" @tap="showAddCommunity = false">
      <view class="sheet" @tap.stop>
        <text class="sheetTitle">New space</text>
        <view class="field"><input class="input" v-model="draft.name" placeholder="Name" placeholder-class="ph" /></view>
        <view class="field"><input class="input" v-model="draft.desc" placeholder="Description" placeholder-class="ph" /></view>
        <view class="field"><input class="input" v-model="draft.icon" placeholder="Icon" placeholder-class="ph" maxlength="2" /></view>
        <view class="create tap" role="button" @tap="createCommunity">Create</view>
      </view>
    </view>
    <BottomNav active="community" />
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import BottomNav from '@/components/BottomNav.vue'
import TabPageContent from '@/components/TabPageContent.vue'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import { toast } from '@/composables/useToast'
import { useTheme } from '@/composables/useTheme'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { useMemberStore } from '@/composables/useMemberStore'
import { useUserStore } from '@/composables/useUserStore'
import { navChild, navSibling } from '@/lib/navigation'
import { useAdminMode } from '@/composables/useAdminMode'
import { useFocusStore } from '@/composables/useFocusStore'
import { useNotificationStore } from '@/composables/useNotificationStore'

const { themeClass } = useTheme()
const { communities, loading, addCommunity } = useCommunityStore()
const { visibleMembers } = useMemberStore()
const { currentUser } = useUserStore()
const { publicFocusHoursLabel } = useFocusStore()
const { visibleNotifications } = useNotificationStore()

const unreadCount = computed(() => visibleNotifications.value.filter((n) => !n.read).length)

const tab = ref('communities')
const showAddCommunity = ref(false)
const { isAdminActive: isAdmin } = useAdminMode()
const draft = ref({ name: '', desc: '', icon: '#' })

function initials(name) {
  return String(name || '?').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()
}

function focusHoursFor(id) {
  if (id === currentUser.value.id) return publicFocusHoursLabel.value
  return ''
}

function openFeed(id) { navChild(`/pages/community/feed?id=${id}`) }
function openMember(id) { navSibling(`/pages/member/profile?id=${id}`) }
function openNotifications() { navSibling('/pages/notifications/index') }
function openManage() { navSibling('/pages/member/manage') }
async function createCommunity() {
  if (!draft.value.name.trim()) {
    toast.show('Name required')
    return
  }
  const { error } = await addCommunity({
    name: draft.value.name.trim(),
    desc: draft.value.desc.trim() || 'A new class space.',
    icon: draft.value.icon.trim() || '#',
  })
  if (error) {
    toast.show(error.message || 'Could not create space')
    return
  }
  showAddCommunity.value = false
  draft.value = { name: '', desc: '', icon: '#' }
  toast.show('Space created')
}
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.bg { position: absolute; inset: 0; background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.16), transparent 60%), linear-gradient(180deg, #f8faff, #f1f4fa); }
.t-dark .bg { background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%), linear-gradient(180deg, #111315, #0e1014); }

.topRow { position: relative; z-index: 2; display: flex; align-items: stretch; gap: 10rpx; padding: 8rpx 28rpx 0; }
.noticeEntry { flex: 1; display: flex; align-items: center; gap: 16rpx; padding: 22rpx 20rpx; border-radius: 26rpx; background: linear-gradient(135deg, rgba(80, 140, 255, 0.14), rgba(46, 99, 255, 0.06)); border: 1rpx solid rgba(46, 99, 255, 0.22); transition: transform 180ms ease, background 220ms ease, border-color 220ms ease; }
.t-dark .noticeEntry { background: linear-gradient(135deg, rgba(80, 140, 255, 0.22), rgba(46, 99, 255, 0.10)); border-color: rgba(120, 160, 255, 0.28); }
.noticeEntry:active { transform: scale(0.985); background: rgba(46, 99, 255, 0.12); }
.noticeGlyph { width: 56rpx; height: 56rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; position: relative; }
.noticeGlyph .ring { position: absolute; inset: 0; border-radius: 50%; background: rgba(46, 99, 255, 0.18); }
.t-dark .noticeGlyph .ring { background: rgba(120, 160, 255, 0.22); }
.noticeGlyph .bell { width: 18rpx; height: 18rpx; border-radius: 18rpx 18rpx 5rpx 5rpx; background: rgba(46, 99, 255, 0.95); position: relative; }
.t-dark .noticeGlyph .bell { background: rgba(170, 200, 255, 0.96); }
.noticeGlyph .bell::after { content: ''; position: absolute; bottom: -5rpx; left: 50%; width: 5rpx; height: 5rpx; margin-left: -2.5rpx; border-radius: 50%; background: rgba(46, 99, 255, 0.95); }
.t-dark .noticeGlyph .bell::after { background: rgba(170, 200, 255, 0.96); }
.noticeBody { display: flex; flex-direction: column; gap: 4rpx; flex: 1; min-width: 0; }
.noticeTitle { font-size: 28rpx; font-weight: 740; color: rgba(16, 24, 40, 0.92); letter-spacing: -0.3rpx; }
.t-dark .noticeTitle { color: rgba(245, 247, 255, 0.92); }
.noticeSub { font-size: 19rpx; color: rgba(46, 99, 255, 0.78); font-weight: 660; }
.t-dark .noticeSub { color: rgba(170, 200, 255, 0.78); }
.noticeStat { display: flex; align-items: baseline; gap: 6rpx; flex-shrink: 0; }
.noticeNum { font-size: 36rpx; font-weight: 780; color: rgba(46, 99, 255, 0.96); letter-spacing: -0.5rpx; }
.t-dark .noticeNum { color: rgba(170, 200, 255, 0.96); }
.noticeChev { font-size: 24rpx; color: rgba(46, 99, 255, 0.5); font-weight: 300; }
.t-dark .noticeChev { color: rgba(170, 200, 255, 0.5); }

.manageBtn { width: 72rpx; align-self: stretch; min-height: 72rpx; border-radius: 26rpx; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.7); border: 1rpx solid rgba(16, 24, 40, 0.04); transition: transform 180ms ease, background 220ms ease; }
.t-dark .manageBtn { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.manageBtn:active { transform: scale(0.94); }
.mGlyph { display: flex; align-items: center; gap: 5rpx; }
.mDot { width: 6rpx; height: 6rpx; border-radius: 50%; background: rgba(16, 24, 40, 0.6); }
.t-dark .mDot { background: rgba(245, 247, 255, 0.6); }

.tabs { position: relative; z-index: 2; margin: 14rpx 28rpx 0; padding: 4rpx; background: rgba(255, 255, 255, 0.7); border: 1rpx solid rgba(16, 24, 40, 0.04); border-radius: 22rpx; display: flex; }
.t-dark .tabs { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.seg { flex: 1; height: 58rpx; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 660; color: rgba(16, 24, 40, 0.55); transition: background 220ms ease, color 220ms ease, transform 180ms ease; }
.t-dark .seg { color: rgba(245, 247, 255, 0.55); }
.seg.on { background: rgba(46, 99, 255, 0.12); color: rgba(46, 99, 255, 0.96); font-weight: 740; }
.t-dark .seg.on { background: rgba(120, 160, 255, 0.16); color: rgba(170, 200, 255, 0.96); }

.scroll { position: relative; z-index: 1; height: calc(100vh - var(--shell-header-offset, 148rpx) - 320rpx); min-height: 300rpx; padding: 14rpx 28rpx 200rpx; }
.list { display: flex; flex-direction: column; gap: var(--list-stack-gap); }
.emptyWrap, .emptyFull { padding: 32rpx 12rpx; }
.emptyFull { grid-column: span 2; }

.card { padding: var(--list-card-pad-y) var(--list-card-pad-x); border-radius: var(--list-card-radius); background: rgba(255, 255, 255, 0.7); border: 1rpx solid rgba(16, 24, 40, 0.04); transition: transform 180ms ease, background 220ms ease, border-color 220ms ease; }
.t-dark .card { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.card:active { transform: scale(0.985); }
.row { display: flex; align-items: center; gap: var(--list-card-gap); }
.icon { width: var(--list-icon-size); height: var(--list-icon-size); border-radius: var(--list-icon-radius); background: rgba(46, 99, 255, 0.10); display: flex; align-items: center; justify-content: center; color: rgba(46, 99, 255, 0.95); font-size: var(--list-icon-font); font-weight: 720; flex-shrink: 0; }
.t-dark .icon { background: rgba(120, 160, 255, 0.14); color: rgba(170, 200, 255, 0.96); }
.meta { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.name { font-size: var(--list-title-size); font-weight: 720; color: rgba(16, 24, 40, 0.92); }
.t-dark .name { color: rgba(245, 247, 255, 0.92); }
.desc { font-size: var(--list-meta-size); color: rgba(16, 24, 40, 0.5); line-height: 1.35; }
.t-dark .desc { color: rgba(245, 247, 255, 0.45); }
.enterDot { width: var(--list-tag-dot); height: var(--list-tag-dot); border-radius: 50%; background: rgba(46, 99, 255, 0.6); flex-shrink: 0; }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--list-stack-gap); }
.mCard { padding: var(--list-card-pad-y) var(--list-card-pad-x); border-radius: var(--list-card-radius); background: rgba(255, 255, 255, 0.7); border: 1rpx solid rgba(16, 24, 40, 0.04); display: flex; flex-direction: column; gap: 6rpx; transition: transform 180ms ease, background 220ms ease, border-color 220ms ease; }
.t-dark .mCard { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.mCard:active { transform: scale(0.985); }
.mAvatar { width: var(--list-avatar-size); height: var(--list-avatar-size); border-radius: 50%; background: rgba(46, 99, 255, 0.14); display: flex; align-items: center; justify-content: center; color: rgba(46, 99, 255, 0.96); font-size: var(--list-meta-size); font-weight: 760; margin-bottom: 4rpx; }
.t-dark .mAvatar { background: rgba(120, 160, 255, 0.16); color: rgba(170, 200, 255, 0.96); }
.mName { font-size: var(--list-title-size); font-weight: 720; color: rgba(16, 24, 40, 0.92); }
.t-dark .mName { color: rgba(245, 247, 255, 0.92); }
.mMetaRow { display: flex; align-items: center; gap: 8rpx; flex-wrap: wrap; }
.mMbti { font-size: var(--list-meta-size); color: rgba(46, 99, 255, 0.9); font-weight: 700; }
.t-dark .mMbti { color: rgba(170, 200, 255, 0.95); }
.mFocus { font-size: var(--list-meta-size); color: rgba(16, 24, 40, 0.45); }
.t-dark .mFocus { color: rgba(245, 247, 255, 0.45); }
.mInterests { font-size: var(--list-meta-size); color: rgba(16, 24, 40, 0.48); margin-top: 2rpx; }
.t-dark .mInterests { color: rgba(245, 247, 255, 0.45); }

.gap { height: 24rpx; }

.addFab { position: fixed; right: 28rpx; bottom: calc(160rpx + env(safe-area-inset-bottom)); width: 96rpx; height: 96rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.78); border: 1rpx solid rgba(255, 255, 255, 0.6); box-shadow: 0 22rpx 60rpx rgba(46, 99, 255, 0.18); backdrop-filter: blur(16px); z-index: 35; transition: transform 200ms ease, box-shadow 200ms ease, background 220ms ease; }
.t-dark .addFab { background: rgba(26, 29, 33, 0.85); border-color: rgba(255, 255, 255, 0.08); box-shadow: 0 22rpx 70rpx rgba(0, 0, 0, 0.5); }
.addFab:active { transform: scale(0.94); box-shadow: 0 14rpx 36rpx rgba(46, 99, 255, 0.18); }
.plus { position: relative; width: 26rpx; height: 26rpx; }
.hLine, .vLine { position: absolute; background: rgba(46, 99, 255, 0.95); border-radius: 999rpx; }
.hLine { left: 0; right: 0; top: 50%; height: 2.4rpx; margin-top: -1.2rpx; }
.vLine { top: 0; bottom: 0; left: 50%; width: 2.4rpx; margin-left: -1.2rpx; }

.overlay { position: fixed; inset: 0; z-index: 50; opacity: 0; pointer-events: none; background: rgba(8, 12, 24, 0.4); backdrop-filter: blur(12px); transition: opacity 0.22s ease; }
.overlay.show { opacity: 1; pointer-events: auto; }
.sheet { position: absolute; left: 14rpx; right: 14rpx; bottom: 14rpx; padding: 24rpx 22rpx; border-radius: 32rpx; background: rgba(255, 255, 255, 0.92); border: 1rpx solid rgba(255, 255, 255, 0.6); }
.t-dark .sheet { background: #1a1d21; border-color: rgba(255, 255, 255, 0.06); }
.sheetTitle { font-size: 26rpx; font-weight: 740; color: rgba(16, 24, 40, 0.92); }
.t-dark .sheetTitle { color: #f5f7fa; }
.sheetSub { display: block; margin-top: 6rpx; font-size: 20rpx; color: rgba(16, 24, 40, 0.5); }
.t-dark .sheetSub { color: rgba(245, 247, 255, 0.5); }
.field { margin-top: 12rpx; }
.input { width: 100%; height: 80rpx; padding: 0 16rpx; border-radius: 18rpx; background: rgba(16, 24, 40, 0.04); border: 1rpx solid rgba(16, 24, 40, 0.08); color: rgba(16, 24, 40, 0.92); font-size: 23rpx; }
.t-dark .input { background: #23272d; border-color: rgba(255, 255, 255, 0.08); color: #f5f7fa; }
.ph { color: rgba(16, 24, 40, 0.35); }
.t-dark .ph { color: rgba(245, 247, 255, 0.35); }
.create { margin-top: 18rpx; height: 84rpx; border-radius: 22rpx; background: linear-gradient(180deg, #5a8eff, #2e63ff); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 23rpx; font-weight: 720; box-shadow: 0 14rpx 36rpx rgba(46, 99, 255, 0.28); }
</style>
