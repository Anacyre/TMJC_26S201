<template>
  <view
    class="card task tap"
    :class="[{ pressed, overdue: isOverdue }, 'st-' + task.status]"
    @touchstart="$emit('press-start')"
    @touchend="$emit('press-end')"
    @touchcancel="$emit('press-end')"
    @tap="$emit('open')"
  >
    <view class="left">
      <view class="check" :class="{ on: task.done }" role="button" @tap.stop="$emit('toggle')">
        <view class="checkDot" />
      </view>
    </view>
    <view class="main">
      <view class="row1">
        <text class="title" :class="{ done: task.done }" :number-of-lines="1">{{ task.title }}</text>
        <view class="prio task-chip" :class="'prio-' + task.priority.toLowerCase()">
          <text class="task-chip-text">{{ task.priority }}</text>
        </view>
      </view>
      <view class="row2">
        <view class="task-chip" :class="subjectChipClass(task.subject)">
          <text class="task-chip-text">{{ task.subject }}</text>
        </view>
        <view class="task-chip" :class="'state-' + statusBucket">
          <text class="task-chip-text">{{ displayStatus }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import { subjectChipClass } from '@/lib/subjectChip'
import { taskDisplayStatus, taskBucketLabel, taskIsOverdue } from '@/lib/taskDueDate'

const props = defineProps({
  task: { type: Object, required: true },
  pressed: { type: Boolean, default: false },
})

defineEmits(['open', 'toggle', 'press-start', 'press-end'])

const statusBucket = computed(() => taskDisplayStatus(props.task))
const displayStatus = computed(() => taskBucketLabel(statusBucket.value))
const isOverdue = computed(() => taskIsOverdue(props.task))
</script>

<style scoped>
.card {
  width: 100%;
  border-radius: var(--list-card-radius);
  background: rgba(255, 255, 255, 0.7);
  border: 1rpx solid rgba(16, 24, 40, 0.04);
  transition: transform 180ms ease, background 220ms ease, border-color 220ms ease;
}
.t-dark .card {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.06);
}
.card.overdue {
  background: rgba(255, 59, 48, 0.055);
  border-color: rgba(255, 59, 48, 0.14);
  box-shadow: inset 3rpx 0 0 rgba(255, 59, 48, 0.42);
}
.t-dark .card.overdue {
  background: rgba(255, 88, 78, 0.07);
  border-color: rgba(255, 110, 100, 0.16);
  box-shadow: inset 3rpx 0 0 rgba(255, 120, 110, 0.38);
}
.tap:active { transform: scale(0.985); }
.pressed { transform: scale(0.985); }

.task { display: flex; gap: var(--list-card-gap); padding: var(--list-card-pad-y) var(--list-card-pad-x); align-items: center; }
.left { padding-top: 0; }
.check {
  width: var(--list-check-size);
  height: var(--list-check-size);
  border-radius: var(--list-check-radius);
  background: rgba(16, 24, 40, 0.06);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 180ms ease, background 220ms ease, border-color 220ms ease;
}
.t-dark .check {
  background: rgba(245, 247, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}
.card.overdue .check {
  background: rgba(255, 59, 48, 0.08);
  border-color: rgba(255, 59, 48, 0.16);
}
.t-dark .card.overdue .check {
  background: rgba(255, 88, 78, 0.1);
  border-color: rgba(255, 110, 100, 0.18);
}
.check:active { transform: scale(0.96); }
.checkDot {
  width: var(--list-check-dot);
  height: var(--list-check-dot);
  border-radius: 50%;
  background: rgba(16, 24, 40, 0.16);
  transition: transform 220ms ease, background 220ms ease;
}
.check.on { background: rgba(46, 99, 255, 0.14); border-color: rgba(46, 99, 255, 0.22); }
.check.on .checkDot { background: rgba(46, 99, 255, 0.94); transform: scale(1.05); }
.card.overdue .check.on {
  background: rgba(255, 59, 48, 0.14);
  border-color: rgba(255, 59, 48, 0.24);
}
.card.overdue .check.on .checkDot { background: rgba(255, 59, 48, 0.92); }
.t-dark .card.overdue .check.on {
  background: rgba(255, 88, 78, 0.16);
  border-color: rgba(255, 110, 100, 0.26);
}
.t-dark .card.overdue .check.on .checkDot { background: rgba(255, 130, 120, 0.94); }

.main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6rpx; }
.row1 { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; }
.title { font-size: var(--list-title-size); font-weight: 720; color: rgba(16, 24, 40, 0.92); }
.t-dark .title { color: rgba(245, 247, 255, 0.92); }
.card.overdue .title { color: rgba(130, 28, 24, 0.92); }
.t-dark .card.overdue .title { color: rgba(255, 210, 206, 0.92); }
.title.done { opacity: 0.5; text-decoration: line-through; }

.row2 { display: flex; align-items: center; gap: 10rpx; flex-wrap: wrap; }
</style>
