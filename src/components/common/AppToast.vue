<script setup lang="ts">
import { CheckCircle, XCircle, Info } from 'lucide-vue-next'
import { useToast } from '@/composables/useToast'

const { toasts } = useToast()
</script>

<template>
  <Teleport to="body">
    <div
      class="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none"
      aria-live="polite"
      aria-label="通知"
    >
      <TransitionGroup name="toast">
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium backdrop-blur-md border"
          :class="{
            'bg-accent/20 border-accent/30 text-accent': toast.type === 'success',
            'bg-red-500/20 border-red-500/30 text-red-400': toast.type === 'error',
            'bg-secondary/20 border-secondary/30 text-slate-200': toast.type === 'info',
          }"
        >
          <CheckCircle
            v-if="toast.type === 'success'"
            class="w-4 h-4 shrink-0"
            :stroke-width="1.5"
            aria-hidden="true"
          />
          <XCircle
            v-else-if="toast.type === 'error'"
            class="w-4 h-4 shrink-0"
            :stroke-width="1.5"
            aria-hidden="true"
          />
          <Info
            v-else
            class="w-4 h-4 shrink-0"
            :stroke-width="1.5"
            aria-hidden="true"
          />
          <span>{{ toast.message }}</span>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>

<style scoped>
.toast-enter-active {
  transition: all 0.25s ease-out;
}
.toast-leave-active {
  transition: all 0.2s ease-in;
}
.toast-enter-from {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}
.toast-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>
