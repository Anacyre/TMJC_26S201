function postAuthorId(post) {
  return String(post?.authorId || post?.user_id || post?.userId || '').trim()
}

/**
 * Publisher may always delete; admins only when admin mode is active.
 */
export function canDeletePost(post, { userId, isAdminActive } = {}) {
  const uid = String(userId || '').trim()
  if (!post?.id || !uid) return false
  const authorId = postAuthorId(post)
  if (authorId !== '' && authorId === uid) return true
  return !!isAdminActive
}

export { postAuthorId }
