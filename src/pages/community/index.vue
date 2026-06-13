<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader />

    <TabPageContent tab-id="community">
      <template #chrome>
        <view class="filterWrap">
          <view class="filterRow">
            <view class="filterDrop tap noticeDrop" role="button" @tap="openNotifications">
              <view class="noticeGlyph">
                <view class="bell" />
                <view v-if="hasUnreadNotices" class="noticeDot" />
              </view>
              <text class="filterDropText">Notices</text>
              <text v-if="hasUnreadNotices" class="noticeNum">{{ unreadCount }}</text>
              <text class="filterChev">›</text>
            </view>
            <view
              class="filterDrop tap iconDrop"
              role="button"
              @tap="openMembers"
              aria-label="Members"
            >
              <view class="memberIcon" aria-hidden="true">
                <view class="memberHead left" />
                <view class="memberHead right" />
                <view class="memberBody" />
              </view>
            </view>
            <view
              v-if="isAdmin"
              class="filterDrop tap iconDrop"
              role="button"
              @tap="openManage"
              aria-label="Manage members"
            >
              <view class="menuIcon"><view class="dot" /><view class="dot" /><view class="dot" /></view>
            </view>
          </view>
        </view>

        <view
          v-if="isAdmin"
          class="addFab"
          role="button"
          @tap="openCreateSheet"
          aria-label="Add space"
        >
          <view class="plus">
            <view class="hLine" />
            <view class="vLine" />
          </view>
        </view>
      </template>

      <scroll-view class="scroll tabPageScroll" scroll-y :show-scrollbar="false" :enhanced="true">
        <view class="safe">
          <SkeletonList v-if="loading" variant="cards" :count="3" />

          <view v-else class="list">
            <view class="section">
              <view class="sectionHead">
                <text class="sectionLabel">Library</text>
              </view>
              <CommunityRowLink
                title="Materials"
                :meta="totalMaterialCount ? `${totalMaterialCount} files across spaces` : 'Shared files'"
                :count="totalMaterialCount || ''"
                show-folder-icon
                @open="openMaterials()"
              />
            </view>

            <view v-if="pinnedSpaces.length" class="section divided">
              <view class="sectionHead">
                <text class="sectionLabel">Pinned</text>
                <text class="sectionCount">{{ pinnedSpaces.length }}</text>
              </view>
              <view class="sectionBody">
                <CommunitySpaceCard
                  v-for="c in pinnedSpaces"
                  :key="c.id"
                  v-memo="[c.id, c.name, c.desc, c.icon, c.pinned]"
                  :space="c"
                  data-reveal-card
                  @open="openFeed(c.id)"
                  @info="openInfo(c.id)"
                />
              </view>
            </view>

            <view class="section" :class="{ divided: pinnedSpaces.length || sortedCommunities.length }">
              <view class="sectionHead">
                <text class="sectionLabel">Spaces</text>
                <text v-if="otherSpaces.length" class="sectionCount">{{ otherSpaces.length }}</text>
              </view>
              <view v-if="!sortedCommunities.length" class="emptyWrap">
                <EmptyState variant="posts" title="No spaces" />
              </view>
              <view v-else class="sectionBody">
                <CommunitySpaceCard
                  v-for="c in otherSpaces"
                  :key="c.id"
                  v-memo="[c.id, c.name, c.desc, c.icon, c.pinned]"
                  :space="c"
                  data-reveal-card
                  @open="openFeed(c.id)"
                  @info="openInfo(c.id)"
                />
              </view>
            </view>
          </view>
        </view>
        <view class="gap" />
      </scroll-view>
    </TabPageContent>

    <view class="overlay" :class="{ show: showAddCommunity }" @tap="closeCreateSheet">
      <view class="sheet" @tap.stop>
        <view class="grabber" />
        <text class="sheetTitle">New space</text>
        <text class="sheetSub">Create a subject community for posts and materials.</text>

        <view class="iconRow">
          <view class="iconPreview">{{ draft.icon || '#' }}</view>
          <view class="iconTools">
            <view class="toolChip tap" role="button" @tap="autoSuggestIcon"><text>Auto</text></view>
            <input
              class="iconInput"
              v-model="draft.icon"
              placeholder="Icon"
              placeholder-class="ph"
              maxlength="2"
              @input="draft.iconManual = true"
            />
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
              @tap="pickIcon(preset.icon)"
            >
              <text>{{ preset.icon }}</text>
            </view>
          </view>
        </scroll-view>

        <view class="field">
          <input class="fieldInput" v-model="draft.name" placeholder="Name" placeholder-class="ph" @input="onNameInput" />
        </view>
        <view class="field">
          <input
            class="fieldInput"
            v-model="draft.desc"
            placeholder="Description (optional)"
            placeholder-class="ph"
            @input="onDescInput"
          />
        </view>
        <view class="primaryBtn tap" role="button" @tap="createCommunity">Create space</view>
      </view>
    </view>

    <BottomNav active="community" />
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import BottomNav from '@/components/BottomNav.vue'
import TabPageContent from '@/components/TabPageContent.vue'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import EmptyState from '@/components/EmptyState.vue'
import SkeletonList from '@/components/SkeletonList.vue'
import CommunityRowLink from '@/components/community/CommunityRowLink.vue'
import CommunitySpaceCard from '@/components/community/CommunitySpaceCard.vue'
import { toast } from '@/composables/useToast'
import { useTheme } from '@/composables/useTheme'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { useTagStore } from '@/composables/useTagStore'
import { navChild, navSibling } from '@/lib/navigation'
import { useAdminMode } from '@/composables/useAdminMode'
import { useNotificationStore } from '@/composables/useNotificationStore'
import {
  COMMUNITY_ICON_PRESETS,
  normalizeCommunityIcon,
  suggestCommunityIcon,
} from '@/lib/communityIcons'

