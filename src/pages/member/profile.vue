<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader nav-mode="back" />
    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
      <view class="hero">
        <view class="avatar">{{ initials(member.name) }}</view>
        <text class="name">{{ member.name }}</text>
        <view class="metaLine">
          <text v-if="member.mbti" class="mbti">{{ member.mbti }}</text>
          <text v-if="alias && isMe" class="alias">@{{ alias }}</text>
        </view>
        <text v-if="member.bio" class="bio">{{ member.bio }}</text>
      </view>

      <view v-if="isMe || focusVisible" class="section">
        <view class="sectionHead">
          <text class="sectionLabel">Focus</text>
          <text v-if="isMe" class="sectionLink" role="button" @tap="openFocus">Open</text>
        </view>
        <view class="card pad">
          <view class="focusTop">
            <view class="focusStat">
              <text class="focusNum">{{ totalHoursLabel }}</text>
              <text class="focusLabel">All time</text>
            </view>
            <view class="focusStat">
              <text class="focusNum">{{ weekMinutesLabel }}</text>
              <text class="focusLabel">This week</text>
            </view>
            <view class="focusStat">
              <text class="focusNum">{{ topSubjectLabel }}</text>
              <text class="focusLabel">Top subject</text>
            </view>
          </view>

          <view class="chartHead">
            <text class="chartLabel">Weekly focus</text>
          </view>
          <view class="weekRow">
            <view v-for="d in weekTotals" :key="d.key" class="bar">
              <view class="barTrack">
                <view class="barFill" :style="{ height: barHeight(d.minutes) + '%' }" />
              </view>
              <text class="barLabel">{{ d.label.slice(0, 1) }}</text>
            </view>
          </view>

          <view class="chartHead">
            <text class="chartLabel">Monthly trend</text>
          </view>
          <view class="monthRow">
            <view v-for="m in monthTrend" :key="m.key" class="monthBar">
              <view class="monthFill" :style="{ height: monthHeight(m.minutes) + '%' }" />
              <text class="monthLabel">{{ m.label }}</text>
            </view>
          </view>

          <view v-if="subjectDistribution.length" class="chartHead">
            <text class="chartLabel">Subject distribution</text>
          </view>
          <view v-if="subjectDistribution.length" class="distRow">
            <view v-for="(s, idx) in subjectDistribution.slice(0, 4)" :key="s.name" class="distLine">
              <text class="distName">{{ s.name }}</text>
              <view class="distTrack">
                <view class="distFill" :style="{ width: distWidth(s.minutes) + '%', background: distColor(idx) }" />
              </view>
              <text class="distVal">{{ minuteLabel(s.minutes) }}</text>
            </view>
          </view>

          <view v-if="isMe" class="visRow">
            <text class="visLabel">Profile visibility</text>
            <view class="vis">
              <view class="visChip" :class="{ on: prefs.visibility === 'public' }" role="button" @tap="setVisibility('public')"><text class="visText">Public</text></view>
              <view class="visChip" :class="{ on: prefs.visibility === 'private' }" role="button" @tap="setVisibility('private')"><text class="visText">Private</text></view>
            </view>
          </view>
        </view>
      </view>

      <view v-if="member.interests" class="section">
        <text class="sectionLabel">Interests</text>
        <view class="card pad"><text class="value">{{ member.interests }}</text></view>
      </view>

      <view v-if="memberLinks.length" class="section">
        <text class="sectionLabel">Links</text>
        <view class="card pad">
          <text v-for="l in memberLinks" :key="l.label" class="link">{{ l.label }} ù {{ l.url }}</text>
        </view>
      </view>

      <view v-if="isMe" class="section">
        <text class="sectionLabel">Account</text>
        <view class="card pad accountCard">
          <view class="accountRow tap" role="button" @tap="editOpen = true">
            <text class="accountLabel">Edit profile</text>
            <text class="accountChev">&gt;</text>
          </view>
          <view class="accountRow tap" role="button" @tap="aliasOpen = true">
            <text class="accountLabel">Quick login alias</text>
            <text class="accountChev">&gt;</text>
          </view>
          <view class="accountRow tap danger" role="button" @tap="confirmLogout">
            <text class="accountLabel dangerText">Log out</text>
            <text class="accountChev dangerText">&gt;</text>
          </view>
        </view>
      </view>

      <view class="gap" />
    </scroll-view>

    <view class="overlay" :class="{ show: editOpen }" @tap="editOpen = false">
      <view class="sheet" @tap.stop>
        <text class="sheetTitle">Edit profile</text>
        <text class="sheetSub">Your fixed account name is set by admin and not editable.</text>
        <view class="lockField">
          <text class="lockLabel">Fixed account name</text>
          <text class="lockValue">{{ currentUser.name }}</text>
        </view>
        <view class="field">
          <text class="fieldLabel">MBTI</text>
          <input class="input" v-model="draft.mbti" placeholder="e.g. INTJ" placeholder-class="ph" />
        </view>
        <view class="field">
          <text class="fieldLabel">Interests</text>
          <input class="input" v-model="draft.interests" placeholder="oil painting, jazz piano..." placeholder-class="ph" />
        </view>
        <view class="field">
          <text class="fieldLabel">Bio</text>
          <textarea class="input area" v-model="draft.bio" placeholder="A short line about you." placeholder-class="ph" />
        </view>
        <view class="field">
          <text class="fieldLabel">Birthday visibility</text>
          <TagSelect
            v-model="draft.birthdayVisibility"
            :options="visibilityOptions"
            kind="visibility"
            placeholder="Who can see"
          />
        </view>
        <view class="saveBtn" role="button" @tap="saveProfile">
          <text class="saveText">Save changes</text>
        </view>
      </view>
    </view>

    <view class="overlay" :class="{ show: aliasOpen }" @tap="aliasOpen = false">
      <view class="sheet" @tap.stop>
        <text class="sheetTitle">Quick login alias</text>
        <text class="sheetSub">Only you can see this. Use it to sign in quickly instead of typing your email.</text>
        <view class="field">
          <text class="fieldLabel">Alias</text>
          <input class="input" v-model="aliasDraft" placeholder="e.g. alex" placeholder-class="ph" maxlength="24" />
        </view>
        <view class="saveBtn" role="button" @tap="saveAlias">
          <text class="saveText">Save alias</text>
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
import TagSelect from '@/components/TagSelect.vue'
import { useTheme } from '@/composables/useTheme'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { useUserStore } from '@/composables/useUserStore'
import { useFocusStore } from '@/composables/useFocusStore'
import { getQuickLoginAlias, setQuickLoginAlias } from '@/composables/useMemberStore'
import { toast } from '@/composables/useToast'
import { logout } from '@/api/auth'
import { clearAuthSession } from '@/composables/useAuthSession'

