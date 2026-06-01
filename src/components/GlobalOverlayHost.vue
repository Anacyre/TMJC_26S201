<template>
  <ToastHost />
  <DeleteConfirmHost />
  <UndoMenuSheet v-model:open="undoMenuOpen" />
</template>

<script setup>
import ToastHost from '@/components/ToastHost.vue'
import DeleteConfirmHost from '@/components/DeleteConfirmHost.vue'
import UndoMenuSheet from '@/components/UndoMenuSheet.vue'
import { useUndoMenu } from '@/composables/useUndoMenu'

const { undoMenuOpen } = useUndoMenu()
</script>
