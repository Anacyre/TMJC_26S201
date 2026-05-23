<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader title="Members" nav-mode="back" :show-avatar="false" />

    <view v-if="!isAdmin" class="lock">
      <EmptyState
        variant="members"
        title="Admins only"
        subtitle="Member management is restricted to class admins."
      />
    </view>

    <view v-else class="safe">
      <view class="filters">
        <view class="seg" :class="{ on: tab === 'members' }" role="button" @tap="tab = 'members'"><text>Members</text></view>
        <view class="seg" :class="{ on: tab === 'admins' }" role="button" @tap="tab = 'admins'"><text>Admins</text></view>
        <view class="seg" :class="{ on: tab === 'test' }" role="button" @tap="tab = 'test'"><text>Test</text></view>
      </view>

      <scroll-view class="list" scroll-y :show-scrollbar="false">
        <view v-if="!filtered.length" class="emptyWrap">
          <EmptyState variant="members" title="No accounts here yet" subtitle="Add a member to fill this list." />
        </view>
        <view v-for="m in filtered" :key="m.id" class="row">
          <view class="left">
            <view class="ava">{{ initials(m.name) }}</view>
            <view class="meta">
              <view class="nameLine">
                <text class="name" :number-of-lines="1">{{ m.name }}</text>
                <view v-if="m.role === 'admin'" class="badge admin"><text class="badgeText">ADMIN</text></view>
                <view v-if="isTestAccount(m.name)" class="badge test"><text class="badgeText">TEST</text></view>
              </view>
              <text class="email" :number-of-lines="1">{{ m.email || '—' }}</text>
            </view>
          </view>
          <view class="acts">
            <view
              v-if="m.role !== 'admin'"
              class="actBtn"
              role="button"
              @tap="promote(m)"
            >
              <text class="actText">Make admin</text>
            </view>
            <view
              v-else-if="m.id === currentUser.id"
              class="actBtn ghost"
              role="button"
              @tap="stepDown"
            ><text class="actText">Step down</text></view>
            <view v-else class="actBtn locked"><text class="actText">Locked</text></view>
          </view>
        </view>
        <view class="gap" />
      </scroll-view>

      <view class="addBar">
        <view class="addBtn" role="button" @tap="openAdd">
          <view class="plus"><view /><view /></view>
          <text class="addText">Add member</text>
        </view>
      </view>
    </view>

    <view class="overlay" :class="{ show: addOpen }" @tap="addOpen = false">
      <view class="sheet" @tap.stop>
        <text class="sheetTitle">Add member</text>
        <text class="sheetSub">Set their fixed account name (used in the database).</text>
        <view class="field">
          <text class="fieldLabel">Fixed account name</text>
          <input class="input" v-model="draft.name" placeholder="e.g. Jordan Lee" placeholder-class="ph" />
        </view>
        <view class="field">
          <text class="fieldLabel">Email</text>
          <input class="input" v-model="draft.email" placeholder="jordan@students.edu.sg" placeholder-class="ph" />
        </view>
        <view class="field">
          <text class="fieldLabel">Role</text>
          <view class="segRole">
            <view class="segItem" :class="{ on: draft.role === 'member' }" role="button" @tap="draft.role = 'member'"><text>Member</text></view>
            <view class="segItem" :class="{ on: draft.role === 'admin' }" role="button" @tap="draft.role = 'admin'"><text>Admin</text></view>
          </view>
        </view>
        <view class="commit" role="button" @tap="commitAdd">
          <text class="commitText">Create account</text>
        </view>
      </view>
    </view>

    <BottomNav active="community" />
    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import { computed, ref } from 'vue'
import AppHeader from '@/components/AppHeader.vue'
import BottomNav from '@/components/BottomNav.vue'
import EmptyState from '@/components/EmptyState.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import { useTheme } from '@/composables/useTheme'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { useUserStore } from '@/composables/useUserStore'
import { adminAddMember, adminSetRole } from '@/lib/mockBackend'
import { toast } from '@/composables/useToast'

const { themeClass } = useTheme()
const { members, fetchMembers } = useCommunityStore()
const { currentUser } = useUserStore()
const isAdmin = computed(() => currentUser.value.role === 'admin')
const tab = ref('members')
const addOpen = ref(false)
const draft = ref({ name: '', email: '', role: 'member' })

function isTestAccount(name) {
  return String(name || '').trim().toLowerCase().startsWith('test')
}

const all = computed(() => members.value || [])

const filtered = computed(() => {
  if (tab.value === 'admins') return all.value.filter((m) => m.role === 'admin')
  if (tab.value === 'test') return all.value.filter((m) => isTestAccount(m.name))
  return all.value.filter((m) => !isTestAccount(m.name) && m.role !== 'admin')
})

