<script setup lang="ts">
import { ref, computed } from 'vue'
import { Check, BookmarkPlus } from 'lucide-vue-next'
import { useMusicStore } from '@/stores/music'

const store = useMusicStore()
const showSaved = ref(false)

const canSave = computed(() => {
  return store.lyrics.trim().length > 0 || store.musicCaption.trim().length > 0
})

function handleSave() {
  if (!canSave.value) return
  store.saveAsTemplate()
  showSaved.value = true
  setTimeout(() => {
    showSaved.value = false
  }, 2000)
}
</script>

<template>
  <button
    class="btn-ghost text-sm py-2 px-4"
    :disabled="!canSave"
    @click="handleSave"
  >
    <transition name="fade" mode="out-in">
      <span v-if="showSaved" class="flex items-center gap-2">
        <Check class="w-4 h-4 text-accent" :stroke-width="2" />
        已保存
      </span>
      <span v-else class="flex items-center gap-2">
        <BookmarkPlus class="w-4 h-4" :stroke-width="1.5" />
        保存模板
      </span>
    </transition>
  </button>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
