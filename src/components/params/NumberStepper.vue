<script setup lang="ts">
import { computed } from 'vue'
import { Minus, Plus } from 'lucide-vue-next'

const props = defineProps<{
  modelValue: number | null
  min: number
  max: number
  step?: number
  placeholder?: string
  nullable?: boolean
}>()

const emit = defineEmits<{
  'update:modelValue': [value: number | null]
}>()

const stepSize = computed(() => props.step ?? 1)

const displayValue = computed(() => {
  if (props.modelValue === null || props.modelValue === undefined) return ''
  return String(props.modelValue)
})

function increment() {
  const current = props.modelValue ?? props.min - stepSize.value
  const next = Math.min(current + stepSize.value, props.max)
  emit('update:modelValue', next)
}

function decrement() {
  const current = props.modelValue ?? props.min + stepSize.value
  const next = current - stepSize.value
  if (props.nullable && next < props.min) {
    emit('update:modelValue', null)
  } else {
    emit('update:modelValue', Math.max(next, props.min))
  }
}

function handleInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  if (raw === '') {
    if (props.nullable) {
      emit('update:modelValue', null)
    }
    return
  }
  const num = Number(raw)
  if (!isNaN(num)) {
    emit('update:modelValue', Math.max(props.min, Math.min(num, props.max)))
  }
}

const canDecrement = computed(() => {
  if (props.nullable && props.modelValue === null) return false
  if (props.modelValue === null) return true
  return props.nullable || props.modelValue > props.min
})

const canIncrement = computed(() => {
  if (props.modelValue === null) return true
  return props.modelValue < props.max
})
</script>

<template>
  <div class="flex items-center h-9 rounded-lg border border-white/10 bg-white/5 overflow-hidden">
    <button
      type="button"
      class="h-full px-2.5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
      :disabled="!canDecrement"
      aria-label="减少"
      @click="decrement"
    >
      <Minus class="w-3.5 h-3.5" :stroke-width="2" />
    </button>
    <input
      type="text"
      inputmode="numeric"
      class="h-full w-14 text-center bg-transparent text-sm text-slate-200 font-mono outline-none border-x border-white/10 placeholder-slate-600"
      :value="displayValue"
      :placeholder="placeholder ?? '—'"
      @change="handleInput"
    />
    <button
      type="button"
      class="h-full px-2.5 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors duration-200 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
      :disabled="!canIncrement"
      aria-label="增加"
      @click="increment"
    >
      <Plus class="w-3.5 h-3.5" :stroke-width="2" />
    </button>
  </div>
</template>
