<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader nav-mode="back" />

    <scroll-view class="scroll" scroll-y :show-scrollbar="false" :enhanced="true">
      <view class="safe">
        <view v-if="!community" class="emptyWrap">
          <EmptyState variant="posts" title="Space not found" />
        </view>

        <template v-else>
          <view class="profileHead">
            <view class="profileIcon">{{ displayIcon }}</view>
            <view class="profileMain">
              <text class="profileName">{{ displayName }}</text>
              <text class="profileDesc">{{ displayDesc || 'No description yet.' }}</text>
              <text class="profileMeta">{{ postCount }} posts · {{ memberCount }} members</text>
            </view>
          </view>

          <view class="section">
            <CommunityRowLink
              title="Materials"
              :count="materialCount || ''"
              show-folder-icon
              @open="openMaterials"
            />
            <CommunityRowLink
              title="Announcements"
              :count="noticeCount || ''"
              @open="openFeedNotices"
            />
            <CommunityRowLink title="View posts" @open="openFeed" />
          </view>

          <view class="section divided">
            <view class="sectionHead">
              <text class="sectionLabel">Details</text>
            </view>
            <view class="detailCard">
              <view class="detailRow">
                <text class="detailKey">Created</text>
                <text class="detailVal">{{ createdLabel }}</text>
              </view>
              <view v-if="community.createdByName" class="detailRow">
                <text class="detailKey">By</text>
                <text class="detailVal">{{ community.createdByName }}</text>
              </view>
              <view v-if="updatedLabel" class="detailRow">
                <text class="detailKey">Updated</text>
                <text class="detailVal">{{ updatedLabel }}</text>
              </view>
            </view>
          </view>

          <view class="section divided">
            <view class="sectionHead">
              <text class="sectionLabel">Members</text>
              <text class="sectionLink tap" role="button" @tap="openMembersTab">All</text>
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

          <view v-if="isAdmin" class="section divided">
            <view class="sectionHead">
              <text class="sectionLabel">Admin</text>
            </view>
            <view class="detailCard">
              <view class="pinRow tap" role="button" @tap="togglePinned">
                <view class="pinCopy">
                  <text class="pinTitle">Pin space</text>
                  <text class="pinHint">Show at top of list</text>
                </view>
                <view class="pinSwitch" :class="{ on: draftPinned }">
                  <view class="pinKnob" />
                </view>
              </view>
            </view>
            <CommunityRowLink title="Edit space" @open="openEditSheet" />
          </view>
        </template>
      </view>
      <view class="gap" />
    </scroll-view>

    <view class="overlay" :class="{ show: showEdit }" @tap="closeEditSheet">
      <view class="sheet" @tap.stop>
        <view class="grabber" />
        <text class="sheetTitle">Edit space</text>

        <view class="editIconRow">
          <view class="editIconPreview">{{ draft.icon || '◉' }}</view>
          <view class="editIconTools">
            <view class="toolBtn tap" role="button" @tap="autoSuggestIcon"><text>Auto</text></view>
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
              <text>{{ preset.icon }}</text>
            </view>
          </view>
        </scroll-view>

        <view class="field">
          <input class="fieldInput" v-model="draft.name" placeholder="Name" placeholder-class="ph" />
        </view>
        <view class="field">
          <input class="fieldInput" v-model="draft.desc" placeholder="Description" placeholder-class="ph" />
        </view>

        <view class="sheetActions">
          <view class="sheetBtn ghost tap" role="button" @tap="closeEditSheet"><text>Cancel</text></view>
          <view class="sheetBtn primary tap" :class="{ busy: saving }" role="button" @tap="saveEdit">
            <text>{{ saving ? '…' : 'Save' }}</text>
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
import CommunityRowLink from '@/components/community/CommunityRowLink.vue'
import { useTheme } from '@/composables/useTheme'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { useNotificationStore } from '@/composables/useNotificationStore'
import { useMemberStore } from '@/composables/useMemberStore'
import { useAdminMode } from '@/composables/useAdminMode'
import { useTagStore } from '@/composables/useTagStore'
import { navSibling } from '@/lib/navigation'
import { toast } from '@/composables/useToast'
import { filterMaterialPosts, isMaterialPost } from '@/lib/communityMaterials'
import { noticeMatchesCommunity } from '@/lib/communitySubjectLinks'
import {
  COMMUNITY_ICON_PRESETS,
  normalizeCommunityIcon,
  suggestCommunityIcon,
} from '@/lib/communityIcons'

const { themeClass } = useTheme()
const { communities, getPostsByCommunity, materialPosts, updateCommunity } = useCommunityStore()
const { visibleNotifications } = useNotificationStore()
const { visibleMembers } = useMemberStore()
const { isAdminActive: isAdmin } = useAdminMode()
const { renameTag, syncFromCommunities } = useTagStore()

const id = ref('')
const showEdit = ref(false)
const saving = ref(false)
const draftPinned = ref(false)
const pinSaving = ref(false)
const draft = ref({ name: '', desc: '', icon: '◉', iconManual: false })

