export function shortTimeLabel(iso, { compact = false } = {}) {
  if (!iso) return compact ? '—' : 'just now'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return compact ? 'now' : 'just now'
  if (m < 60) return compact ? `${m}m` : `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return compact ? `${h}h` : `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 7) return compact ? `${d}d` : `${d}d ago`
  return new Date(iso).toLocaleDateString('en-SG', { month: 'short', day: 'numeric' })
}
