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
          <view class="bell" />
          <view v-if="hasUnreadNotices" class="noticeBadge" />
        </view>
        <text class="noticeLine">
          Notices<text v-if="hasUnreadNotices" class="noticeCount"> · {{ unreadCount }}</text>
        </text>
        <text class="noticeChev">&gt;</text>
      </view>
      <view v-if="isAdmin" class="manageBtn tap" role="button" @tap="openManage" aria-label="Manage">
        <view class="mGlyph"><view class="mDot" /><view class="mDot" /><view class="mDot" /></view>
      </view>
    </view>

    <view class="tabs">
      <view class="seg tap" :class="{ on: tab === 'communities' }" role="button" @tap="tab = 'communities'"><text>Spaces</text></view>
      <view class="seg tap" :class="{ on: tab === 'members' }" role="button" @tap="tab = 'members'"><text>Members</text></view>
    </view>

    <view v-if="isAdmin && tab === 'communities'" class="addFab" role="button" @tap="openCreateSheet" aria-label="Add community">
      <view class="plus">
        <view class="hLine" />
        <view class="vLine" />
      </view>
    </view>
      </template>

    <scroll-view class="scroll tabPageScroll" scroll-y :show-scrollbar="false">
      <SkeletonList v-if="loading && tab === 'communities'" variant="cards" :count="3" />
      <SkeletonList v-else-if="loading && tab === 'members'" variant="members" :count="4" />

      <view v-else-if="tab === 'communities'" class="list">
        <view v-if="!communities.length" class="emptyWrap">
          <EmptyState
            variant="posts"
            title="No spaces"
          />
        </view>
        <view v-for="c in communities" :key="c.id" class="card tap" data-reveal-card role="button" @tap="openFeed(c.id)">
          <view class="row">
            <view class="icon">{{ c.icon }}</view>
            <view class="meta">
              <text class="name">{{ c.name }}</text>
              <text class="desc" :number-of-lines="1">{{ c.desc }}</text>
            </view>
            <view class="infoBtn tap" role="button" @tap.stop="openInfo(c.id)" aria-label="Space info">
              <text class="infoBtnText">i</text>
            </view>
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
        <view v-for="m in visibleMembers" :key="m.id" class="mCard tap" data-reveal-card role="button" @tap="openMember(m.id)">
          <view class="mAvatar">{{ initials(m.name) }}</view>
          <text class="mName">{{ m.name }}</text>
        </view>
      </view>
      <view class="gap" />
    </scroll-view>
    </TabPageContent>

    <view class="overlay" :class="{ show: showAddCommunity }" @tap="closeCreateSheet">
      <view class="sheet" @tap.stop>
        <view class="grabber" />
        <text class="sheetTitle">New space</text>

        <view class="iconSection">
          <view class="iconPreview">{{ draft.icon || '#' }}</view>
          <view class="iconActions">
            <view class="iconAction tap" role="button" @tap="autoSuggestIcon">
              <text class="iconActionText">Auto</text>
            </view>
            <view class="field compact">
              <input
                class="input iconInput"
                v-model="draft.icon"
                placeholder="Icon"
                placeholder-class="ph"
                maxlength="2"
                @input="onIconInput"
              />
            </view>
          </view>
        </view>

        <scroll-view class="iconScroll" scroll-x :show-scrollbar="false">
          <view class="iconScrollInner">
            <view
              v-for="preset in iconPresets"
              :key="preset.id"
              class="iconChip tap"
              :class="{ on: draft.icon === preset.icon }"
              role="button"
              :aria-label="preset.label"
              @tap="pickIcon(preset.icon)"
            >
              <text class="iconChipGlyph">{{ preset.icon }}</text>
            </view>
          </view>
        </scroll-view>

        <view class="field">
          <input
            class="input"
            v-model="draft.name"
            placeholder="Name"
            placeholder-class="ph"
            @input="onNameInput"
          />
        </view>
        <view class="field">
          <input
            class="input"
            v-model="draft.desc"
            placeholder="Description (optional)"
            placeholder-class="ph"
            @input="onDescInput"
          />
        </view>
        <view class="create tap" role="button" @tap="createCommunity">Create space</view>
      </view>
    </view>
    <BottomNav active="community" />
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
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
import { navChild, navSibling } from '@/lib/navigation'
import { useAdminMode } from '@/composables/useAdminMode'
import { useNotificationStore } from '@/composables/useNotificationStore'
import {
  COMMUNITY_ICON_PRESETS,
  normalizeCommunityIcon,
  suggestCommunityIcon,
} from '@/lib/communityIcons'

const { themeClass } = useTheme()
const { communities, loading, addCommunity } = useCommunityStore()
const { visibleMembers } = useMemberStore()
const { unreadRelevantCount } = useNotificationStore()

const unreadCount = unreadRelevantCount
const hasUnreadNotices = computed(() => unreadCount.value > 0)

