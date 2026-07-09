<template>
  <view class="taskEditorRoot">
  <view class="overlay" :class="[themeClass, { show: modelValue }]" @tap="emit('update:modelValue', false)">
    <view class="sheet" @tap.stop>
      <view class="grabber" />
      <view class="head">
        <text class="title">{{ mode === 'create' ? 'Task' : 'Edit' }}</text>
      </view>

      <scroll-view class="body" scroll-y :show-scrollbar="false">
        <view class="field">
          <input class="input" v-model="form.title" placeholder="Title" placeholder-class="placeholder" />
        </view>

        <view class="field collapsible">
          <view class="collapseHead tap notesHead" role="button" @tap="toggleDesc">
            <text class="collapseLabel">{{ descExpanded ? 'Notes' : 'Add notes' }}</text>
            <text class="collapseChev" :class="{ open: descExpanded }">›</text>
          </view>
          <view class="collapseBody" :class="{ open: descExpanded }">
            <textarea
              class="input area"
              v-model="form.description"
              :maxlength="TEXT_AREA_MAX_LENGTH"
              auto-height
              placeholder="Optional"
              placeholder-class="placeholder"
            />
          </view>
        </view>

        <view class="field metaGrid">
          <view class="metaRow">
            <view class="metaItem">
              <TagSelect
                v-model="form.subject"
                :options="subjectOptions"
                :allow-create="true"
                :can-create="true"
                kind="subject"
                @create="onCreateTag"
                placeholder="Subject"
              />
            </view>

            <view class="metaItem">
              <view class="priorityRow inline">
                <view
                  v-for="p in priorities"
                  :key="p"
                  class="prioChip"
                  :class="['p-' + p, { on: form.priority === p }]"
                  role="button"
                  @tap="form.priority = p"
                >
                  <text class="prioText">{{ p }}</text>
                </view>
              </view>
            </view>
          </view>

          <view class="metaRow">
            <view class="metaItem">
              <DateField
                v-model="form.deadlineDate"
                mode="date"
                placeholder="Deadline"
              />
            </view>

            <view class="metaItem">
              <view class="reminderHead inline" role="button" @tap="toggleReminder">
                <text class="reminderLabel">Reminder</text>
                <view class="toggle" :class="{ on: form.reminderOn }" @tap.stop="toggleReminder">
                  <view class="toggleKnob" />
                </view>
              </view>
            </view>
          </view>

          <view v-if="form.reminderOn" class="metaRow reminderBody">
            <view class="metaItem">
              <DateField
                v-model="form.reminderDate"
                mode="date"
                placeholder="Date"
              />
            </view>
            <view class="metaItem">
              <DateField
                v-model="form.reminderTime"
                mode="time"
                placeholder="Time"
              />
            </view>
          </view>

          <view v-if="form.reminderOn" class="repeatBlock">
            <text class="repeatLabel">Repeat</text>
            <view class="repeatRow">
              <view
                v-for="opt in repeatOptions"
                :key="opt.id"
                class="repeatChip"
                :class="{ on: form.reminderRepeat === opt.id }"
                role="button"
                @tap="form.reminderRepeat = opt.id"
              >
                <text class="repeatChipText">{{ opt.label }}</text>
              </view>
            </view>
          </view>
        </view>

        <view class="field stepsField">
          <text v-if="form.checklist.length" class="stepsHint">Each step can have its own deadline</text>
          <view v-for="(item, idx) in form.checklist" :key="item.id" class="checkRow">
            <view class="checkMain">
              <input class="input checkInput" v-model="item.text" :placeholder="`Step ${idx + 1}`" placeholder-class="placeholder" />
              <view class="stepDateWrap" @tap.stop @click.stop @touchstart.stop @touchend.stop>
                <DateField
                  :model-value="item.deadline"
                  mode="date"
                  placeholder="Step deadline"
                  :compact="false"
                  :clearable="true"
                  @update:model-value="(v) => setStepDeadline(idx, v)"
                />
              </view>
            </view>
            <view class="del" role="button" @tap="removeChecklist(idx)">
              <text class="delText">−</text>
            </view>
          </view>
          <view class="addCheck tap" role="button" @tap="addChecklist">
            <text class="addCheckText">＋</text>
          </view>
        </view>

        <view class="gap" />
      </scroll-view>

      <view class="footer">
        <view class="save" :class="{ hit: saving }" role="button" @tap="submit">
          <text class="saveText">{{ mode === 'create' ? 'Add' : 'Save' }}</text>
        </view>
      </view>
    </view>
  </view>
  </view>