const materialCount = computed(() =>
  filterMaterialPosts(materialPosts.value, { communityId: id.value }).length
)
const iconPresets = COMMUNITY_ICON_PRESETS

const community = computed(() => {
  if (!id.value) return null
  return communities.value.find((c) => String(c.id) === String(id.value)) || null
})
const displayName = computed(() => community.value?.name || '')
const displayDesc = computed(() => community.value?.desc || '')
const displayIcon = computed(() => community.value?.icon || '◉')
const postCount = computed(() =>
  getPostsByCommunity(id.value).filter((p) => !isMaterialPost(p)).length
)
const noticeCount = computed(() => {
  const space = community.value
  if (!space) return 0
  return visibleNotifications.value.filter((n) => noticeMatchesCommunity(n, space)).length
})
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

function openMaterials() {
  if (!id.value) return
  navSibling(`/pages/community/materials?communityId=${encodeURIComponent(id.value)}`)
}

async function togglePinned() {
  if (pinSaving.value || !id.value || !community.value) return
  const next = !community.value.pinned
  pinSaving.value = true
  draftPinned.value = next
  try {
    const { error } = await updateCommunity(id.value, { pinned: next })
    if (error) {
      draftPinned.value = !!community.value.pinned
      toast.show(error.message || 'Could not update pin')
      return
    }
    toast.communityUpdated()
  } finally {
    pinSaving.value = false
  }
}

function openFeedNotices() {
  if (!id.value) return
  navSibling(`/pages/community/feed?id=${id.value}&tab=notices`)
}

function openFeed() {
  if (!id.value) return
  navSibling(`/pages/community/feed?id=${id.value}`)
}

function openMember(memberId) {
  navSibling(`/pages/member/profile?id=${memberId}`)
}

function openMembersTab() {
  navSibling('/pages/community/members')
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
  const nextName = draft.value.name.trim()
  const nextDesc = draft.value.desc.trim()
  if (!nextName) {
    toast.show('Name required')
    return
  }
  saving.value = true
  try {
    const previousName = community.value?.name || ''
    const icon = normalizeCommunityIcon(draft.value.icon, nextName, nextDesc)
    const { error } = await updateCommunity(id.value, {
      name: nextName,
      desc: nextDesc,
      icon,
    })
    if (error) {
      toast.show(error.message || 'Could not update space')
      return
    }
    if (previousName && previousName !== nextName) {
      renameTag(previousName, nextName)
    }
    syncFromCommunities([{ name: nextName }])
    closeEditSheet()
    toast.communityUpdated()
  } finally {
    saving.value = false
  }
}

watch(
  community,
  (c) => {
    draftPinned.value = !!c?.pinned
  },
  { immediate: true }
)

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
.bg {
  position: absolute; inset: 0;
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.16), transparent 60%),
    linear-gradient(180deg, #f8faff, #f1f4fa);
}
.t-dark .bg {
  background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%),
    linear-gradient(180deg, #111315, #0e1014);
}

.scroll { position: relative; z-index: 1; flex: 1; min-height: 0; }
.safe { padding: 12rpx 28rpx 60rpx; }
.emptyWrap { padding: 80rpx 0; }
.gap { height: 32rpx; }

.profileHead { display: flex; align-items: flex-start; gap: 16rpx; margin-bottom: 20rpx; }
.profileIcon {
  width: 80rpx; height: 80rpx; border-radius: 22rpx; flex-shrink: 0;
  background: rgba(46, 99, 255, 0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 36rpx; font-weight: 720; color: rgba(46, 99, 255, 0.96);
}
.t-dark .profileIcon { background: rgba(120, 160, 255, 0.14); color: rgba(170, 200, 255, 0.96); }
.profileMain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 4rpx; padding-top: 2rpx; }
.profileName { font-size: 30rpx; font-weight: 780; color: rgba(16, 24, 40, 0.92); line-height: 1.25; }
.t-dark .profileName { color: rgba(245, 247, 255, 0.92); }
.profileDesc { font-size: 22rpx; line-height: 1.45; color: rgba(16, 24, 40, 0.55); }
.t-dark .profileDesc { color: rgba(245, 247, 255, 0.48); }
.profileMeta { font-size: 20rpx; color: rgba(16, 24, 40, 0.42); margin-top: 2rpx; }
.t-dark .profileMeta { color: rgba(245, 247, 255, 0.38); }

.section { display: flex; flex-direction: column; gap: var(--list-stack-gap); }
.section.divided { margin-top: 22rpx; padding-top: 20rpx; border-top: 1rpx solid rgba(16, 24, 40, 0.08); }
.t-dark .section.divided { border-top-color: rgba(255, 255, 255, 0.08); }
.sectionHead { display: flex; align-items: center; justify-content: space-between; padding: 0 4rpx 8rpx; }
.sectionLabel { font-size: 22rpx; font-weight: 700; color: rgba(16, 24, 40, 0.58); }
.t-dark .sectionLabel { color: rgba(245, 247, 255, 0.52); }
.sectionLink { font-size: 20rpx; font-weight: 680; color: rgba(46, 99, 255, 0.88); }