const iconPresets = COMMUNITY_ICON_PRESETS
const tab = ref('communities')
const showAddCommunity = ref(false)
const { isAdminActive: isAdmin } = useAdminMode()
const draft = ref({ name: '', desc: '', icon: '#', iconManual: false })

function resetDraft() {
  draft.value = { name: '', desc: '', icon: '#', iconManual: false }
}

function openCreateSheet() {
  resetDraft()
  showAddCommunity.value = true
}

function closeCreateSheet() {
  showAddCommunity.value = false
}

function autoSuggestIcon() {
  draft.value.icon = suggestCommunityIcon(draft.value.name, draft.value.desc)
  draft.value.iconManual = true
}

function pickIcon(icon) {
  draft.value.icon = icon
  draft.value.iconManual = true
}

function onIconInput() {
  draft.value.iconManual = true
}

function onNameInput() {
  if (!draft.value.iconManual) {
    draft.value.icon = suggestCommunityIcon(draft.value.name, draft.value.desc)
  }
}

function onDescInput() {
  if (!draft.value.iconManual) {
    draft.value.icon = suggestCommunityIcon(draft.value.name, draft.value.desc)
  }
}

watch(showAddCommunity, (open) => {
  if (open && !draft.value.iconManual && draft.value.name.trim()) {
    draft.value.icon = suggestCommunityIcon(draft.value.name, draft.value.desc)
  }
})

function initials(name) {
  return String(name || '?').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()
}

function openFeed(id) { navChild(`/pages/community/feed?id=${id}`) }
function openInfo(id) { navChild(`/pages/community/info?id=${id}`) }
function openMember(id) { navSibling(`/pages/member/profile?id=${id}`) }
function openNotifications() { navSibling('/pages/notifications/index') }
function openManage() { navSibling('/pages/member/manage') }
async function createCommunity() {
  if (!draft.value.name.trim()) {
    toast.show('Name required')
    return
  }
  const icon = normalizeCommunityIcon(draft.value.icon, draft.value.name, draft.value.desc)
  const { error } = await addCommunity({
    name: draft.value.name.trim(),
    desc: draft.value.desc.trim() || 'A new class space.',
    icon,
  })
  if (error) {
    toast.show(error.message || 'Could not create space')
    return
  }
  closeCreateSheet()
  resetDraft()
  toast.communityCreated()
}

onLoad((q) => {
  if (q?.tab === 'members') tab.value = 'members'
})
</script>