</template>

<script setup>
import { reactive, watch, ref, computed } from 'vue'
import DateField from '@/components/DateField.vue'
import TagSelect from '@/components/TagSelect.vue'
import { useTheme } from '@/composables/useTheme'
import { useTagStore } from '@/composables/useTagStore'
import { useCommunityStore } from '@/composables/useCommunityStore'
import { communitySubjectNames } from '@/lib/communitySubjectLinks'
import { resolveTaskStatusFromForm } from '@/lib/taskDueDate'
import {
  REMINDER_REPEAT_OPTIONS,
  buildReminderString,
  buildTaskDeadlineString,
  computeReminderAtIso,
  emptyReminderFormFields,
  normalizeReminderRepeat,
  reminderFormFieldsFromStored,
} from '@/lib/reminderString'
import { TEXT_AREA_MAX_LENGTH } from '@/lib/textInput'
import { toast } from '@/composables/useToast'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'edit' },
  task: {
    type: Object,
    default: () => ({
      title: '',
      description: '',
      deadline: '',
      subject: '',
      priority: 'P3',
      reminder: '',
      checklist: [],
    }),
  },
})

const emit = defineEmits(['update:modelValue', 'save'])

const { themeClass } = useTheme()
const { tagNames, addTag } = useTagStore()
const { sortedCommunities } = useCommunityStore()
const subjectOptions = computed(() => {
  if (!props.modelValue) return tagNames.value
  const names = communitySubjectNames(sortedCommunities.value)
  return names.length ? names : tagNames.value
})

const priorities = ['P1', 'P2', 'P3']
const repeatOptions = REMINDER_REPEAT_OPTIONS
const saving = ref(false)
const descExpanded = ref(false)

const form = reactive({
  title: '',
  description: '',
  deadlineDate: '',
  subject: '',
  priority: 'P3',
  ...emptyReminderFormFields(),
  checklist: [],
})

function parseStoredDeadline(raw) {
  if (!raw) return ''
  const iso = String(raw).match(/(\d{4}-\d{2}-\d{2})/)
  if (iso) return iso[1]
  return ''
}

function syncFromTask() {
  form.title = props.task?.title || ''
  form.description = props.task?.description || ''
  form.deadlineDate = parseStoredDeadline(props.task?.deadline)
  form.subject = props.task?.subject || ''
  form.priority = props.task?.priority || 'P3'
  Object.assign(form, reminderFormFieldsFromStored(props.task?.reminder))
  form.checklist = (props.task?.checklist || []).map((x, idx) => ({
    id: x.id || `c-${idx}`,
    text: x.text || '',
    done: !!x.done,
    deadline: parseStoredDeadline(x.deadline) || '',
  }))
}

watch(() => props.modelValue, (open) => {
  if (open) {
    saving.value = false
    syncFromTask()
    descExpanded.value = !!(props.task?.description || '').trim()
  } else {
    descExpanded.value = false
  }
})

function toggleDesc() {
  descExpanded.value = !descExpanded.value
}

function addChecklist() {
  form.checklist.push({ id: `new-${Date.now().toString(36)}`, text: '', done: false, deadline: '' })
}

function removeChecklist(idx) {
  form.checklist.splice(idx, 1)
}

function setStepDeadline(idx, value) {
  const row = form.checklist[idx]
  if (row) row.deadline = value || ''
}

function toggleReminder() {
  form.reminderOn = !form.reminderOn
  if (!form.reminderOn) {
    form.reminderDate = ''
    form.reminderTime = ''
    form.reminderRepeat = 'none'
  }
}

function onCreateTag(name) {
  addTag(name)
}

function resetSaving() {
  saving.value = false
}

defineExpose({ resetSaving })

function buildDeadlineString() {
  return buildTaskDeadlineString(form.deadlineDate)
}

