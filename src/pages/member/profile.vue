<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader title="Profile" nav-mode="back" :show-avatar="false" />
    <scroll-view class="scroll" scroll-y :show-scrollbar="false">
      <view class="card hero">
        <view class="avatar">{{ initials(member.name) }}</view>
        <text class="name">{{ member.name }}</text>
        <text class="mbti">{{ member.mbti }}</text>
        <text class="bio">{{ member.bio }}</text>
        <view class="editBtn" role="button" @tap="editOpen = true">Edit Profile</view>
      </view>
      <view class="card"><text class="sec">Interests</text><text class="value">{{ member.interests }}</text></view>
      <view class="card"><text class="sec">Social Links</text><text v-for="l in member.links" :key="l" class="link">{{ l }}</text></view>
      <view class="card"><text class="sec">Birthday Visibility</text><text class="value">{{ member.birthdayVisibility || 'Friends' }}</text></view>
      <view class="card"><text class="sec">Uploaded Notes</text><text class="value">Linear Algebra Midterm Notes · Physics Lab Template</text></view>
      <view class="card"><text class="sec">Recent Posts</text><text class="value">Best way to structure study sprints?</text></view>
      <view class="gap" />
    </scroll-view>
    <view class="overlay" :class="{ show: editOpen }" @tap="editOpen = false">
      <view class="sheet" @tap.stop>
        <text class="sheetTitle">Edit Profile</text>
        <input class="input" v-model="draft.avatar" placeholder="Avatar text" placeholder-class="ph" />
        <input class="input" v-model="draft.name" placeholder="Name" placeholder-class="ph" />
        <input class="input" v-model="draft.mbti" placeholder="MBTI" placeholder-class="ph" />
        <input class="input" v-model="draft.interests" placeholder="Interests" placeholder-class="ph" />
        <textarea class="input area" v-model="draft.bio" placeholder="Bio" placeholder-class="ph" />
        <input class="input" v-model="draft.links" placeholder="Social links (comma separated)" placeholder-class="ph" />
        <picker :range="visibilityOptions" @change="onVisibilityChange"><view class="input picker">{{ draft.birthdayVisibility }}</view></picker>
        <view class="saveBtn" role="button" @tap="saveProfile">Save</view>
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
import { useTheme } from '@/composables/useTheme'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { useUserStore } from '@/composables/useUserStore'

const { themeClass } = useTheme()
const { getMemberById } = useCommunityStore()
const { currentUser, updateProfile } = useUserStore()
const id = ref('m1')
const editOpen = ref(false)
const visibilityOptions = ['Private', 'Friends', 'Class']
const draft = ref({ avatar: '', name: '', mbti: '', interests: '', bio: '', links: '', birthdayVisibility: 'Friends' })
const member = computed(() => (id.value === currentUser.value.id ? currentUser.value : getMemberById(id.value)))
function initials(name) { return name.split(' ').map((x) => x[0]).join('').slice(0,2).toUpperCase() }
function back() { uni.navigateBack() }
function onVisibilityChange(e) { draft.value.birthdayVisibility = visibilityOptions[e.detail.value] }
function saveProfile() {
  updateProfile({
    avatar: draft.value.avatar,
    name: draft.value.name,
    mbti: draft.value.mbti,
    interests: draft.value.interests,
    bio: draft.value.bio,
    links: draft.value.links.split(',').map((x) => x.trim()).filter(Boolean),
    birthdayVisibility: draft.value.birthdayVisibility,
  })
  editOpen.value = false
}
watch(
  () => currentUser.value,
  (u) => {
    draft.value = {
      avatar: u.avatar || '',
      name: u.name,
      mbti: u.mbti,
      interests: u.interests,
      bio: u.bio,
      links: (u.links || []).join(', '),
      birthdayVisibility: u.birthdayVisibility || 'Friends',
    }
  },
  { immediate: true, deep: true }
)
onLoad((q) => { id.value = q?.id || 'm1' })
</script>

