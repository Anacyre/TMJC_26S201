import { useCommunityStore } from '@/composables/useCommunityStore'
import { useUserStore } from '@/composables/useUserStore'
import { useAdminMode } from '@/composables/useAdminMode'
import { canDeletePost } from '@/lib/postPermissions'
import { toast } from '@/composables/useToast'
import { deleteConfirm } from '@/composables/useConfirmDelete'

export function usePostDelete() {
  const { deletePost } = useCommunityStore()
  const { currentUser } = useUserStore()
  const { isAdminActive } = useAdminMode()

  function canDelete(post) {
    return canDeletePost(post, {
      userId: currentUser.value?.id,
      isAdminActive: isAdminActive.value,
    })
  }

  async function confirmDeletePost(post, { onDeleted } = {}) {
    if (!canDelete(post) || !post?.id) return
    const ok = await deleteConfirm.post()
    if (!ok) return
    const { error } = await deletePost(post.id)
    if (error) {
      toast.show(error.message || 'Could not delete')
      return
    }
    toast.postDeleted()
    onDeleted?.()
  }

  return { canDelete, confirmDeletePost }
}