function resolveFormDeadlineDate() {
  if (form.deadlineDate) return form.deadlineDate
  const pending = form.checklist.filter((x) => !x.done && x.deadline)
  if (!pending.length) return ''
  return [...pending.map((x) => x.deadline)].sort()[0]
}

function submit() {
  if (saving.value) return
  if (!form.title.trim()) {
    toast.show('Title required')
    return
  }
  if (form.reminderOn && !form.reminderDate) {
    toast.show('Pick reminder date')
    return
  }
  saving.value = true
  const deadlineDate = resolveFormDeadlineDate()
  emit('save', {
    title: form.title,
    description: form.description,
    deadline: buildDeadlineString(),
    subject: form.subject,
    priority: form.priority,
    status: resolveTaskStatusFromForm({ deadlineDate }),
    reminder: buildReminderString(form),
    reminderAt: computeReminderAtIso(form),
    reminderRepeat: form.reminderOn ? normalizeReminderRepeat(form.reminderRepeat) : 'none',
    checklist: form.checklist.filter((x) => x.text.trim()).map((x) => ({
      id: x.id,
      text: x.text.trim(),
      done: !!x.done,
      deadline: x.deadline || '',
    })),
  })
}
</script>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 70; opacity: 0; pointer-events: none; background: rgba(8,12,24,.32); backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); transition: opacity 240ms ease;}
.overlay.t-dark { background: rgba(0,0,0,.55);}
.overlay.show { opacity: 1; pointer-events: auto;}
.sheet { position: absolute; left: 8rpx; right: 8rpx; bottom: 8rpx; max-height: 92vh; border-radius: 38rpx; background: rgba(255,255,255,.92); border: 1rpx solid rgba(255,255,255,.62); box-shadow: 0 40rpx 120rpx rgba(10,16,30,.22); transform: translateY(22rpx); transition: transform 320ms cubic-bezier(.2,.7,.1,1); overflow: hidden;}
.t-dark .sheet { background: #1a1d21; border-color: rgba(255,255,255,.06); box-shadow: 0 44rpx 132rpx rgba(0,0,0,.55);}
.overlay.show .sheet { transform: translateY(0);}
.grabber { margin: 16rpx auto 0; width: 80rpx; height: 9rpx; border-radius: 999rpx; background: rgba(16,24,40,.18);}
.t-dark .grabber { background: rgba(245,247,255,.2);}
.head { padding: 12rpx 28rpx 10rpx; display: flex; align-items: center; justify-content: space-between;}
.title { font-size: 30rpx; font-weight: 760; color: rgba(16,24,40,.92);}
.t-dark .title { color: #f5f7fa;}
.body { max-height: 72vh; padding: 0 28rpx;}
.field { margin-top: 16rpx; display: flex; flex-direction: column; gap: 10rpx; }
.collapsible { gap: 0; }
.collapseHead {
  min-height: 64rpx;
  padding: 0 20rpx;
  border-radius: 24rpx;
  border: 1rpx solid rgba(16,24,40,.08);
  background: rgba(255,255,255,.78);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12rpx;
  transition: border-color 200ms ease, background 200ms ease;
}
.t-dark .collapseHead {
  border-color: rgba(255,255,255,.06);
  background: #23272d;
}
.collapseLabel {
  font-size: 26rpx;
  color: rgba(16,24,40,.62);
  font-weight: 660;
}
.t-dark .collapseLabel { color: rgba(245,247,255,.62); }
.collapseChev {
  font-size: 32rpx;
  line-height: 1;
  color: rgba(16,24,40,.38);
  transform: rotate(90deg);
  transition: transform var(--motion-expand) ease, color var(--motion-expand) ease;
}
.t-dark .collapseChev { color: rgba(245,247,255,.38); }
.collapseChev.open { transform: rotate(-90deg); color: rgba(46,99,255,.82); }
.collapseBody {
  max-height: 0;
  overflow: hidden;
  opacity: 0;
  transition: max-height var(--motion-expand) ease, opacity var(--motion-expand) ease, margin-top var(--motion-expand) ease;
  margin-top: 0;
}
.collapseBody.open {
  max-height: 560rpx;
  opacity: 1;
  margin-top: 12rpx;
}
.collapseBody .area { min-height: 220rpx; }
.input { min-height: 96rpx; border-radius: 24rpx; border: 1rpx solid rgba(16,24,40,.08); background: rgba(255,255,255,.78); padding: 0 20rpx; font-size: 28rpx; color: rgba(16,24,40,.92); transition: border-color 200ms ease, box-shadow 200ms ease, background 200ms ease;}
.t-dark .input { border-color: rgba(255,255,255,.06); background: #23272d; color: #f5f7fa;}
.input:focus { border-color: rgba(46,99,255,.4); box-shadow: 0 0 0 6rpx rgba(46,99,255,.12);}
.area { min-height: 168rpx; padding-top: 22rpx;}
.placeholder { color: rgba(16,24,40,.34);}
.t-dark .placeholder { color: rgba(245,247,255,.32);}

.taskEditorRoot :deep(.control) {
  min-height: 96rpx;
  padding: 16rpx 20rpx;
  border-radius: 24rpx;
}
.taskEditorRoot :deep(.value) { font-size: 28rpx; }
.taskEditorRoot :deep(.label) { font-size: 20rpx; }
.taskEditorRoot :deep(.chipText) { font-size: 26rpx; }
.taskEditorRoot :deep(.iconWrap) { width: 46rpx; height: 46rpx; border-radius: 14rpx; }
.taskEditorRoot :deep(.stepDateWrap .control) {
  min-height: 84rpx;
  padding: 14rpx 16rpx;
  border-radius: 22rpx;
}
.taskEditorRoot :deep(.stepDateWrap .value) { font-size: 24rpx; }

.metaGrid { gap: 10rpx; }
.metaRow { display: flex; gap: 10rpx; width: 100%; align-items: stretch; }
.metaItem { flex: 1; min-width: 0; }

.priorityRow { display: flex; gap: 8rpx; }
.priorityRow.inline {
  min-height: 96rpx;
  height: 96rpx;
  padding: 8rpx;
  border-radius: 24rpx;
  border: 1rpx solid rgba(16,24,40,.08);
  background: rgba(255,255,255,.78);
  gap: 6rpx;
  box-sizing: border-box;
}
.t-dark .priorityRow.inline {
  border-color: rgba(255,255,255,.06);
  background: #23272d;
}
.prioChip { flex: 1; min-height: 64rpx; border-radius: 18rpx; display: flex; align-items: center; justify-content: center; border: 1rpx solid rgba(16,24,40,.08); background: rgba(255,255,255,.62); transition: background 200ms ease, border-color 200ms ease, transform 180ms ease; }
.priorityRow.inline .prioChip {
  height: 80rpx;
  min-height: 80rpx;
  border-radius: 18rpx;
}
.t-dark .prioChip { background: rgba(255,255,255,.04); border-color: rgba(255,255,255,.06); }
.prioChip:active { transform: scale(0.97); }
.prioText { font-size: 24rpx; font-weight: 720; color: rgba(16,24,40,.6); letter-spacing: 0.3rpx; }
.t-dark .prioText { color: rgba(245,247,255,.6); }
.prioChip.p-P1.on { background: rgba(255,59,48,.12); border-color: rgba(255,59,48,.3); }
.prioChip.p-P1.on .prioText { color: rgba(220,55,45,.96); }
.prioChip.p-P2.on { background: rgba(255,149,0,.12); border-color: rgba(255,149,0,.3); }
.prioChip.p-P2.on .prioText { color: rgba(200,120,0,.96); }
.t-dark .prioChip.p-P2.on .prioText { color: rgba(255,180,80,.96); }
.prioChip.p-P3.on { background: rgba(46,99,255,.12); border-color: rgba(46,99,255,.3); }
.prioChip.p-P3.on .prioText { color: rgba(46,99,255,.96); }
.reminderHead { display: flex; align-items: center; justify-content: space-between; gap: 14rpx; min-height: 96rpx; padding: 0 20rpx; border-radius: 24rpx; border: 1rpx solid rgba(16,24,40,.08); background: rgba(255,255,255,.78); box-sizing: border-box; }
.reminderHead.inline { height: 100%; }
.t-dark .reminderHead { border-color: rgba(255,255,255,.06); background: #23272d; }
.reminderLabel { font-size: 26rpx; color: rgba(16,24,40,.62); font-weight: 660; white-space: nowrap; }
.t-dark .reminderLabel { color: rgba(245,247,255,.62); }
.toggle { width: 78rpx; height: 42rpx; border-radius: 999rpx; background: rgba(16,24,40,.12); border: 1rpx solid rgba(16,24,40,.06); position: relative; transition: background 200ms ease, border-color 200ms ease; flex-shrink: 0; }
.t-dark .toggle { background: rgba(245,247,255,.1); border-color: rgba(255,255,255,.08); }
.toggle.on { background: rgba(46,99,255,.42); border-color: rgba(46,99,255,.32); }
.toggleKnob { position: absolute; top: 4rpx; left: 4rpx; width: 32rpx; height: 32rpx; border-radius: 50%; background: rgba(255,255,255,.95); transition: transform 200ms ease; }
.toggle.on .toggleKnob { transform: translateX(34rpx); }
.reminderBody { margin-top: 0; }
.repeatBlock { margin-top: 4rpx; }
.repeatLabel {
  display: block;
  font-size: 20rpx;
  font-weight: 660;
  color: rgba(16,24,40,.52);
  margin-bottom: 8rpx;
}
.t-dark .repeatLabel { color: rgba(245,247,255,.52); }
.repeatRow { display: flex; flex-wrap: wrap; gap: 8rpx; }
.repeatChip {
  min-height: 56rpx;
  padding: 0 18rpx;
  border-radius: 999rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(16,24,40,.04);
  border: 1rpx solid rgba(16,24,40,.08);
  transition: background 200ms ease, border-color 200ms ease, transform 180ms ease;
}
.t-dark .repeatChip {
  background: rgba(255,255,255,.04);
  border-color: rgba(255,255,255,.08);
}
.repeatChip.on {
  background: rgba(46,99,255,.12);
  border-color: rgba(46,99,255,.28);
}
.repeatChipText {
  font-size: 22rpx;
  font-weight: 700;
  color: rgba(16,24,40,.62);
}
.t-dark .repeatChipText { color: rgba(245,247,255,.62); }
.repeatChip.on .repeatChipText { color: rgba(46,99,255,.96); }
.checkRow { display: flex; gap: 10rpx; margin-top: 10rpx; align-items: flex-start; }
.checkMain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.checkInput { flex: 1; }
.stepsField { gap: 0; }
.stepsHint {
  display: block;
  margin-bottom: 8rpx;
  font-size: 20rpx;
  font-weight: 660;
  color: rgba(16,24,40,.48);
}
.t-dark .stepsHint { color: rgba(245,247,255,.48); }
.stepDateWrap { width: 100%; position: relative; z-index: 2; }
.del { width: 84rpx; min-height: 96rpx; border-radius: 24rpx; display: flex; align-items: center; justify-content: center; background: rgba(220,80,80,.08); border: 1rpx solid rgba(220,80,80,.16); flex-shrink: 0; margin-top: 0; }
.delText { font-size: 34rpx; color: rgba(220,80,80,.9); line-height: 1; font-weight: 300; }
.addCheck { margin-top: 12rpx; height: 76rpx; border-radius: 20rpx; border: 1rpx dashed rgba(16,24,40,.18); display: flex; align-items: center; justify-content: center; transition: background 180ms ease; }
.t-dark .addCheck { border-color: rgba(255,255,255,.14); }
.addCheck:active { background: rgba(46,99,255,.04); }
.addCheckText { font-size: 32rpx; color: rgba(46,99,255,.92); font-weight: 500; line-height: 1; }
.t-dark .addCheckText { color: rgba(170,200,255,.94); }
.gap { height: 32rpx; }
.footer { padding: 20rpx 28rpx 28rpx; }
.save { height: 104rpx; border-radius: 26rpx; display: flex; align-items: center; justify-content: center; background: linear-gradient(180deg,#5a8eff,#2e63ff); box-shadow: 0 20rpx 60rpx rgba(46,99,255,.30); transition: transform 180ms ease, box-shadow 180ms ease; }
.save.hit { transform: scale(.985); box-shadow: 0 12rpx 36rpx rgba(46,99,255,.26); }
.saveText { font-size: 28rpx; font-weight: 760; color: rgba(255,255,255,.98); letter-spacing: 0.3rpx; }
</style>
