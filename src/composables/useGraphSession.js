import { computed, reactive, toRefs } from 'vue'

export const CURVE_COUNT = 4

function makeCurve(text = '', expanded = false) {
  return { text, cursor: text.length, expanded, error: '' }
}

const session = reactive({
  curves: [
    makeCurve('', false),
    makeCurve('', false),
    makeCurve('', false),
    makeCurve('', false),
  ],
  activeCurve: 0,
  panelCollapsed: false,
  sciOpen: false,
  activeField: 'expr',
})

export function useGraphSession() {
  function setCurveDraft(index, text, cursor = text.length) {
    const curve = session.curves[index]
    if (!curve) return
    curve.text = String(text || '')
    curve.cursor = Math.max(0, Math.min(cursor, curve.text.length))
    session.activeCurve = index
    session.activeField = 'expr'
  }

  function toggleCurve(index) {
    const curve = session.curves[index]
    if (!curve) return
    const willExpand = !curve.expanded
    session.curves.forEach((c, i) => {
      c.expanded = i === index ? willExpand : false
    })
    session.activeCurve = index
    session.activeField = 'expr'
    session.panelCollapsed = false
  }

  function togglePanel() {
    session.panelCollapsed = !session.panelCollapsed
  }

  const activeCurveData = computed(() => session.curves[session.activeCurve])

  return {
    ...toRefs(session),
    curves: computed(() => session.curves),
    activeCurveData,
    setCurveDraft,
    toggleCurve,
    togglePanel,
  }
}