const { themeClass } = useTheme()
const { getMemberById } = useCommunityStore()
const { currentUser, updateProfile } = useUserStore()
const {
  prefs,
  totalHoursLabel,
  weekTotals,
  monthTrend,
  subjectDistribution,
  setVisibility,
} = useFocusStore()

const id = ref('')
const editOpen = ref(false)
const aliasOpen = ref(false)
const aliasDraft = ref('')
const visibilityOptions = ['Private', 'Friends', 'Class']
const draft = ref({ mbti: '', interests: '', bio: '', birthdayVisibility: 'Friends' })

const member = computed(() =>
  id.value === currentUser.value.id ? currentUser.value : (getMemberById(id.value) || currentUser.value)
)

const isMe = computed(() => id.value === currentUser.value.id)
const alias = computed(() => getQuickLoginAlias(currentUser.value.id))
const focusVisible = computed(() => prefs.value.visibility !== 'private')

const memberLinks = computed(() => {
  const raw = member.value.links || []
  return raw.map((l) => (typeof l === 'string' ? { label: 'Link', url: l } : l))
})

const weekMinutesLabel = computed(() => {
  const total = weekTotals.value.reduce((acc, d) => acc + d.minutes, 0)
  return total >= 60 ? `${(total / 60).toFixed(1)}h` : `${total}m`
})

