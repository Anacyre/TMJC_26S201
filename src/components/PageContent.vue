<template>
  <TabPageContent>
    <template v-if="$slots.chrome" #chrome>
      <slot name="chrome" />
    </template>
    <slot />
  </TabPageContent>
</template>

<script setup>
import TabPageContent from '@/components/TabPageContent.vue'
</script>
