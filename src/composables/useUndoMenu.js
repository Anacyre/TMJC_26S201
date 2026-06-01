import { ref } from 'vue'

const undoMenuOpen = ref(false)

export function useUndoMenu() {
  function openUndoMenu() {
    undoMenuOpen.value = true
  }

  function closeUndoMenu() {
    undoMenuOpen.value = false
  }

  return {
    undoMenuOpen,
    openUndoMenu,
    closeUndoMenu,
  }
}
