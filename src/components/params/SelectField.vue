<script setup lang="ts">
import { ChevronDown } from 'lucide-vue-next'

defineProps<{
  modelValue: string
  options: { value: string; label: string }[]
  placeholder?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

function handleChange(e: Event) {
  emit('update:modelValue', (e.target as HTMLSelectElement).value)
}
</script>

<template>
  <div class="relative">
    <select
      class="w-full h-9 pl-3 pr-8 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-200 appearance-none outline-none transition-colors duration-200 focus:border-secondary/50 focus:ring-2 focus:ring-secondary/20 cursor-pointer"
      :value="modelValue"
      @change="handleChange"
    >
      <option v-if="placeholder" value="" class="bg-surface text-slate-400">
        {{ placeholder }}
      </option>
      <option
        v-for="opt in options"
        :key="opt.value"
        :value="opt.value"
        class="bg-surface text-slate-200"
      >
        {{ opt.label }}
      </option>
    </select>
    <ChevronDown
      class="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500 pointer-events-none"
      :stroke-width="2"
    />
  </div>
</template>