.detailCard {
  padding: 4rpx 16rpx;
  border-radius: var(--list-card-radius, 20rpx);
  background: rgba(255, 255, 255, 0.7);
  border: 1rpx solid rgba(16, 24, 40, 0.04);
}
.t-dark .detailCard { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.detailRow {
  display: flex; align-items: center; justify-content: space-between; gap: 16rpx;
  padding: 14rpx 0; border-bottom: 1rpx solid rgba(16, 24, 40, 0.05);
}
.detailRow:last-child { border-bottom: none; }
.t-dark .detailRow { border-bottom-color: rgba(255, 255, 255, 0.05); }
.detailKey { font-size: 22rpx; color: rgba(16, 24, 40, 0.48); flex-shrink: 0; }
.t-dark .detailKey { color: rgba(245, 247, 255, 0.42); }
.detailVal { font-size: 22rpx; color: rgba(16, 24, 40, 0.88); text-align: right; }
.t-dark .detailVal { color: rgba(245, 247, 255, 0.88); }

.pinRow { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; padding: 10rpx 0; }
.pinCopy { display: flex; flex-direction: column; gap: 2rpx; }
.pinTitle { font-size: 22rpx; font-weight: 720; color: rgba(16, 24, 40, 0.88); }
.t-dark .pinTitle { color: rgba(245, 247, 255, 0.88); }
.pinHint { font-size: 18rpx; color: rgba(16, 24, 40, 0.42); }
.t-dark .pinHint { color: rgba(245, 247, 255, 0.38); }
.pinSwitch {
  width: 72rpx; height: 40rpx; border-radius: 999rpx; flex-shrink: 0; position: relative;
  background: rgba(16, 24, 40, 0.12); transition: background 180ms ease;
}
.pinSwitch.on { background: rgba(46, 99, 255, 0.88); }
.pinKnob {
  position: absolute; top: 4rpx; left: 4rpx; width: 32rpx; height: 32rpx; border-radius: 50%;
  background: #fff; transition: transform 180ms ease;
}
.pinSwitch.on .pinKnob { transform: translateX(32rpx); }

.memberScroll { white-space: nowrap; }
.memberRow { display: inline-flex; gap: 14rpx; padding: 2rpx 0 4rpx; }
.memberItem { width: 88rpx; display: inline-flex; flex-direction: column; align-items: center; gap: 6rpx; }
.memberAvatar {
  width: 64rpx; height: 64rpx; border-radius: 50%;
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
  background: rgba(46, 99, 255, 0.1);
  display: flex; align-items: center; justify-content: center;
  font-size: 34rpx; font-weight: 720; color: rgba(46, 99, 255, 0.96);
}
.editIconTools { flex: 1; display: flex; align-items: center; gap: 10rpx; }
.toolBtn { padding: 12rpx 18rpx; border-radius: 999rpx; background: rgba(16, 24, 40, 0.05); font-size: 20rpx; font-weight: 700; color: rgba(16, 24, 40, 0.65); flex-shrink: 0; }
.toolInput { flex: 1; height: 68rpx; border-radius: 18rpx; background: rgba(16, 24, 40, 0.04); border: 1rpx solid rgba(16, 24, 40, 0.08); text-align: center; font-size: 22rpx; }
.iconScroll { margin-top: 14rpx; white-space: nowrap; }
.iconScrollInner { display: inline-flex; gap: 8rpx; }
.iconChip { width: 60rpx; height: 60rpx; border-radius: 16rpx; background: rgba(16, 24, 40, 0.04); display: inline-flex; align-items: center; justify-content: center; font-size: 26rpx; color: rgba(46, 99, 255, 0.92); }
.iconChip.on { background: rgba(46, 99, 255, 0.12); }
.field { margin-top: 14rpx; }
.fieldInput { width: 100%; height: 76rpx; padding: 0 16rpx; border-radius: 18rpx; background: rgba(16, 24, 40, 0.04); border: 1rpx solid rgba(16, 24, 40, 0.08); font-size: 23rpx; box-sizing: border-box; }
.t-dark .fieldInput { background: #23272d; border-color: rgba(255, 255, 255, 0.08); color: #f5f7fa; }
.ph { color: rgba(16, 24, 40, 0.35); }
.sheetActions { margin-top: 18rpx; display: flex; gap: 10rpx; }
.sheetBtn { flex: 1; height: 80rpx; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; font-size: 22rpx; font-weight: 720; }
.sheetBtn.ghost { background: rgba(16, 24, 40, 0.06); color: rgba(16, 24, 40, 0.72); }
.t-dark .sheetBtn.ghost { background: rgba(255, 255, 255, 0.06); color: rgba(245, 247, 255, 0.72); }
.sheetBtn.primary { background: linear-gradient(180deg, #5a8eff, #2e63ff); color: #fff; }
.sheetBtn.primary.busy { opacity: 0.7; }
</style>
