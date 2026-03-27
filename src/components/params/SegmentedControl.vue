<script setup lang="ts">
defineProps<{
  modelValue: string
  options: { value: string; label: string }[]
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()
</script>

<template>
  <div class="flex items-center h-9 rounded-lg border border-white/10 bg-white/5 overflow-hidden">
    <button
      v-for="opt in options"
      :key="opt.value"
      type="button"
      class="h-full px-3 text-xs font-medium transition-colors duration-200 cursor-pointer whitespace-nowrap"
      :class="[
        modelValue === opt.value
          ? 'bg-secondary/20 text-secondary border-secondary/30'
          : 'text-slate-400 hover:text-white hover:bg-white/10',
      ]"
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
