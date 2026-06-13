<template>
  <view class="page" :class="themeClass">
    <view class="bg" />
    <AppHeader nav-mode="back" />

    <PageContent>
      <scroll-view class="scroll" scroll-y :show-scrollbar="false" :enhanced="true">
        <view class="safe">
          <view class="sectionHead">
            <text class="sectionLabel">Members</text>
            <text class="sectionCount">{{ visibleMembers.length }}</text>
          </view>

          <view v-if="!visibleMembers.length" class="emptyWrap">
            <EmptyState variant="members" title="No members" />
          </view>

          <view v-else class="grid">
            <view
              v-for="m in visibleMembers"
              :key="m.id"
              class="mCard tap"
              data-reveal-card
              role="button"
              @tap="openMember(m.id)"
            >
              <view class="mAvatar">{{ initials(m.name) }}</view>
              <text class="mName">{{ m.name }}</text>
            </view>
          </view>
        </view>
        <view class="gap" />
      </scroll-view>
    </PageContent>

    <GlobalSearchOverlay />
  </view>
</template>

<script setup>
import AppHeader from '@/components/AppHeader.vue'
import PageContent from '@/components/PageContent.vue'
import GlobalSearchOverlay from '@/components/GlobalSearchOverlay.vue'
import EmptyState from '@/components/EmptyState.vue'
import { useTheme } from '@/composables/useTheme'
import { useMemberStore } from '@/composables/useMemberStore'
import { navSibling } from '@/lib/navigation'

const { themeClass } = useTheme()
const { visibleMembers } = useMemberStore()

function initials(name) {
  return String(name || '?').split(' ').map((x) => x[0]).join('').slice(0, 2).toUpperCase()
}

function openMember(id) {
  navSibling(`/pages/member/profile?id=${id}`)
}
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
.sectionHead { display: flex; align-items: center; justify-content: space-between; padding: 0 4rpx 16rpx; }
.sectionLabel { font-size: 22rpx; font-weight: 700; color: rgba(16, 24, 40, 0.58); }
.t-dark .sectionLabel { color: rgba(245, 247, 255, 0.52); }
.sectionCount { font-size: 20rpx; font-weight: 700; color: rgba(16, 24, 40, 0.38); }

.grid { display: grid; grid-template-columns: 1fr 1fr; gap: var(--list-stack-gap); }
.mCard {
  padding: var(--list-card-pad-y) var(--list-card-pad-x); border-radius: var(--list-card-radius);
  background: rgba(255, 255, 255, 0.7); border: 1rpx solid rgba(16, 24, 40, 0.04);
  display: flex; flex-direction: column; align-items: center; gap: 6rpx; text-align: center;
}
.t-dark .mCard { background: rgba(255, 255, 255, 0.04); border-color: rgba(255, 255, 255, 0.06); }
.mCard:active { transform: scale(0.985); }
.mAvatar {
  width: var(--list-avatar-size); height: var(--list-avatar-size); border-radius: 50%;
  background: rgba(46, 99, 255, 0.14); display: flex; align-items: center; justify-content: center;
  color: rgba(46, 99, 255, 0.96); font-size: var(--list-meta-size); font-weight: 760;
}
.mName { font-size: var(--list-meta-size); font-weight: 720; color: rgba(16, 24, 40, 0.88); }
.t-dark .mName { color: rgba(245, 247, 255, 0.88); }
.emptyWrap { padding: 48rpx 12rpx; }
.gap { height: 24rpx; }
</style>
