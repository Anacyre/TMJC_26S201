<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader nav-mode="back" />

    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
      <view v-if="!community" class="emptyWrap">
        <EmptyState variant="posts" title="Space not found" />
      </view>

      <template v-else>
        <view class="profileCard">
          <view class="profileHead">
            <view class="profileIcon">{{ displayIcon }}</view>
            <view class="profileMain">
              <text class="profileName">{{ displayName }}</text>
              <text class="profileDesc">{{ displayDesc || 'No description yet.' }}</text>
            </view>
          </view>
          <view class="statRow">
            <view class="statPill">
              <text class="statNum">{{ postCount }}</text>
              <text class="statLabel">Posts</text>
            </view>
            <view class="statPill">
              <text class="statNum">{{ memberCount }}</text>
              <text class="statLabel">Members</text>
            </view>
          </view>
        </view>

        <view class="panel">
          <text class="panelLabel">Details</text>
          <view class="detailRow">
            <text class="detailKey">Created</text>
            <text class="detailVal">{{ createdLabel }}</text>
          </view>
          <view v-if="community.createdByName" class="detailRow">
            <text class="detailKey">Created by</text>
            <text class="detailVal">{{ community.createdByName }}</text>
          </view>
          <view v-if="updatedLabel" class="detailRow">
            <text class="detailKey">Updated</text>
            <text class="detailVal">{{ updatedLabel }}</text>
          </view>
        </view>

        <view class="actionRow tap" role="button" @tap="openFeed">
          <text class="actionLabel">View posts</text>
          <text class="actionChev">&gt;</text>
        </view>

        <view class="panel">
          <view class="panelHead">
            <text class="panelLabel">Members</text>
            <text class="panelLink tap" role="button" @tap="openMembersTab">See all</text>
          </view>
          <scroll-view class="memberScroll" scroll-x :show-scrollbar="false">
            <view class="memberRow">
              <view
                v-for="m in memberPreview"
                :key="m.id"
                class="memberItem tap"
                role="button"
                @tap="openMember(m.id)"
              >
                <view class="memberAvatar">{{ initials(m.name) }}</view>
                <text class="memberName">{{ firstName(m.name) }}</text>
              </view>
            </view>
          </scroll-view>
        </view>

        <view v-if="isAdmin" class="actionRow admin tap" role="button" @tap="openEditSheet">
          <text class="actionLabel">Edit space</text>
          <text class="actionChev">&gt;</text>
        </view>
      </template>

      <view class="gap" />
    </scroll-view>

    <view class="overlay" :class="{ show: showEdit }" @tap="closeEditSheet">
      <view class="sheet" @tap.stop>
        <view class="grabber" />
        <text class="sheetTitle">Edit space</text>

        <view class="editIconRow">
          <view class="editIconPreview">{{ draft.icon || '◉' }}</view>
          <view class="editIconTools">
            <view class="toolBtn tap" role="button" @tap="autoSuggestIcon"><text>Auto icon</text></view>
            <input
              class="toolInput"
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
              <text class="iconChipGlyph">{{ preset.icon }}</text>
              <text class="iconChipName">{{ preset.label }}</text>
            </view>
          </view>
        </scroll-view>

        <view class="field">
          <text class="fieldLabel">Name</text>
          <input class="fieldInput" v-model="draft.name" placeholder="Space name" placeholder-class="ph" />
        </view>
        <view class="field">
          <text class="fieldLabel">Description</text>
          <input class="fieldInput" v-model="draft.desc" placeholder="What is this space for?" placeholder-class="ph" />
        </view>

        <view class="sheetActions">
          <view class="sheetBtn ghost tap" role="button" @tap="closeEditSheet"><text>Cancel</text></view>
          <view class="sheetBtn primary tap" :class="{ busy: saving }" role="button" @tap="saveEdit">
            <text>{{ saving ? '…' : 'Save changes' }}</text>
          </view>
        </view>
      </view>
    </view>

    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import AppHeader from '@/components/AppHeader.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useTheme } from '@/composables/useTheme'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { useMemberStore } from '@/composables/useMemberStore'
import { useAdminMode } from '@/composables/useAdminMode'
import { navSibling } from '@/lib/navigation'
import { toast } from '@/composables/useToast'
import {
  COMMUNITY_ICON_PRESETS,
  normalizeCommunityIcon,
  suggestCommunityIcon,
} from '@/lib/communityIcons'