const { themeClass } = useTheme()
const { sortedCommunities, totalMaterialCount, loading, addCommunity, ensurePostsLoaded } = useCommunityStore()
const { unreadRelevantCount } = useNotificationStore()
const { syncFromCommunities } = useTagStore()

const unreadCount = unreadRelevantCount
const hasUnreadNotices = computed(() => unreadCount.value > 0)
const spaceGroups = computed(() => {
  const pinned = []
  const other = []
  for (const c of sortedCommunities.value) {
    if (c.pinned) pinned.push(c)
    else other.push(c)
  }
  return { pinned, other }
})
const pinnedSpaces = computed(() => spaceGroups.value.pinned)
const otherSpaces = computed(() => spaceGroups.value.other)

const iconPresets = COMMUNITY_ICON_PRESETS
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

function openFeed(id) { navChild(`/pages/community/feed?id=${id}`) }
function openInfo(id) { navChild(`/pages/community/info?id=${id}`) }
function openMaterials(communityId = '') {
  const q = communityId ? `?communityId=${encodeURIComponent(communityId)}` : ''
  navChild(`/pages/community/materials${q}`)
}
function openMembers() { navChild('/pages/community/members') }
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
  syncFromCommunities([{ name: draft.value.name.trim() }])
  closeCreateSheet()
  resetDraft()
  toast.communityCreated()
}

onShow(() => {
  ensurePostsLoaded()
})
</script>

<style scoped>
.page { min-height: 100vh; height: 100vh; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.bg {
  position: absolute; inset: 0;
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.18), transparent 60%),
    linear-gradient(180deg, rgba(248, 250, 255, 1), rgba(241, 244, 250, 1));
}
.t-dark .bg {
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%),
    linear-gradient(180deg, #111315, #0e1014);
}

