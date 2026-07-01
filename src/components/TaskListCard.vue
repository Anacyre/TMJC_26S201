<template>
  <view class="taskCardWrap" :class="{ stepsExpanded: expanded && hasSteps }">
    <view
      class="card task"
      :class="[{ pressed, overdue: isOverdue, completing, completingFade, expanded }, 'st-' + task.status]"
      @touchstart="$emit('press-start')"
      @touchend="$emit('press-end')"
      @touchcancel="$emit('press-end')"
    >
      <view class="left">
        <view
          class="check tap"
          data-swipe-ignore
          :class="{ on: task.done || completing }"
          role="button"
          @tap.stop="$emit('toggle')"
          @touchstart.stop
          @touchend.stop
        >
          <view class="checkDot" />
        </view>
      </view>
      <view class="main">
        <view class="row1 tap" role="button" @tap.stop="$emit('open')">
          <text class="title" :class="{ done: task.done, completing }" :number-of-lines="1">{{ task.title }}</text>
          <view class="metaChip task-chip" :class="metaChipClass">
            <text class="task-chip-text">{{ metaChipLabel }}</text>
          </view>
        </view>
        <view class="row2">
          <view class="row2Tags tap" role="button" @tap.stop="$emit('open')">
            <view class="task-chip" :class="subjectChipClass(task.subject)">
              <text class="task-chip-text">{{ task.subject }}</text>
            </view>
            <view class="task-chip" :class="'state-' + statusBucket">
              <text class="task-chip-text">{{ displayStatus }}</text>
            </view>
          </view>
          <view
            v-if="hasSteps"
            class="expandBtn tap"
            data-swipe-ignore
            :class="{ open: expanded }"
            role="button"
            @tap.stop="onExpandTap"
            @touchstart.stop
            @touchend.stop
          >
            <text class="expandChev">›</text>
          </view>
        </view>
        <StepProgressBar v-if="hasSteps" class="stepProgressRow" :checklist="task.checklist" compact />
      </view>
    </view>

    <view v-if="hasSteps" class="stepsPanel" :class="{ open: expanded }">
      <view class="stepsInner">
        <view
          v-for="(step, idx) in task.checklist"
          :key="step.id || idx"
          class="stepRow tap"
          data-swipe-ignore
          role="button"
          @tap.stop="onStepTap(step)"
          @touchstart.stop
          @touchend.stop
        >
          <view class="stepCheck" :class="{ on: step.done }">
            <view class="stepCheckDot" />
          </view>
          <view class="stepBody">
            <text class="stepText" :class="{ done: step.done }">{{ step.text || `Step ${idx + 1}` }}</text>
            <text v-if="stepDueLabels[idx]" class="stepDue">{{ stepDueLabels[idx] }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import StepProgressBar from '@/components/StepProgressBar.vue'
import { subjectChipClass } from '@/lib/subjectChip'
import {
  taskDisplayStatus,
  taskBucketLabel,
  taskIsOverdue,
  formatTaskDueChipLabel,
  taskDueChipClass,
  parseChecklistItemDeadline,
} from '@/lib/taskDueDate'

const props = defineProps({
  task: { type: Object, required: true },
  pressed: { type: Boolean, default: false },
  sortMode: { type: String, default: 'due-date' },
  completing: { type: Boolean, default: false },
  completingFade: { type: Boolean, default: false },
  expanded: { type: Boolean, default: false },
})

const emit = defineEmits(['open', 'toggle', 'press-start', 'press-end', 'toggle-step', 'expand-change'])

const hasSteps = computed(() => {
  const list = props.task?.checklist
  return Array.isArray(list) && list.length > 0
})

const showDueDate = computed(() => props.sortMode === 'priority')
const metaChipLabel = computed(() =>
  showDueDate.value ? formatTaskDueChipLabel(props.task) : props.task.priority
)
const metaChipClass = computed(() => {
  if (showDueDate.value) return taskDueChipClass(props.task)
  return `prio prio-${String(props.task.priority || 'P3').toLowerCase()}`
})

const statusBucket = computed(() => taskDisplayStatus(props.task))
const displayStatus = computed(() => taskBucketLabel(statusBucket.value))
const isOverdue = computed(() => taskIsOverdue(props.task))

function onExpandTap() {
  emit('expand-change', !props.expanded)
}

function onStepTap(step) {
  emit('toggle-step', step.id)
}

const stepDueLabels = computed(() => {
  const list = props.task?.checklist || []
  return list.map((step) => {
    const key = parseChecklistItemDeadline(step)
    return key ? formatTaskDueChipLabel({ deadline: key }) : ''
  })
})
</script>

<style scoped>
.taskCardWrap { width: 100%; }

.card {
  width: 100%;
  border-radius: var(--list-card-radius);
  background: rgba(255, 255, 255, 0.7);
  border: 1rpx solid rgba(16, 24, 40, 0.04);
  transition: transform 180ms ease, background 220ms ease, border-color 220ms ease, opacity 500ms ease, border-radius 280ms ease;
  display: flex;
  gap: var(--list-card-gap);
  padding: var(--list-card-pad-y) var(--list-card-pad-x);
  align-items: flex-start;
}
.card.expanded {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border-bottom-color: transparent;
}
.card.completing .title {
  opacity: 0.52;
  text-decoration: line-through;
  text-decoration-thickness: 2rpx;
  transition:
    opacity var(--task-complete-strike-ms, 210ms) cubic-bezier(0.4, 0, 0.2, 1),
    text-decoration-color var(--task-complete-strike-ms, 210ms) ease;
}
.card.completingFade {
  opacity: 0;
  transform: scale(0.985) translateY(-4rpx);
  transition:
    opacity var(--task-complete-fade-ms, 80ms) cubic-bezier(0.4, 0, 0.2, 1),
    transform var(--task-complete-fade-ms, 80ms) cubic-bezier(0.4, 0, 0.2, 1);
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

.left { padding-top: 4rpx; flex-shrink: 0; }
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

.main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.row1 { display: flex; align-items: center; justify-content: space-between; gap: 12rpx; min-width: 0; }
.title {
  flex: 1;
  min-width: 0;
  font-size: var(--list-title-size);
  font-weight: 720;
  color: rgba(16, 24, 40, 0.92);
  transition: opacity 500ms ease, color 500ms ease;
}
.t-dark .title { color: rgba(245, 247, 255, 0.92); }
.card.overdue .title { color: rgba(130, 28, 24, 0.92); }
.t-dark .card.overdue .title { color: rgba(255, 210, 206, 0.92); }
.title.done {
  opacity: 0.48;
  text-decoration: line-through;
  text-decoration-thickness: 2rpx;
}

.expandBtn {
  width: 48rpx;
  height: 48rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16, 24, 40, 0.05);
  border: 1rpx solid rgba(16, 24, 40, 0.06);
  flex-shrink: 0;
  margin-left: 8rpx;
  position: relative;
  z-index: 2;
  transition: transform 280ms cubic-bezier(0.4, 0, 0.2, 1), background 200ms ease;
}
.t-dark .expandBtn {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}
.expandBtn.open { background: rgba(46, 99, 255, 0.1); border-color: rgba(46, 99, 255, 0.2); }
.expandBtn:active { transform: scale(0.94); }
.expandChev {
  font-size: 30rpx;
  line-height: 1;
  color: rgba(16, 24, 40, 0.48);
  transform: rotate(90deg);
  transition: transform 280ms cubic-bezier(0.4, 0, 0.2, 1), color 200ms ease;
  pointer-events: none;
}
.t-dark .expandChev { color: rgba(245, 247, 255, 0.48); }
.expandBtn.open .expandChev {
  transform: rotate(-90deg);
  color: rgba(46, 99, 255, 0.88);
}

.row2 {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8rpx;
  min-width: 0;
}
.row2Tags {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10rpx;
  flex-wrap: wrap;
}

.stepProgressRow {
  margin-top: 2rpx;
  padding-right: 56rpx;
}

.stepsPanel {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition:
    max-height 320ms cubic-bezier(0.4, 0, 0.2, 1),
    opacity 260ms ease;
}
.stepsPanel.open {
  max-height: 1200rpx;
  opacity: 1;
}
.stepsInner {
  padding: 8rpx 16rpx 14rpx calc(var(--list-card-pad-x, 24rpx) + var(--list-check-size, 44rpx) + var(--list-card-gap, 16rpx));
  border: 1rpx solid rgba(16, 24, 40, 0.04);
  border-top: none;
  border-radius: 0 0 var(--list-card-radius) var(--list-card-radius);
  background: rgba(255, 255, 255, 0.55);
}
.t-dark .stepsInner {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.06);
}
.taskCardWrap.stepsExpanded .card.overdue + .stepsPanel .stepsInner {
  background: rgba(255, 59, 48, 0.04);
  border-color: rgba(255, 59, 48, 0.12);
}