const topSubjectLabel = computed(() => {
  const list = subjectDistribution.value
  if (!list.length) return '-'
  return list[0].name
})

function initials(name) {
  return String(name || '?').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()
}

async function saveProfile() {
  try {
    await updateProfile({
      mbti: draft.value.mbti,
      interests: draft.value.interests,
      bio: draft.value.bio,
      birthdayVisibility: draft.value.birthdayVisibility,
    })
    editOpen.value = false
    toast.saved()
  } catch (e) {
    toast.error('Could not save profile')
  }
}

function confirmLogout() {
  uni.showModal({
    title: 'Log out',
    content: 'Sign out on this device?',
    confirmText: 'Log out',
    confirmColor: '#e5484d',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await logout()
      } catch (e) {}
      clearAuthSession()
      uni.reLaunch({ url: '/pages/login/login' })
    },
  })
}

function saveAlias() {
  setQuickLoginAlias(currentUser.value.id, aliasDraft.value.trim())
  aliasOpen.value = false
  toast.saved()
}

function barHeight(minutes) {
  const max = Math.max(60, ...weekTotals.value.map((d) => d.minutes))
  if (!max) return 6
  return Math.max(6, Math.min(100, Math.round((minutes / max) * 100)))
}

function monthHeight(minutes) {
  const max = Math.max(60, ...monthTrend.value.map((m) => m.minutes))
  if (!max) return 6
  return Math.max(6, Math.min(100, Math.round((minutes / max) * 100)))
}

function distWidth(minutes) {
  const max = Math.max(60, ...subjectDistribution.value.map((s) => s.minutes))
  if (!max) return 4
  return Math.max(4, Math.min(100, Math.round((minutes / max) * 100)))
}

function distColor(idx) {
  const colors = [
    'linear-gradient(90deg, rgba(80,140,255,.95), rgba(46,99,255,.95))',
    'linear-gradient(90deg, rgba(180,140,255,.95), rgba(120,90,220,.95))',
    'linear-gradient(90deg, rgba(120,200,160,.95), rgba(36,160,110,.95))',
    'linear-gradient(90deg, rgba(255,180,80,.95), rgba(220,140,30,.95))',
  ]
  return colors[idx % colors.length]
}

function minuteLabel(minutes) {
  if (minutes >= 60) return `${(minutes / 60).toFixed(1)}h`
  return `${minutes}m`
}

function openFocus() {
  uni.navigateTo({ url: '/pages/study/focus', animationType: 'slide-in-right', animationDuration: 220 })
}

watch(
  () => currentUser.value,
  (u) => {
    draft.value = {
      mbti: u.mbti || '',
      interests: u.interests || '',
      bio: u.bio || '',
      birthdayVisibility: u.birthdayVisibility || 'Friends',
    }
    aliasDraft.value = getQuickLoginAlias(u.id) || ''
  },
  { immediate: true, deep: true }
)