.filterWrap { padding: 8rpx 28rpx 14rpx; }
.filterRow { display: flex; gap: 10rpx; align-items: stretch; }
.filterDrop {
  flex: 1; min-width: 0; min-height: 68rpx; padding: 0 16rpx;
  border-radius: 20rpx; background: rgba(255, 255, 255, 0.72);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  display: flex; align-items: center; gap: 10rpx;
}
.filterDrop.iconDrop { flex: 0 0 68rpx; padding: 0; justify-content: center; }
.t-dark .filterDrop { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.08); }
.filterDrop:active { transform: scale(0.985); background: rgba(46, 99, 255, 0.06); }
.filterDropText { flex: 1; min-width: 0; font-size: 22rpx; font-weight: 660; color: rgba(16, 24, 40, 0.82); }
.t-dark .filterDropText { color: rgba(245, 247, 255, 0.82); }
.filterChev { font-size: 18rpx; color: rgba(16, 24, 40, 0.38); flex-shrink: 0; }
.t-dark .filterChev { color: rgba(245, 247, 255, 0.38); }
.noticeGlyph { width: 32rpx; height: 32rpx; position: relative; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
.noticeGlyph .bell {
  width: 14rpx; height: 14rpx; border-radius: 14rpx 14rpx 4rpx 4rpx;
  background: rgba(46, 99, 255, 0.92);
}
.t-dark .noticeGlyph .bell { background: rgba(170, 200, 255, 0.92); }
.noticeDot {
  position: absolute; top: 2rpx; right: 2rpx; width: 10rpx; height: 10rpx;
  border-radius: 50%; background: #ff4d4f; border: 2rpx solid rgba(255,255,255,0.95);
}
.noticeNum { font-size: 20rpx; font-weight: 720; color: rgba(46, 99, 255, 0.88); flex-shrink: 0; }
.menuIcon { display: flex; gap: 4rpx; align-items: center; }
.menuIcon .dot { width: 5rpx; height: 5rpx; border-radius: 50%; background: rgba(16, 24, 40, 0.55); }
.t-dark .menuIcon .dot { background: rgba(245, 247, 255, 0.55); }
.memberIcon {
  width: 28rpx; height: 22rpx; position: relative;
}
.memberHead {
  position: absolute; top: 0; width: 10rpx; height: 10rpx; border-radius: 50%;
  background: rgba(46, 99, 255, 0.88);
}
.memberHead.left { left: 2rpx; }
.memberHead.right { right: 2rpx; }
.memberBody {
  position: absolute; left: 50%; bottom: 0; width: 22rpx; height: 10rpx;
  margin-left: -11rpx; border-radius: 12rpx 12rpx 0 0;
  background: rgba(46, 99, 255, 0.72);
}
.t-dark .memberHead { background: rgba(170, 200, 255, 0.92); }
.t-dark .memberBody { background: rgba(170, 200, 255, 0.72); }

.scroll { position: relative; z-index: 1; }
.safe { padding: 0 28rpx 200rpx; }
.list { display: flex; flex-direction: column; }
.section { padding-top: 2rpx; }
.section.divided { margin-top: 22rpx; padding-top: 20rpx; border-top: 1rpx solid rgba(16, 24, 40, 0.08); }
.t-dark .section.divided { border-top-color: rgba(255, 255, 255, 0.08); }
.sectionHead { display: flex; align-items: center; justify-content: space-between; padding: 0 4rpx 12rpx; }
.sectionLabel { font-size: 22rpx; font-weight: 700; color: rgba(16, 24, 40, 0.58); }
.t-dark .sectionLabel { color: rgba(245, 247, 255, 0.52); }
.sectionCount { font-size: 20rpx; font-weight: 700; color: rgba(16, 24, 40, 0.38); }
.sectionBody { display: flex; flex-direction: column; gap: var(--list-stack-gap); }

.emptyWrap { padding: 32rpx 12rpx; }
.gap { height: 24rpx; }

.addFab {
  position: fixed; right: 28rpx; bottom: calc(160rpx + env(safe-area-inset-bottom));
  width: 96rpx; height: 96rpx; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255, 255, 255, 0.78); border: 1rpx solid rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(16px); box-shadow: 0 26rpx 70rpx rgba(12, 20, 40, 0.22); z-index: 35;
}
.t-dark .addFab { background: rgba(26, 29, 33, 0.86); border-color: rgba(255, 255, 255, 0.08); }
.addFab:active { transform: scale(0.94); }
.plus { position: relative; width: 26rpx; height: 26rpx; }
.hLine, .vLine { position: absolute; background: rgba(46, 99, 255, 0.95); border-radius: 999rpx; }
.hLine { left: 0; right: 0; top: 50%; height: 2.4rpx; margin-top: -1.2rpx; }
.vLine { top: 0; bottom: 0; left: 50%; width: 2.4rpx; margin-left: -1.2rpx; }