function initials(name) {
  return String(name || '?').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()
}

function openAdd() {
  draft.value = { name: '', email: '', role: 'member' }
  addOpen.value = true
}

async function commitAdd() {
  if (!draft.value.name.trim()) {
    toast.show('Name required')
    return
  }
  await adminAddMember({
    name: draft.value.name.trim(),
    email: (draft.value.email || '').trim(),
    role: draft.value.role,
  })
  await fetchMembers()
  addOpen.value = false
  toast.show('Created · pwd 123456')
}

async function promote(m) {
  await adminSetRole(m.id, 'admin')
  await fetchMembers()
  toast.updated()
}

async function stepDown() {
  await adminSetRole(currentUser.value.id, 'member')
  currentUser.value.role = 'member'
  await fetchMembers()
  toast.updated()
}
</script>

<style scoped>
.page { min-height: 100vh; position: relative; overflow: hidden; }
.bg { position: absolute; inset: 0; background: radial-gradient(1000rpx 700rpx at 50% 0%, rgba(40, 110, 255, 0.14), transparent 60%), linear-gradient(180deg, #f8faff, #f1f4fa); }
.t-dark .bg { background: radial-gradient(1000rpx 700rpx at 50% 0%, rgba(60, 120, 255, 0.14), transparent 58%), linear-gradient(180deg, #111315, #0e1014); }

.safe { position: relative; z-index: 1; padding: 6rpx 28rpx 200rpx; display: flex; flex-direction: column; gap: 16rpx; min-height: calc(100vh - 110rpx); }
.lock { position: relative; z-index: 1; padding: 60rpx 28rpx; }

.filters { display: flex; gap: 8rpx; padding: 6rpx; border-radius: 22rpx; background: rgba(255, 255, 255, 0.62); border: 1rpx solid rgba(16, 24, 40, 0.06); }
.t-dark .filters { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.seg { flex: 1; height: 62rpx; display: flex; align-items: center; justify-content: center; font-size: 22rpx; color: rgba(16, 24, 40, 0.65); border-radius: 18rpx; transition: background 220ms ease, color 220ms ease; }
.t-dark .seg { color: rgba(245, 247, 255, 0.7); }
.seg.on { background: rgba(46, 99, 255, 0.14); color: rgba(46, 99, 255, 0.96); }
.t-dark .seg.on { background: rgba(120, 160, 255, 0.16); color: rgba(170, 200, 255, 0.96); }

.list { flex: 1; }
.emptyWrap { padding-top: 32rpx; }
.row { display: flex; align-items: center; gap: 14rpx; margin-top: 12rpx; padding: 16rpx 14rpx; border-radius: 22rpx; background: rgba(255, 255, 255, 0.7); border: 1rpx solid rgba(16, 24, 40, 0.06); }
.t-dark .row { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.left { display: flex; align-items: center; gap: 12rpx; flex: 1; min-width: 0; }
.ava { width: 56rpx; height: 56rpx; border-radius: 50%; background: rgba(46, 99, 255, 0.14); color: rgba(46, 99, 255, 0.96); font-size: 21rpx; font-weight: 760; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.t-dark .ava { background: rgba(120, 160, 255, 0.16); color: rgba(170, 200, 255, 0.96); }
.meta { display: flex; flex-direction: column; gap: 2rpx; min-width: 0; }
.nameLine { display: flex; align-items: center; gap: 8rpx; min-width: 0; }
.name { font-size: 23rpx; font-weight: 720; color: rgba(16, 24, 40, 0.92); max-width: 200rpx; }
.t-dark .name { color: #f5f7fa; }
.email { font-size: 18rpx; color: rgba(16, 24, 40, 0.5); }
.t-dark .email { color: #9aa4b2; }
.badge { padding: 4rpx 8rpx; border-radius: 999rpx; }
.badge.admin { background: rgba(46, 99, 255, 0.14); border: 1rpx solid rgba(46, 99, 255, 0.22); }
.badge.test { background: rgba(220, 80, 110, 0.10); border: 1rpx solid rgba(220, 80, 110, 0.22); }
.badgeText { font-size: 14rpx; font-weight: 820; letter-spacing: 0.6rpx; color: rgba(46, 99, 255, 0.96); }
.badge.test .badgeText { color: rgba(220, 80, 110, 0.96); }

.acts { display: flex; gap: 6rpx; }
.actBtn { padding: 10rpx 14rpx; border-radius: 14rpx; background: rgba(46, 99, 255, 0.12); border: 1rpx solid rgba(46, 99, 255, 0.22); transition: transform 180ms ease; }
.actBtn:active { transform: scale(0.96); }
.actBtn.ghost { background: rgba(16, 24, 40, 0.06); border-color: rgba(16, 24, 40, 0.08); }
.t-dark .actBtn.ghost { background: rgba(255, 255, 255, 0.06); border-color: rgba(255, 255, 255, 0.08); }
.actBtn.locked { background: transparent; border-color: rgba(16, 24, 40, 0.06); }
.t-dark .actBtn.locked { border-color: rgba(255, 255, 255, 0.06); }
.actText { font-size: 18rpx; font-weight: 700; color: rgba(46, 99, 255, 0.96); }
.actBtn.ghost .actText, .actBtn.locked .actText { color: rgba(16, 24, 40, 0.62); }
.t-dark .actBtn.ghost .actText, .t-dark .actBtn.locked .actText { color: rgba(245, 247, 255, 0.6); }

.addBar { position: fixed; left: 28rpx; right: 28rpx; bottom: calc(160rpx + env(safe-area-inset-bottom)); display: flex; justify-content: flex-end; pointer-events: none; }
.addBtn { pointer-events: auto; display: flex; align-items: center; gap: 10rpx; height: 76rpx; padding: 0 22rpx 0 18rpx; border-radius: 999rpx; background: linear-gradient(180deg, #5a8eff, #2e63ff); box-shadow: 0 22rpx 60rpx rgba(46, 99, 255, 0.32); }
.plus { position: relative; width: 22rpx; height: 22rpx; }
.plus view { position: absolute; background: #fff; border-radius: 999rpx; }
.plus view:first-child { left: 0; right: 0; top: 50%; height: 2.4rpx; margin-top: -1.2rpx; }
.plus view:last-child { top: 0; bottom: 0; left: 50%; width: 2.4rpx; margin-left: -1.2rpx; }
.addText { font-size: 22rpx; color: #fff; font-weight: 720; }

.gap { height: 32rpx; }

.overlay { position: fixed; inset: 0; z-index: 70; background: rgba(8, 12, 24, 0.4); backdrop-filter: blur(12px); opacity: 0; pointer-events: none; transition: opacity 0.22s ease; }
.overlay.show { opacity: 1; pointer-events: auto; }
.sheet { position: absolute; left: 24rpx; right: 24rpx; bottom: 24rpx; padding: 26rpx 22rpx 22rpx; border-radius: 30rpx; background: rgba(255, 255, 255, 0.92); border: 1rpx solid rgba(255, 255, 255, 0.6); }
.t-dark .sheet { background: #1a1d21; border-color: rgba(255, 255, 255, 0.06); }
.sheetTitle { font-size: 26rpx; font-weight: 740; color: rgba(16, 24, 40, 0.92); }
.t-dark .sheetTitle { color: #f5f7fa; }
.sheetSub { display: block; margin-top: 6rpx; font-size: 20rpx; color: rgba(16, 24, 40, 0.5); }
.t-dark .sheetSub { color: rgba(245, 247, 255, 0.5); }

.field { margin-top: 16rpx; display: flex; flex-direction: column; gap: 8rpx; }
.fieldLabel { font-size: 19rpx; color: rgba(16, 24, 40, 0.55); font-weight: 640; }
.t-dark .fieldLabel { color: rgba(245, 247, 255, 0.55); }
.input { height: 78rpx; padding: 0 16rpx; border-radius: 18rpx; background: rgba(16, 24, 40, 0.04); border: 1rpx solid rgba(16, 24, 40, 0.08); font-size: 23rpx; color: rgba(16, 24, 40, 0.92); }
.t-dark .input { background: #23272d; border-color: rgba(255, 255, 255, 0.08); color: #f5f7fa; }
.ph { color: rgba(16, 24, 40, 0.35); }
.t-dark .ph { color: rgba(245, 247, 255, 0.35); }
.segRole { display: flex; gap: 8rpx; padding: 4rpx; border-radius: 18rpx; background: rgba(16, 24, 40, 0.04); }
.t-dark .segRole { background: rgba(255, 255, 255, 0.04); }
.segItem { flex: 1; height: 64rpx; border-radius: 14rpx; display: flex; align-items: center; justify-content: center; font-size: 21rpx; color: rgba(16, 24, 40, 0.7); }
.t-dark .segItem { color: rgba(245, 247, 255, 0.7); }
.segItem.on { background: rgba(46, 99, 255, 0.14); color: rgba(46, 99, 255, 0.96); font-weight: 720; }
.t-dark .segItem.on { background: rgba(120, 160, 255, 0.16); color: rgba(170, 200, 255, 0.96); }

.commit { margin-top: 20rpx; height: 84rpx; border-radius: 22rpx; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg, #5a8eff, #2e63ff); box-shadow: 0 18rpx 50rpx rgba(46, 99, 255, 0.28); }
.commitText { color: #fff; font-size: 23rpx; font-weight: 720; }
</style>
