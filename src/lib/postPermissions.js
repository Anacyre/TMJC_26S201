/**
 * Whether the current user may delete a post (author or real admin).
 * Anonymous posts are only deletable by admins.
 */
export function canDeletePost(post, { userId, isRealAdmin } = {}) {
  if (!post?.id || !userId) return false
  if (isRealAdmin) return true
  if (post.anonymous) return false
  return post.authorId === userId
}
