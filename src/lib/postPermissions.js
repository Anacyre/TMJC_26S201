/**
 * Whether the current user may delete a post (author or active admin).
 * Anonymous posts are only deletable by admins.
 */
export function canDeletePost(post, { userId, isAdminActive } = {}) {
  if (!post?.id || !userId) return false
  if (isAdminActive) return true
  if (post.anonymous) return false
  return post.authorId === userId
}