<style scoped>
.page{min-height:100vh;position:relative;overflow:hidden}.bg{position:absolute;inset:0;background:radial-gradient(1200rpx 800rpx at 40% 0%,rgba(40,110,255,.16),transparent 60%),linear-gradient(180deg,#f8faff,#f1f4fa)}.t-dark .bg{background:radial-gradient(1200rpx 800rpx at 40% 0%,rgba(60,120,255,.14),transparent 58%),linear-gradient(180deg,#111315,#0e1014)}
.scroll{position:relative;z-index:1;height:calc(100vh - 110rpx);padding:4rpx 28rpx 40rpx}.card{margin-top:12rpx;padding:20rpx;border-radius:26rpx;background:rgba(255,255,255,.74);border:1rpx solid rgba(255,255,255,.6);box-shadow:0 14rpx 44rpx rgba(12,20,40,.08);transition:background 220ms ease,border-color 220ms ease}.t-dark .card{background:#1a1d21;border-color:rgba(255,255,255,.06);box-shadow:0 18rpx 52rpx rgba(0,0,0,.36)}
.hero{padding-top:24rpx;display:flex;flex-direction:column;align-items:flex-start;gap:8rpx}.avatar{width:78rpx;height:78rpx;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(46,99,255,.14);color:rgba(46,99,255,.96);font-size:24rpx;font-weight:760}.t-dark .avatar{background:rgba(120,160,255,.16);color:rgba(170,200,255,.96)}.name{font-size:32rpx;font-weight:760;color:rgba(16,24,40,.92)}.t-dark .name{color:#f5f7fa}.mbti{font-size:20rpx;color:rgba(46,99,255,.92);font-weight:700}.t-dark .mbti{color:rgba(170,200,255,.95)}.bio{font-size:22rpx;color:rgba(16,24,40,.58);line-height:1.5}.t-dark .bio{color:rgba(245,247,255,.7)}
.sec{font-size:20rpx;color:rgba(16,24,40,.56);font-weight:640}.t-dark .sec{color:rgba(245,247,255,.58)}.value,.link{display:block;margin-top:8rpx;font-size:22rpx;color:rgba(16,24,40,.86)}.t-dark .value{color:rgba(245,247,255,.86)}.link{color:rgba(46,99,255,.92)}.t-dark .link{color:rgba(170,200,255,.95)}.gap{height:24rpx}
.editBtn{margin-top:12rpx;height:64rpx;padding:0 16rpx;border-radius:16rpx;background:rgba(46,99,255,.14);color:rgba(46,99,255,.96);display:flex;align-items:center;font-size:21rpx;font-weight:700}.t-dark .editBtn{background:rgba(120,160,255,.16);color:rgba(170,200,255,.96)}
.overlay{position:fixed;inset:0;z-index:40;opacity:0;pointer-events:none;background:rgba(8,12,24,.32);backdrop-filter:blur(12px);transition:opacity .22s ease}.overlay.show{opacity:1;pointer-events:auto}
.sheet{position:absolute;left:14rpx;right:14rpx;bottom:14rpx;padding:18rpx;border-radius:28rpx;background:rgba(255,255,255,.86);border:1rpx solid rgba(255,255,255,.6);box-shadow:0 30rpx 90rpx rgba(8,12,24,.22);max-height:86vh}.t-dark .sheet{background:#1a1d21;border-color:rgba(255,255,255,.08);box-shadow:0 36rpx 100rpx rgba(0,0,0,.55)}
.sheetTitle{font-size:24rpx;font-weight:740;color:rgba(16,24,40,.92)}.t-dark .sheetTitle{color:#f5f7fa}.input{height:74rpx;margin-top:10rpx;padding:0 14rpx;border-radius:16rpx;background:rgba(16,24,40,.04);border:1rpx solid rgba(16,24,40,.06);color:rgba(16,24,40,.92)}.t-dark .input{background:#23272d;border-color:rgba(255,255,255,.06);color:#f5f7fa}.area{height:120rpx;padding-top:12rpx}.picker{display:flex;align-items:center}.ph{color:rgba(16,24,40,.35)}.t-dark .ph{color:rgba(245,247,255,.32)}.saveBtn{margin-top:12rpx;height:74rpx;border-radius:18rpx;background:linear-gradient(180deg,#5a8eff,#2e63ff);display:flex;align-items:center;justify-content:center;color:#fff;box-shadow:0 14rpx 36rpx rgba(46,99,255,.28)}
</style>