onLoad((q) => { id.value = q?.id || currentUser.value.id })
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; }
.bg { position: absolute; inset: 0; background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(40, 110, 255, 0.16), transparent 60%), linear-gradient(180deg, #f8faff, #f1f4fa); }
.t-dark .bg { background: radial-gradient(1200rpx 800rpx at 40% 0%, rgba(60, 120, 255, 0.14), transparent 58%), linear-gradient(180deg, #111315, #0e1014); }
.scroll { position: relative; z-index: 1; height: calc(100vh - var(--shell-header-offset, 148rpx)); padding: 4rpx 28rpx 60rpx; }

.hero { padding: 22rpx 4rpx 18rpx; display: flex; flex-direction: column; gap: 8rpx; }
.avatar { width: 96rpx; height: 96rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: rgba(46, 99, 255, 0.12); color: rgba(46, 99, 255, 0.96); font-size: 28rpx; font-weight: 760; }
.t-dark .avatar { background: rgba(120, 160, 255, 0.18); color: rgba(170, 200, 255, 0.96); }
.name { margin-top: 12rpx; font-size: 34rpx; font-weight: 760; color: rgba(16, 24, 40, 0.92); }
.t-dark .name { color: #f5f7fa; }
.metaLine { display: flex; align-items: center; gap: 14rpx; }
.mbti { font-size: 20rpx; color: rgba(46, 99, 255, 0.92); font-weight: 720; letter-spacing: 0.4rpx; }
.t-dark .mbti { color: rgba(170, 200, 255, 0.95); }
.alias { font-size: 19rpx; color: rgba(16, 24, 40, 0.5); }
.t-dark .alias { color: rgba(245, 247, 255, 0.5); }
.bio { font-size: 22rpx; color: rgba(16, 24, 40, 0.6); line-height: 1.5; margin-top: 4rpx; }
.t-dark .bio { color: rgba(245, 247, 255, 0.7); }
.ctaRow { display: flex; gap: 10rpx; margin-top: 14rpx; }
.editBtn, .ghostBtn { padding: 12rpx 18rpx; border-radius: 999rpx; transition: transform 180ms ease; }
.editBtn { background: rgba(46, 99, 255, 0.14); border: 1rpx solid rgba(46, 99, 255, 0.24); }
.t-dark .editBtn { background: rgba(120, 160, 255, 0.18); border-color: rgba(120, 160, 255, 0.28); }
.editText { font-size: 20rpx; font-weight: 720; color: rgba(46, 99, 255, 0.96); }
.t-dark .editText { color: rgba(170, 200, 255, 0.96); }
.ghostBtn { background: rgba(16, 24, 40, 0.05); border: 1rpx solid rgba(16, 24, 40, 0.08); }
.t-dark .ghostBtn { background: rgba(255, 255, 255, 0.05); border-color: rgba(255, 255, 255, 0.08); }
.ghostText { font-size: 20rpx; font-weight: 700; color: rgba(16, 24, 40, 0.72); }
.t-dark .ghostText { color: rgba(245, 247, 255, 0.72); }
.editBtn:active, .ghostBtn:active { transform: scale(0.96); }

.accountCard { padding: 0; overflow: hidden; }
.accountRow {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 22rpx 22rpx;
  border-bottom: 1rpx solid rgba(16, 24, 40, 0.06);
  transition: background 160ms ease, transform 140ms ease;
}
.t-dark .accountRow { border-bottom-color: rgba(255, 255, 255, 0.06); }
.accountRow:last-child { border-bottom: none; }
.accountRow.tap:active { transform: scale(0.99); background: rgba(46, 99, 255, 0.05); }
.accountRow.danger.tap:active { background: rgba(229, 72, 77, 0.08); }
.accountLabel { font-size: 22rpx; font-weight: 640; color: rgba(16, 24, 40, 0.82); }
.t-dark .accountLabel { color: rgba(245, 247, 255, 0.82); }
.accountChev { font-size: 22rpx; color: rgba(16, 24, 40, 0.28); font-weight: 300; }
.t-dark .accountChev { color: rgba(245, 247, 255, 0.28); }
.dangerText { color: rgba(229, 72, 77, 0.96) !important; }
.t-dark .dangerText { color: rgba(255, 120, 120, 0.96) !important; }

.section { margin-top: 22rpx; }
.sectionHead { display: flex; align-items: center; justify-content: space-between; padding: 4rpx 4rpx 10rpx; }
.sectionLabel { font-size: 21rpx; color: rgba(16, 24, 40, 0.56); font-weight: 660; padding: 4rpx 4rpx 10rpx; display: block; }
.t-dark .sectionLabel { color: rgba(245, 247, 255, 0.6); }
.sectionLink { font-size: 21rpx; color: rgba(46, 99, 255, 0.95); font-weight: 660; }
.t-dark .sectionLink { color: rgba(170, 200, 255, 0.96); }

.card { padding: 22rpx; border-radius: 26rpx; background: rgba(255, 255, 255, 0.7); border: 1rpx solid rgba(16, 24, 40, 0.04); }
.t-dark .card { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.pad { padding: 22rpx 22rpx; }

.focusTop { display: flex; justify-content: space-between; gap: 12rpx; }
.focusStat { display: flex; flex-direction: column; gap: 4rpx; }
.focusNum { font-size: 26rpx; font-weight: 760; color: rgba(16, 24, 40, 0.92); letter-spacing: -0.3rpx; }
.t-dark .focusNum { color: #f5f7fa; }
.focusLabel { font-size: 18rpx; color: rgba(16, 24, 40, 0.48); }
.t-dark .focusLabel { color: rgba(245, 247, 255, 0.5); }

.chartHead { margin-top: 22rpx; padding-bottom: 8rpx; }
.chartLabel { font-size: 19rpx; color: rgba(16, 24, 40, 0.48); font-weight: 640; }
.t-dark .chartLabel { color: rgba(245, 247, 255, 0.5); }

.weekRow { display: flex; gap: 10rpx; align-items: flex-end; height: 120rpx; padding: 0 4rpx; }
.bar { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; height: 100%; }
.barTrack { width: 100%; flex: 1; border-radius: 10rpx; background: rgba(16, 24, 40, 0.05); display: flex; align-items: flex-end; overflow: hidden; }
.t-dark .barTrack { background: rgba(245, 247, 255, 0.06); }
.barFill { width: 100%; background: linear-gradient(180deg, rgba(120, 160, 255, 0.92), rgba(46, 99, 255, 0.92)); border-radius: 10rpx; transition: height 360ms cubic-bezier(0.2, 0.7, 0.1, 1); }
.barLabel { font-size: 16rpx; color: rgba(16, 24, 40, 0.42); }
.t-dark .barLabel { color: rgba(245, 247, 255, 0.42); }

.monthRow { display: flex; gap: 10rpx; align-items: flex-end; height: 120rpx; padding: 0 4rpx; }
.monthBar { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 6rpx; height: 100%; }
.monthFill { width: 100%; max-width: 32rpx; min-height: 8rpx; border-radius: 999rpx; background: linear-gradient(180deg, rgba(180, 140, 255, 0.92), rgba(120, 90, 220, 0.92)); transition: height 360ms cubic-bezier(0.2, 0.7, 0.1, 1); align-self: center; }
.monthLabel { font-size: 16rpx; color: rgba(16, 24, 40, 0.42); }
.t-dark .monthLabel { color: rgba(245, 247, 255, 0.42); }

.distRow { display: flex; flex-direction: column; gap: 10rpx; }
.distLine { display: flex; align-items: center; gap: 10rpx; }
.distName { width: 110rpx; font-size: 19rpx; color: rgba(16, 24, 40, 0.7); }
.t-dark .distName { color: rgba(245, 247, 255, 0.7); }
.distTrack { flex: 1; height: 14rpx; border-radius: 999rpx; background: rgba(16, 24, 40, 0.06); overflow: hidden; }
.t-dark .distTrack { background: rgba(245, 247, 255, 0.06); }
.distFill { height: 100%; border-radius: 999rpx; transition: width 360ms cubic-bezier(0.2, 0.7, 0.1, 1); }
.distVal { width: 56rpx; font-size: 18rpx; color: rgba(16, 24, 40, 0.55); text-align: right; }
.t-dark .distVal { color: rgba(245, 247, 255, 0.55); }

.visRow { margin-top: 22rpx; display: flex; align-items: center; justify-content: space-between; gap: 12rpx; padding-top: 16rpx; border-top: 1rpx solid rgba(16, 24, 40, 0.05); }
.t-dark .visRow { border-top-color: rgba(255, 255, 255, 0.06); }
.visLabel { font-size: 20rpx; color: rgba(16, 24, 40, 0.6); font-weight: 640; }
.t-dark .visLabel { color: rgba(245, 247, 255, 0.6); }
.vis { display: flex; gap: 8rpx; }
.visChip { padding: 8rpx 16rpx; border-radius: 999rpx; background: rgba(16, 24, 40, 0.05); border: 1rpx solid rgba(16, 24, 40, 0.06); }
.t-dark .visChip { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.visChip.on { background: rgba(46, 99, 255, 0.12); border-color: rgba(46, 99, 255, 0.24); }
.visText { font-size: 18rpx; font-weight: 660; color: rgba(16, 24, 40, 0.7); }
.t-dark .visText { color: rgba(245, 247, 255, 0.7); }
.visChip.on .visText { color: rgba(46, 99, 255, 0.96); font-weight: 720; }
.t-dark .visChip.on .visText { color: rgba(170, 200, 255, 0.96); }

.value { display: block; font-size: 22rpx; color: rgba(16, 24, 40, 0.82); line-height: 1.5; }
.t-dark .value { color: rgba(245, 247, 255, 0.86); }
.link { display: block; margin-top: 8rpx; font-size: 20rpx; color: rgba(46, 99, 255, 0.92); }
.t-dark .link { color: rgba(170, 200, 255, 0.95); }

.gap { height: 32rpx; }

.overlay { position: fixed; inset: 0; z-index: 60; opacity: 0; pointer-events: none; background: rgba(8, 12, 24, 0.4); backdrop-filter: blur(12px); transition: opacity 0.22s ease; }
.overlay.show { opacity: 1; pointer-events: auto; }
.sheet { position: absolute; left: 14rpx; right: 14rpx; bottom: 14rpx; padding: 24rpx 22rpx; border-radius: 32rpx; background: rgba(255, 255, 255, 0.92); border: 1rpx solid rgba(255, 255, 255, 0.6); max-height: 90vh; }
.t-dark .sheet { background: #1a1d21; border-color: rgba(255, 255, 255, 0.06); }
.sheetTitle { font-size: 26rpx; font-weight: 740; color: rgba(16, 24, 40, 0.92); }
.t-dark .sheetTitle { color: #f5f7fa; }
.sheetSub { display: block; margin-top: 6rpx; font-size: 20rpx; color: rgba(16, 24, 40, 0.5); }
.t-dark .sheetSub { color: rgba(245, 247, 255, 0.5); }

.lockField { margin-top: 16rpx; padding: 14rpx 16rpx; border-radius: 18rpx; background: rgba(16, 24, 40, 0.04); border: 1rpx dashed rgba(16, 24, 40, 0.12); }
.t-dark .lockField { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.12); }
.lockLabel { display: block; font-size: 18rpx; color: rgba(16, 24, 40, 0.5); }
.t-dark .lockLabel { color: rgba(245, 247, 255, 0.5); }
.lockValue { display: block; margin-top: 4rpx; font-size: 24rpx; font-weight: 720; color: rgba(16, 24, 40, 0.86); }
.t-dark .lockValue { color: rgba(245, 247, 255, 0.86); }

.field { margin-top: 14rpx; display: flex; flex-direction: column; gap: 8rpx; }
.fieldLabel { font-size: 19rpx; color: rgba(16, 24, 40, 0.55); font-weight: 640; }
.t-dark .fieldLabel { color: rgba(245, 247, 255, 0.55); }
.input { min-height: 80rpx; padding: 0 16rpx; border-radius: 18rpx; background: rgba(16, 24, 40, 0.04); border: 1rpx solid rgba(16, 24, 40, 0.08); color: rgba(16, 24, 40, 0.92); font-size: 23rpx; }
.t-dark .input { background: #23272d; border-color: rgba(255, 255, 255, 0.08); color: #f5f7fa; }
.area { min-height: 120rpx; padding-top: 14rpx; }
.picker { display: flex; align-items: center; justify-content: space-between; padding-right: 18rpx; }
.pickerText { font-size: 23rpx; font-weight: 660; color: rgba(16, 24, 40, 0.86); }
.t-dark .pickerText { color: rgba(245, 247, 255, 0.86); }
.chevText { font-size: 18rpx; color: rgba(16, 24, 40, 0.5); }
.t-dark .chevText { color: rgba(245, 247, 255, 0.5); }
.ph { color: rgba(16, 24, 40, 0.35); }
.t-dark .ph { color: rgba(245, 247, 255, 0.35); }

.saveBtn { margin-top: 18rpx; height: 84rpx; border-radius: 22rpx; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, #5a8eff, #2e63ff); box-shadow: 0 14rpx 36rpx rgba(46, 99, 255, 0.28); }
.saveText { color: #fff; font-size: 23rpx; font-weight: 720; }
</style>
