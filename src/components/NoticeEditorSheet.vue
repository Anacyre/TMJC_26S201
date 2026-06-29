<template>
  <view class="noticeEditorRoot">
    <view class="overlay" :class="[themeClass, { show: modelValue }]" @tap="close">
      <view class="sheet" @tap.stop>
        <view class="grabber" />
        <view class="head">
          <text class="sheetTitle">{{ mode === 'create' ? 'Notice' : 'Edit notice' }}</text>
        </view>

        <scroll-view class="body" scroll-y :show-scrollbar="false">
          <view class="field">
            <input class="input" v-model="form.title" placeholder="Title" placeholder-class="placeholder" />
          </view>

          <view class="field collapsible">
            <view class="collapseHead tap notesHead" role="button" @tap="descExpanded = !descExpanded">
              <text class="collapseLabel">{{ descExpanded ? 'Details' : 'Add details' }}</text>
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

          <view v-if="showSubject" class="field collapsible">
            <view class="collapseHead tap" role="button" @tap="subjectExpanded = !subjectExpanded">
              <text class="collapseLabel">{{ subjectCollapseLabel }}</text>
              <text class="collapseChev" :class="{ open: subjectExpanded }">›</text>
            </view>
            <view class="collapseBody" :class="{ open: subjectExpanded }">
              <TagSelect
                v-model="form.subject"
                :options="subjectOptions"
                :allow-create="true"
                :can-create="true"
                kind="subject"
                @create="(name) => emit('create-tag', name)"
                placeholder="Subject"
              />
            </view>
          </view>

          <view class="field metaGrid">
            <view class="typeRow inline">
              <view
                v-for="t in noticeTypes"
                :key="t.id"
                class="typeChip"
                :class="['t-' + t.id, { on: form.type === t.label }]"
                role="button"
                @tap="form.type = t.label"
              >
                <text class="typeText">{{ t.label }}</text>
              </view>
            </view>

            <view class="metaRow">
              <view class="metaItem full">
                <DateField v-model="form.deadlineDate" mode="date" placeholder="Deadline" />
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

          <view class="sheetGap" />
        </scroll-view>

        <view class="footer">
          <view class="save tap" :class="{ busy: saving }" role="button" @tap="submit">
            <text class="saveText">{{ saving ? '…' : (mode === 'create' ? 'Publish' : 'Save') }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue'
import DateField from '@/components/DateField.vue'
import TagSelect from '@/components/TagSelect.vue'
import { useTheme } from '@/composables/useTheme'
import { TEXT_AREA_MAX_LENGTH } from '@/lib/textInput'
import { toast } from '@/composables/useToast'
import {
  editorFormToNoticePayload,
  emptyNoticeEditorForm,
  noticeToEditorForm,
} from '@/lib/noticeForm'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  mode: { type: String, default: 'create' },
  notice: { type: Object, default: null },
  subjectOptions: { type: Array, default: () => [] },
})

const emit = defineEmits(['update:modelValue', 'save', 'create-tag'])

const { themeClass } = useTheme()
const saving = ref(false)
const descExpanded = ref(false)
const subjectExpanded = ref(false)

const noticeTypes = [
  { id: 'homework', label: 'Homework' },
  { id: 'general', label: 'General' },
  { id: 'via', label: 'VIA' },
  { id: 'events', label: 'Event' },
]

const form = reactive(emptyNoticeEditorForm())

const showSubject = computed(() => form.type === 'Homework')
const subjectCollapseLabel = computed(() => {
  if (subjectExpanded.value) return form.subject?.trim() || 'Subject'
  return form.subject?.trim() ? form.subject : 'Add subject'
})