const { themeClass } = useTheme()
const { getCommunityById, getPostsByCommunity, updateCommunity } = useCommunityStore()
const { visibleMembers } = useMemberStore()
const { isAdminActive: isAdmin } = useAdminMode()

const id = ref('')
const showEdit = ref(false)
const saving = ref(false)
const draft = ref({ name: '', desc: '', icon: '◉', iconManual: false })
const iconPresets = COMMUNITY_ICON_PRESETS

const community = computed(() => (id.value ? getCommunityById(id.value) : null))
const displayName = computed(() => community.value?.name || '')
const displayDesc = computed(() => community.value?.desc || '')
const displayIcon = computed(() => community.value?.icon || '◉')
const postCount = computed(() => getPostsByCommunity(id.value).length)
const memberCount = computed(() => visibleMembers.value.length)
const memberPreview = computed(() => visibleMembers.value.slice(0, 12))

const createdLabel = computed(() => formatDate(community.value?.createdAt))
const updatedLabel = computed(() => {
  const created = community.value?.createdAt
  const updated = community.value?.updatedAt
  if (!updated || updated === created) return ''
  return formatDate(updated)
})

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('en-SG', { year: 'numeric', month: 'short', day: 'numeric' })
}

function initials(name) {
  return String(name || '?').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()
}

function firstName(name) {
  return String(name || '').split(' ')[0] || '?'
}

function openFeed() {
  if (!id.value) return
  navSibling(`/pages/community/feed?id=${id.value}`)
}

function openMember(memberId) {
  navSibling(`/pages/member/profile?id=${memberId}`)
}

function openMembersTab() {
  navSibling('/pages/community/index?tab=members')
}

function openEditSheet() {
  if (!community.value) return
  draft.value = {
    name: community.value.name,
    desc: community.value.desc,
    icon: community.value.icon || '◉',
    iconManual: true,
  }
  showEdit.value = true
}

function closeEditSheet() {
  showEdit.value = false
}

function autoSuggestIcon() {
  draft.value.icon = suggestCommunityIcon(draft.value.name, draft.value.desc)
  draft.value.iconManual = true
}

function pickIcon(icon) {
  draft.value.icon = icon
  draft.value.iconManual = true
}

async function saveEdit() {
  if (saving.value || !id.value) return
  if (!draft.value.name.trim()) {
    toast.show('Name required')
    return
  }
  saving.value = true
  try {
    const icon = normalizeCommunityIcon(draft.value.icon, draft.value.name, draft.value.desc)
    const { error } = await updateCommunity(id.value, {
      name: draft.value.name.trim(),
      desc: draft.value.desc.trim(),
      icon,
    })
    if (error) {
      toast.show(error.message || 'Could not update space')
      return
    }
    closeEditSheet()
    toast.communityUpdated()
  } finally {
    saving.value = false
  }
}

watch(
  () => [draft.value.name, draft.value.desc],
  () => {
    if (showEdit.value && !draft.value.iconManual) {
      draft.value.icon = suggestCommunityIcon(draft.value.name, draft.value.desc)
    }
  }
)

onLoad((q) => {
  id.value = q?.id || ''
})
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; display: flex; flex-direction: column; }
.bg { position: absolute; inset: 0; background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.16), transparent 60%), linear-gradient(180deg, #f8faff, #f1f4fa); }
.t-dark .bg { background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%), linear-gradient(180deg, #111315, #0e1014); }

.scroll { position: relative; z-index: 1; height: calc(100vh - var(--shell-header-offset, 148rpx)); padding: 12rpx 28rpx 60rpx; }
.emptyWrap { padding: 80rpx 0; }
.gap { height: 32rpx; }

.profileCard,
.panel,
.actionRow {
  border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.78);
  border: 1rpx solid rgba(16, 24, 40, 0.05);
}
.t-dark .profileCard,
.t-dark .panel,
.t-dark .actionRow {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}

.profileCard { padding: 20rpx 20rpx 16rpx; margin-bottom: 12rpx; }
.profileHead { display: flex; align-items: flex-start; gap: 16rpx; }
.profileIcon {
  width: 88rpx; height: 88rpx; border-radius: 24rpx; flex-shrink: 0;
  background: rgba(46, 99, 255, 0.12);
  display: flex; align-items: center; justify-content: center;
  color: rgba(46, 99, 255, 0.96); font-size: 38rpx; font-weight: 720;
}
.t-dark .profileIcon { background: rgba(120, 160, 255, 0.16); color: rgba(170, 200, 255, 0.96); }
.profileMain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; padding-top: 4rpx; }
.profileName { font-size: 30rpx; font-weight: 780; color: rgba(16, 24, 40, 0.92); line-height: 1.25; }
.t-dark .profileName { color: rgba(245, 247, 255, 0.92); }
.profileDesc { font-size: 22rpx; line-height: 1.45; color: rgba(16, 24, 40, 0.55); }
.t-dark .profileDesc { color: rgba(245, 247, 255, 0.48); }