.stepRow {
  display: flex;
  align-items: flex-start;
  gap: 12rpx;
  padding: 10rpx 0;
  border-bottom: 1rpx solid rgba(16, 24, 40, 0.05);
}
.stepRow:last-child { border-bottom: none; }
.t-dark .stepRow { border-bottom-color: rgba(255, 255, 255, 0.05); }

.stepCheck {
  width: 36rpx;
  height: 36rpx;
  margin-top: 2rpx;
  border-radius: 10rpx;
  background: rgba(16, 24, 40, 0.06);
  border: 1rpx solid rgba(16, 24, 40, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 200ms ease, border-color 200ms ease;
}
.t-dark .stepCheck {
  background: rgba(245, 247, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.08);
}
.stepCheck.on { background: rgba(46, 99, 255, 0.14); border-color: rgba(46, 99, 255, 0.22); }
.stepCheckDot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  background: rgba(16, 24, 40, 0.16);
  transition: background 200ms ease, transform 200ms ease;
}
.stepCheck.on .stepCheckDot { background: rgba(46, 99, 255, 0.94); transform: scale(1.05); }

.stepBody { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2rpx; }
.stepText {
  font-size: 24rpx;
  font-weight: 640;
  color: rgba(16, 24, 40, 0.86);
  line-height: 1.35;
}
.t-dark .stepText { color: rgba(245, 247, 255, 0.86); }
.stepText.done {
  opacity: 0.48;
  text-decoration: line-through;
}
.stepDue {
  font-size: 20rpx;
  font-weight: 660;
  color: rgba(46, 99, 255, 0.78);
}
.t-dark .stepDue { color: rgba(170, 200, 255, 0.78); }
</style>