<style scoped>
.page { min-height: 100vh; height: 100vh; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.bg { position: absolute; inset: 0; background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.16), transparent 60%), linear-gradient(180deg, #f8faff, #f1f4fa); }
.t-dark .bg { background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%), linear-gradient(180deg, #111315, #0e1014); }

.topRow { position: relative; z-index: 2; display: flex; align-items: stretch; gap: 10rpx; padding: 6rpx 28rpx 0; }
.noticeEntry { flex: 1; min-height: 64rpx; display: flex; align-items: center; gap: 12rpx; padding: 0 18rpx; border-radius: 22rpx; background: rgba(255, 255, 255, 0.72); border: 1rpx solid rgba(16, 24, 40, 0.05); }
.t-dark .noticeEntry { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.noticeEntry:active { opacity: 0.88; }
.noticeGlyph { width: 40rpx; height: 40rpx; flex-shrink: 0; display: flex; align-items: center; justify-content: center; position: relative; }
.noticeGlyph .bell { width: 16rpx; height: 16rpx; border-radius: 16rpx 16rpx 4rpx 4rpx; background: rgba(46, 99, 255, 0.92); }
.t-dark .noticeGlyph .bell { background: rgba(170, 200, 255, 0.92); }
.noticeBadge { position: absolute; top: 0; right: 0; width: 12rpx; height: 12rpx; border-radius: 50%; background: #ff4d4f; border: 2rpx solid rgba(255, 255, 255, 0.95); }
.t-dark .noticeBadge { border-color: #1a1d21; }
.noticeLine { flex: 1; min-width: 0; font-size: 24rpx; font-weight: 700; color: rgba(16, 24, 40, 0.88); }
.t-dark .noticeLine { color: rgba(245, 247, 255, 0.88); }
.noticeCount { color: rgba(46, 99, 255, 0.88); font-weight: 720; }
.t-dark .noticeCount { color: rgba(170, 200, 255, 0.88); }
.noticeChev { font-size: 20rpx; color: rgba(46, 99, 255, 0.4); flex-shrink: 0; }

.manageBtn { width: 64rpx; min-height: 64rpx; border-radius: 22rpx; display: flex; align-items: center; justify-content: center; background: rgba(255, 255, 255, 0.72); border: 1rpx solid rgba(16, 24, 40, 0.05); }
.t-dark .manageBtn { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.mGlyph { display: flex; align-items: center; gap: 5rpx; }
.mDot { width: 6rpx; height: 6rpx; border-radius: 50%; background: rgba(16, 24, 40, 0.6); }
.t-dark .mDot { background: rgba(245, 247, 255, 0.6); }

.tabs { position: relative; z-index: 2; margin: 10rpx 28rpx 0; padding: 4rpx; background: rgba(255, 255, 255, 0.7); border: 1rpx solid rgba(16, 24, 40, 0.04); border-radius: 20rpx; display: flex; }
.seg { flex: 1; height: 52rpx; border-radius: 16rpx; display: flex; align-items: center; justify-content: center; font-size: 21rpx; font-weight: 660; color: rgba(16, 24, 40, 0.55); }

.t-dark .tabs { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.seg.on { background: rgba(46, 99, 255, 0.12); color: rgba(46, 99, 255, 0.96); font-weight: 740; }
.t-dark .seg { color: rgba(245, 247, 255, 0.55); }
.t-dark .seg.on { background: rgba(120, 160, 255, 0.16); color: rgba(170, 200, 255, 0.96); }

.scroll { position: relative; z-index: 1; padding: 12rpx 28rpx 0; }
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
.desc { font-size: var(--list-meta-size); color: rgba(16, 24, 40, 0.5); line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.infoBtn { width: 44rpx; height: 44rpx; border-radius: 50%; background: rgba(46, 99, 255, 0.08); border: 1rpx solid rgba(46, 99, 255, 0.14); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.infoBtnText { font-size: 22rpx; font-weight: 760; color: rgba(46, 99, 255, 0.82); font-style: italic; }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--list-stack-gap); }
.mCard { padding: var(--list-card-pad-y) var(--list-card-pad-x); border-radius: var(--list-card-radius); background: rgba(255, 255, 255, 0.7); border: 1rpx solid rgba(16, 24, 40, 0.04); display: flex; flex-direction: column; align-items: center; gap: 6rpx; text-align: center; }
.t-dark .mCard { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.mCard:active { transform: scale(0.985); }
.mAvatar { width: var(--list-avatar-size); height: var(--list-avatar-size); border-radius: 50%; background: rgba(46, 99, 255, 0.14); display: flex; align-items: center; justify-content: center; color: rgba(46, 99, 255, 0.96); font-size: var(--list-meta-size); font-weight: 760; margin-bottom: 4rpx; }
.t-dark .mAvatar { background: rgba(120, 160, 255, 0.16); color: rgba(170, 200, 255, 0.96); }
.mName { font-size: var(--list-meta-size); font-weight: 720; color: rgba(16, 24, 40, 0.88); }

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
.sheet { position: absolute; left: 14rpx; right: 14rpx; bottom: 14rpx; padding: 24rpx 22rpx 28rpx; border-radius: 32rpx; background: rgba(255, 255, 255, 0.92); border: 1rpx solid rgba(255, 255, 255, 0.6); max-height: 82vh; overflow-y: auto; }
.t-dark .sheet { background: #1a1d21; border-color: rgba(255, 255, 255, 0.06); }
.grabber { width: 56rpx; height: 6rpx; border-radius: 999rpx; background: rgba(16, 24, 40, 0.12); margin: 0 auto 16rpx; }
.t-dark .grabber { background: rgba(255, 255, 255, 0.14); }
.iconSection { margin-top: 16rpx; display: flex; align-items: center; gap: 16rpx; }
.iconPreview { width: 88rpx; height: 88rpx; border-radius: 24rpx; background: rgba(46, 99, 255, 0.12); display: flex; align-items: center; justify-content: center; color: rgba(46, 99, 255, 0.96); font-size: 36rpx; font-weight: 720; flex-shrink: 0; }
.t-dark .iconPreview { background: rgba(120, 160, 255, 0.16); color: rgba(170, 200, 255, 0.96); }
.iconActions { flex: 1; display: flex; align-items: center; gap: 10rpx; }
.iconAction { padding: 10rpx 16rpx; border-radius: 999rpx; background: rgba(46, 99, 255, 0.1); border: 1rpx solid rgba(46, 99, 255, 0.18); flex-shrink: 0; }
.iconActionText { font-size: 20rpx; font-weight: 700; color: rgba(46, 99, 255, 0.92); }
.iconScroll { margin-top: 12rpx; white-space: nowrap; }
.iconScrollInner { display: inline-flex; gap: 8rpx; }
.iconChip { width: 64rpx; height: 64rpx; border-radius: 16rpx; background: rgba(16, 24, 40, 0.04); border: 1rpx solid rgba(16, 24, 40, 0.06); display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; }
.iconChip.on { background: rgba(46, 99, 255, 0.12); border-color: rgba(46, 99, 255, 0.28); }
.iconChipGlyph { font-size: 28rpx; color: rgba(46, 99, 255, 0.95); font-weight: 720; }
.field.compact { margin-top: 0; flex: 1; }
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