function resetFormFromNotice() {
  const next = props.mode === 'edit' && props.notice?.id
    ? noticeToEditorForm(props.notice)
    : emptyNoticeEditorForm()
  Object.assign(form, next)
  if (!Array.isArray(form.checklist)) form.checklist = []
  descExpanded.value = !!(form.description || '').trim()
  subjectExpanded.value = !!(form.subject || '').trim()
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

watch(
  () => [props.modelValue, props.notice?.id, props.mode],
  ([open]) => {
    if (open) resetFormFromNotice()
  },
)

watch(
  () => form.type,
  (next, prev) => {
    if (prev === 'Homework' && next !== 'Homework') {
      form.subject = ''
      subjectExpanded.value = false
    }
  },
)

function close() {
  emit('update:modelValue', false)
}

async function submit() {
  if (saving.value) return
  if (!form.title.trim()) {
    toast.show('Title required')
    return
  }
  if (!form.type) {
    toast.show('Pick a type')
    return
  }
  saving.value = true
  try {
    emit('save', editorFormToNoticePayload(form))
  } finally {
    saving.value = false
  }
}

defineExpose({ setSaving: (v) => { saving.value = !!v } })
</script>

<style scoped>
.overlay { position: fixed; inset: 0; z-index: 70; opacity: 0; pointer-events: none; background: rgba(8, 12, 24, 0.32); backdrop-filter: blur(14px); transition: opacity 240ms ease; }
.overlay.t-dark { background: rgba(0, 0, 0, 0.55); }
.overlay.show { opacity: 1; pointer-events: auto; }
.sheet {
  position: absolute; left: 8rpx; right: 8rpx; bottom: 8rpx; max-height: 92vh;
  border-radius: 38rpx; background: rgba(255, 255, 255, 0.92);
  border: 1rpx solid rgba(255, 255, 255, 0.62);
  box-shadow: 0 40rpx 120rpx rgba(10, 16, 30, 0.22);
  transform: translateY(22rpx); transition: transform 320ms cubic-bezier(0.2, 0.7, 0.1, 1);
  overflow: hidden; display: flex; flex-direction: column;
}
.t-dark .sheet { background: #1a1d21; border-color: rgba(255, 255, 255, 0.06); }
.overlay.show .sheet { transform: translateY(0); }
.grabber { margin: 16rpx auto 0; width: 80rpx; height: 9rpx; border-radius: 999rpx; background: rgba(16, 24, 40, 0.18); }
.head { padding: 12rpx 28rpx 10rpx; }
.sheetTitle { font-size: 30rpx; font-weight: 760; color: rgba(16, 24, 40, 0.92); }
.t-dark .sheetTitle { color: #f5f7fa; }
.body { max-height: 72vh; padding: 0 28rpx; box-sizing: border-box; }
.field { margin-top: 16rpx; display: flex; flex-direction: column; gap: 10rpx; }
.collapsible { gap: 0; }
.collapseHead {
  min-height: 64rpx; padding: 0 20rpx; border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.78); border: 1rpx solid rgba(16, 24, 40, 0.08);
  display: flex; align-items: center; justify-content: space-between; gap: 12rpx;
}
.t-dark .collapseHead { background: #23272d; border-color: rgba(255, 255, 255, 0.06); }
.collapseLabel { font-size: 26rpx; color: rgba(16, 24, 40, 0.62); font-weight: 660; }
.collapseChev { font-size: 32rpx; transform: rotate(90deg); transition: transform 0.2s ease; color: rgba(16, 24, 40, 0.38); }
.collapseChev.open { transform: rotate(-90deg); color: rgba(46, 99, 255, 0.82); }
.collapseBody { max-height: 0; overflow: hidden; opacity: 0; transition: max-height 0.2s ease, opacity 0.2s ease, margin-top 0.2s ease; }
.collapseBody.open { max-height: 560rpx; opacity: 1; margin-top: 12rpx; }
.input {
  min-height: 96rpx; padding: 0 20rpx; border-radius: 24rpx;
  background: rgba(255, 255, 255, 0.78); border: 1rpx solid rgba(16, 24, 40, 0.08);
  color: rgba(16, 24, 40, 0.92); font-size: 28rpx;
}
.t-dark .input { background: #23272d; border-color: rgba(255, 255, 255, 0.06); color: #f5f7fa; }
.area { min-height: 220rpx; padding-top: 22rpx; }
.placeholder { color: rgba(16, 24, 40, 0.34); }
.metaGrid { gap: 10rpx; }
.metaRow { display: flex; gap: 10rpx; width: 100%; }
.metaItem.full { flex: 1; }
.typeRow.inline {
  min-height: 96rpx; padding: 8rpx; border-radius: 24rpx;
  border: 1rpx solid rgba(16, 24, 40, 0.08); background: rgba(255, 255, 255, 0.78);
  display: flex; gap: 6rpx; box-sizing: border-box;
}
.typeChip {
  flex: 1; min-height: 80rpx; display: flex; align-items: center; justify-content: center;
  border-radius: 18rpx; background: rgba(255, 255, 255, 0.62); border: 1rpx solid rgba(16, 24, 40, 0.06);
}
.typeChip.on { background: rgba(46, 99, 255, 0.12); border-color: rgba(46, 99, 255, 0.24); }
.typeText { font-size: 22rpx; font-weight: 700; color: rgba(16, 24, 40, 0.78); }
.typeChip.on .typeText { color: rgba(46, 99, 255, 0.96); }
.sheetGap { height: 32rpx; }
.footer { padding: 20rpx 28rpx 28rpx; }
.save {
  height: 104rpx; border-radius: 26rpx; display: flex; align-items: center; justify-content: center;
  background: linear-gradient(180deg, #5a8eff, #2e63ff); box-shadow: 0 20rpx 60rpx rgba(46, 99, 255, 0.3);
}
.save.busy { opacity: 0.7; pointer-events: none; }
.saveText { font-size: 28rpx; font-weight: 760; color: rgba(255, 255, 255, 0.98); }
.noticeEditorRoot :deep(.control) { min-height: 96rpx; padding: 16rpx 20rpx; border-radius: 24rpx; }
.stepsField { gap: 0; }
.stepsHint {
  display: block;
  margin-bottom: 8rpx;
  font-size: 20rpx;
  font-weight: 660;
  color: rgba(16, 24, 40, 0.48);
}
.t-dark .stepsHint { color: rgba(245, 247, 255, 0.48); }
.checkRow { display: flex; gap: 10rpx; margin-top: 10rpx; align-items: flex-start; }
.checkMain { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8rpx; }
.checkInput { flex: 1; }
.stepDateWrap { width: 100%; position: relative; z-index: 2; }
.del {
  width: 84rpx; min-height: 96rpx; border-radius: 24rpx;
  display: flex; align-items: center; justify-content: center;
  background: rgba(220, 80, 80, 0.08); border: 1rpx solid rgba(220, 80, 80, 0.16);
  flex-shrink: 0;
}
.delText { font-size: 34rpx; color: rgba(220, 80, 80, 0.9); line-height: 1; font-weight: 300; }
.addCheck {
  margin-top: 12rpx; height: 76rpx; border-radius: 20rpx;
  border: 1rpx dashed rgba(16, 24, 40, 0.18);
  display: flex; align-items: center; justify-content: center;
}
.t-dark .addCheck { border-color: rgba(255, 255, 255, 0.14); }
.addCheckText { font-size: 32rpx; color: rgba(46, 99, 255, 0.92); font-weight: 500; line-height: 1; }
.t-dark .addCheckText { color: rgba(170, 200, 255, 0.94); }
</style>