.overlay { position: fixed; inset: 0; z-index: 50; opacity: 0; pointer-events: none; background: rgba(8, 12, 24, 0.4); backdrop-filter: blur(12px); transition: opacity 0.22s ease; }
.overlay.show { opacity: 1; pointer-events: auto; }
.sheet { position: absolute; left: 14rpx; right: 14rpx; bottom: 14rpx; padding: 20rpx 22rpx 24rpx; border-radius: 32rpx; background: rgba(255, 255, 255, 0.94); border: 1rpx solid rgba(255, 255, 255, 0.6); max-height: 82vh; overflow-y: auto; }
.t-dark .sheet { background: #1a1d21; border-color: rgba(255, 255, 255, 0.06); }
.grabber { width: 56rpx; height: 6rpx; border-radius: 999rpx; background: rgba(16, 24, 40, 0.12); margin: 0 auto 14rpx; }
.sheetTitle { font-size: 26rpx; font-weight: 740; color: rgba(16, 24, 40, 0.92); }
.sheetSub { display: block; margin-top: 4rpx; font-size: 20rpx; color: rgba(16, 24, 40, 0.48); }
.t-dark .sheetTitle { color: #f5f7fa; }
.t-dark .sheetSub { color: rgba(245, 247, 255, 0.42); }
.iconRow { margin-top: 16rpx; display: flex; align-items: center; gap: 12rpx; }
.iconPreview {
  width: 80rpx; height: 80rpx; border-radius: 22rpx; flex-shrink: 0;
  background: rgba(46, 99, 255, 0.1); display: flex; align-items: center; justify-content: center;
  font-size: 34rpx; font-weight: 720; color: rgba(46, 99, 255, 0.96);
}
.iconTools { flex: 1; display: flex; gap: 8rpx; align-items: center; }
.toolChip { padding: 10rpx 16rpx; border-radius: 999rpx; background: rgba(16, 24, 40, 0.05); font-size: 20rpx; font-weight: 700; color: rgba(16, 24, 40, 0.65); }
.iconInput { flex: 1; height: 68rpx; border-radius: 18rpx; background: rgba(16, 24, 40, 0.04); border: 1rpx solid rgba(16, 24, 40, 0.08); text-align: center; font-size: 22rpx; }
.iconScroll { margin-top: 12rpx; white-space: nowrap; }
.iconScrollInner { display: inline-flex; gap: 8rpx; }
.iconChip { width: 60rpx; height: 60rpx; border-radius: 16rpx; background: rgba(16, 24, 40, 0.04); display: inline-flex; align-items: center; justify-content: center; font-size: 26rpx; color: rgba(46, 99, 255, 0.92); }
.iconChip.on { background: rgba(46, 99, 255, 0.12); }
.field { margin-top: 12rpx; }
.fieldInput { width: 100%; height: 76rpx; padding: 0 16rpx; border-radius: 18rpx; background: rgba(16, 24, 40, 0.04); border: 1rpx solid rgba(16, 24, 40, 0.08); font-size: 23rpx; box-sizing: border-box; }
.t-dark .fieldInput { background: #23272d; border-color: rgba(255, 255, 255, 0.08); color: #f5f7fa; }
.ph { color: rgba(16, 24, 40, 0.35); }
.primaryBtn {
  margin-top: 18rpx; height: 84rpx; border-radius: 22rpx;
  background: linear-gradient(180deg, #5a8eff, #2e63ff);
  display: flex; align-items: center; justify-content: center;
  color: #fff; font-size: 23rpx; font-weight: 720;
  box-shadow: 0 14rpx 36rpx rgba(46, 99, 255, 0.28);
}
</style>
