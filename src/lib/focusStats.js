export function computeTotalMinutes(sessions) {
  return (sessions || []).reduce((acc, s) => acc + (s.minutes || 0), 0)
}

function localDateKey(value) {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function formatMinutesLabel(totalMinutes) {
  if (totalMinutes >= 60) return `${(totalMinutes / 60).toFixed(1)}h`
  return `${totalMinutes}m`
}

export function formatTotalHoursLabel(totalMinutes) {
  return formatMinutesLabel(totalMinutes)
}

export function computeWeekMinutes(sessions) {
  return computeWeekTotals(sessions).reduce((acc, d) => acc + d.minutes, 0)
}

export function computeWeekTotals(sessions) {
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  const today = new Date()
  const out = labels.map((label, idx) => {
    const day = new Date(today)
    day.setDate(today.getDate() - (today.getDay() - idx))
    day.setHours(0, 0, 0, 0)
    return { label, key: localDateKey(day), minutes: 0 }
  })
  for (const s of sessions || []) {
    const k = localDateKey(s.endedAt)
    if (!k) continue
    const bucket = out.find((b) => b.key === k)
    if (bucket) bucket.minutes += s.minutes || 0
  }
  return out
}

export function computeMonthTrend(sessions) {
  const today = new Date()
  const out = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1)
    const next = new Date(today.getFullYear(), today.getMonth() - i + 1, 1)
    const minutes = (sessions || [])
      .filter((s) => {
        const t = new Date(s.endedAt).getTime()
        return t >= d.getTime() && t < next.getTime()
      })
      .reduce((acc, s) => acc + (s.minutes || 0), 0)
    out.push({
      key: `${d.getFullYear()}-${d.getMonth() + 1}`,
      label: d.toLocaleString('en-US', { month: 'short' }),
      minutes,
    })
  }
  return out
}

export function computeSubjectDistribution(sessions) {
  const tally = {}
  for (const s of sessions || []) {
    const k = s.subject || 'Focus'
    tally[k] = (tally[k] || 0) + (s.minutes || 0)
  }
  const entries = Object.entries(tally).map(([name, minutes]) => ({ name, minutes }))
  entries.sort((a, b) => b.minutes - a.minutes)
  return entries
}

export function buildFocusStats(sessions) {
  const totalMinutes = computeTotalMinutes(sessions)
  const weekMinutes = computeWeekMinutes(sessions)
  return {
    totalMinutes,
    weekMinutes,
    totalHoursLabel: formatTotalHoursLabel(totalMinutes),
    weekMinutesLabel: formatMinutesLabel(weekMinutes),
    weekTotals: computeWeekTotals(sessions),
    monthTrend: computeMonthTrend(sessions),
    subjectDistribution: computeSubjectDistribution(sessions),
  }
}