.statRow { margin-top: 18rpx; padding-top: 16rpx; border-top: 1rpx solid rgba(16, 24, 40, 0.06); display: flex; gap: 12rpx; }
.t-dark .statRow { border-top-color: rgba(255, 255, 255, 0.06); }
.statPill {
  flex: 1; padding: 12rpx 14rpx; border-radius: 18rpx;
  background: rgba(46, 99, 255, 0.06); display: flex; flex-direction: column; gap: 2rpx;
}
.t-dark .statPill { background: rgba(120, 160, 255, 0.08); }
.statNum { font-size: 28rpx; font-weight: 780; color: rgba(46, 99, 255, 0.96); }
.t-dark .statNum { color: rgba(170, 200, 255, 0.96); }
.statLabel { font-size: 18rpx; font-weight: 660; color: rgba(16, 24, 40, 0.45); }
.t-dark .statLabel { color: rgba(245, 247, 255, 0.4); }

.panel { padding: 16rpx 18rpx; margin-bottom: 12rpx; }
.panelHead { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10rpx; }
.panelLabel { font-size: 20rpx; font-weight: 700; color: rgba(16, 24, 40, 0.42); letter-spacing: 0.3rpx; }
.t-dark .panelLabel { color: rgba(245, 247, 255, 0.38); }
.panelLink { font-size: 20rpx; font-weight: 680; color: rgba(46, 99, 255, 0.88); }
.t-dark .panelLink { color: rgba(170, 200, 255, 0.88); }

.detailRow {
  display: flex; align-items: flex-start; justify-content: space-between; gap: 16rpx;
  padding: 12rpx 0; border-bottom: 1rpx solid rgba(16, 24, 40, 0.05);
}
.detailRow:last-child { border-bottom: none; padding-bottom: 0; }
.t-dark .detailRow { border-bottom-color: rgba(255, 255, 255, 0.05); }
.detailKey { font-size: 22rpx; color: rgba(16, 24, 40, 0.48); flex-shrink: 0; }
.t-dark .detailKey { color: rgba(245, 247, 255, 0.42); }
.detailVal { font-size: 22rpx; color: rgba(16, 24, 40, 0.88); text-align: right; line-height: 1.35; }
.t-dark .detailVal { color: rgba(245, 247, 255, 0.88); }

.actionRow {
  padding: 20rpx 18rpx; margin-bottom: 12rpx;
  display: flex; align-items: center; justify-content: space-between;
}
.actionRow:active { opacity: 0.88; }
.actionRow.admin { margin-bottom: 0; }
.actionLabel { font-size: 24rpx; font-weight: 720; color: rgba(16, 24, 40, 0.9); }
.t-dark .actionLabel { color: rgba(245, 247, 255, 0.9); }
.actionChev { font-size: 22rpx; color: rgba(46, 99, 255, 0.45); }

.memberScroll { white-space: nowrap; }
.memberRow { display: inline-flex; gap: 14rpx; padding: 2rpx 0 4rpx; }
.memberItem { width: 92rpx; display: inline-flex; flex-direction: column; align-items: center; gap: 6rpx; }
.memberAvatar {
  width: 68rpx; height: 68rpx; border-radius: 50%;
  background: rgba(46, 99, 255, 0.14);
  display: flex; align-items: center; justify-content: center;
  color: rgba(46, 99, 255, 0.96); font-size: 20rpx; font-weight: 760;
}
.t-dark .memberAvatar { background: rgba(120, 160, 255, 0.16); color: rgba(170, 200, 255, 0.96); }
.memberName { font-size: 18rpx; color: rgba(16, 24, 40, 0.58); text-align: center; }
.t-dark .memberName { color: rgba(245, 247, 255, 0.5); }

