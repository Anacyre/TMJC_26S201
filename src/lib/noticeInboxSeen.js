const KEY_PREFIX = 'notice_inbox_seen_v1_'

export function getNoticeInboxSeenAt(userId = '') {
  if (!userId) return 0
  try {
    const raw = uni.getStorageSync(`${KEY_PREFIX}${userId}`)
    const n = Number(raw)
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

export function touchNoticeInboxSeen(userId = '', at = Date.now()) {
  if (!userId) return
  try {
    const prev = getNoticeInboxSeenAt(userId)
    uni.setStorageSync(`${KEY_PREFIX}${userId}`, Math.max(prev, at))
  } catch {}
}

/** First fetch: treat existing notices as already seen so the badge is not flooded. */
export function ensureNoticeInboxBaseline(userId = '', notices = []) {
  if (!userId || getNoticeInboxSeenAt(userId) > 0) return
  let maxCreated = 0
  for (const n of notices) {
    const t = new Date(n.createdAt || 0).getTime()
    if (Number.isFinite(t)) maxCreated = Math.max(maxCreated, t)
  }
  touchNoticeInboxSeen(userId, maxCreated || Date.now())
}