.overlay { position: fixed; inset: 0; z-index: 50; opacity: 0; pointer-events: none; background: rgba(8, 12, 24, 0.4); backdrop-filter: blur(12px); transition: opacity 0.22s ease; }
.overlay.show { opacity: 1; pointer-events: auto; }
.sheet { position: absolute; left: 14rpx; right: 14rpx; bottom: 14rpx; padding: 20rpx 22rpx 24rpx; border-radius: 32rpx; background: rgba(255, 255, 255, 0.94); border: 1rpx solid rgba(255, 255, 255, 0.6); max-height: 82vh; overflow-y: auto; }
.t-dark .sheet { background: #1a1d21; border-color: rgba(255, 255, 255, 0.06); }
.grabber { width: 56rpx; height: 6rpx; border-radius: 999rpx; background: rgba(16, 24, 40, 0.12); margin: 0 auto 14rpx; }
.sheetTitle { font-size: 26rpx; font-weight: 740; color: rgba(16, 24, 40, 0.92); }
.t-dark .sheetTitle { color: #f5f7fa; }

.editIconRow { margin-top: 16rpx; display: flex; align-items: center; gap: 14rpx; }
.editIconPreview {
  width: 80rpx; height: 80rpx; border-radius: 22rpx; flex-shrink: 0;
  background: rgba(46, 99, 255, 0.12);
  display: flex; align-items: center; justify-content: center;
  font-size: 34rpx; font-weight: 720; color: rgba(46, 99, 255, 0.96);
}
.editIconTools { flex: 1; display: flex; align-items: center; gap: 10rpx; }
.toolBtn { padding: 12rpx 18rpx; border-radius: 999rpx; background: rgba(46, 99, 255, 0.1); border: 1rpx solid rgba(46, 99, 255, 0.16); font-size: 20rpx; font-weight: 700; color: rgba(46, 99, 255, 0.92); flex-shrink: 0; }
.toolInput { flex: 1; height: 68rpx; border-radius: 18rpx; background: rgba(16, 24, 40, 0.04); border: 1rpx solid rgba(16, 24, 40, 0.08); text-align: center; font-size: 22rpx; color: rgba(16, 24, 40, 0.92); }
.t-dark .toolInput { background: #23272d; border-color: rgba(255, 255, 255, 0.08); color: #f5f7fa; }

.iconScroll { margin-top: 14rpx; white-space: nowrap; }
.iconScrollInner { display: inline-flex; gap: 10rpx; padding-bottom: 4rpx; }
.iconChip {
  width: 88rpx; padding: 10rpx 6rpx 8rpx; border-radius: 18rpx; flex-shrink: 0;
  background: rgba(16, 24, 40, 0.04); border: 1rpx solid rgba(16, 24, 40, 0.06);
  display: inline-flex; flex-direction: column; align-items: center; gap: 4rpx;
}
.iconChip.on { background: rgba(46, 99, 255, 0.12); border-color: rgba(46, 99, 255, 0.28); }
.iconChipGlyph { font-size: 28rpx; color: rgba(46, 99, 255, 0.95); font-weight: 720; }
.iconChipName { font-size: 15rpx; color: rgba(16, 24, 40, 0.48); }
.t-dark .iconChipName { color: rgba(245, 247, 255, 0.42); }

.field { margin-top: 14rpx; }
.fieldLabel { display: block; margin-bottom: 6rpx; font-size: 19rpx; font-weight: 680; color: rgba(16, 24, 40, 0.45); }
.t-dark .fieldLabel { color: rgba(245, 247, 255, 0.4); }
.fieldInput { width: 100%; height: 76rpx; padding: 0 16rpx; border-radius: 18rpx; background: rgba(16, 24, 40, 0.04); border: 1rpx solid rgba(16, 24, 40, 0.08); font-size: 23rpx; color: rgba(16, 24, 40, 0.92); box-sizing: border-box; }
.t-dark .fieldInput { background: #23272d; border-color: rgba(255, 255, 255, 0.08); color: #f5f7fa; }
.ph { color: rgba(16, 24, 40, 0.35); }

.sheetActions { margin-top: 18rpx; display: flex; gap: 10rpx; }
.sheetBtn { flex: 1; height: 80rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 720; }
.sheetBtn.ghost { background: rgba(16, 24, 40, 0.06); color: rgba(16, 24, 40, 0.72); }
.t-dark .sheetBtn.ghost { background: rgba(255, 255, 255, 0.06); color: rgba(245, 247, 255, 0.72); }
.sheetBtn.primary { background: linear-gradient(180deg, #5a8eff, #2e63ff); color: #fff; }
.sheetBtn.primary.busy { opacity: 0.7; }
</style>
