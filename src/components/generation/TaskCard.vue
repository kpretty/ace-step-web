<script setup lang="ts">
import {
  Loader, Check, AlertCircle, Trash2,
  Clock, StopCircle, Ban,
} from 'lucide-vue-next'
import { computed } from 'vue'
import type { GenerationTask } from '@/stores/music'
import AudioTrack from './AudioTrack.vue'

const props = defineProps<{
  task: GenerationTask
}>()

const emit = defineEmits<{
  remove: [id: string]
  abort: [id: string]
}>()

const progressPercent = computed(() => Math.round(props.task.progress))

const statusConfig = computed(() => {
  switch (props.task.status) {
    case 'pending':
      return { icon: Clock, color: 'text-slate-400', bgColor: 'bg-slate-400/10', label: '排队中' }
    case 'processing':
      return { icon: Loader, color: 'text-secondary', bgColor: 'bg-secondary/10', label: '生成中' }
    case 'completed':
      return { icon: Check, color: 'text-accent', bgColor: 'bg-accent/10', label: '已完成' }
    case 'failed':
      return { icon: AlertCircle, color: 'text-red-400', bgColor: 'bg-red-400/10', label: '失败' }
    case 'aborted':
      return { icon: Ban, color: 'text-orange-400', bgColor: 'bg-orange-400/10', label: '已中断' }
    default:
      return { icon: Clock, color: 'text-slate-400', bgColor: 'bg-slate-400/10', label: '未知' }
  }
})

const isActive = computed(() =>
  props.task.status === 'processing' || props.task.status === 'pending',
)

function formatTime(date: Date): string {
  return new Date(date).toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

function handleAbort() {
  emit('abort', props.task.id)
}
</script>

<template>
  <div class="glass-card transition-all duration-300 overflow-hidden">
    <!-- Header: title + status + actions -->
    <div class="flex items-center justify-between gap-3 px-5 pt-4 pb-3">
      <div class="flex items-center gap-3 min-w-0 flex-1">
        <div
          class="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
          :class="statusConfig.bgColor"
        >
          <component
            :is="statusConfig.icon"
            class="w-4 h-4"
            :class="[statusConfig.color, { 'animate-spin': task.status === 'processing' }]"
            :stroke-width="1.5"
          />
        </div>
        <div class="min-w-0">
          <p class="text-sm font-medium text-slate-200 truncate">
            {{ task.title }}
            <span
              v-if="task.audioResults.length > 1"
              class="text-xs text-slate-500 ml-1"
            >
              ({{ task.audioResults.length }} 首)
            </span>
          </p>
          <p class="text-xs text-slate-500">
            {{ formatTime(task.createdAt) }}
          </p>
        </div>
      </div>

      <!-- Right: status badge + abort/remove -->
      <div class="flex items-center gap-2 flex-shrink-0">
        <span
          class="text-xs font-medium px-2 py-1 rounded-md"
          :class="[statusConfig.color, statusConfig.bgColor]"
        >
          {{ statusConfig.label }}
        </span>

        <!-- Abort (active tasks only) -->
        <button
          v-if="isActive"
          class="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors duration-200 cursor-pointer text-slate-400 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/30"
          aria-label="中断任务"
          @click="handleAbort"
        >
          <StopCircle class="w-4 h-4" :stroke-width="1.5" />
        </button>

        <!-- Remove (terminal states) -->
        <button
          v-if="!isActive"
          class="p-1.5 rounded-lg hover:bg-white/10 transition-colors duration-200 cursor-pointer text-slate-400 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-white/20"
          aria-label="删除任务"
          @click="emit('remove', task.id)"
        >
          <Trash2 class="w-4 h-4" :stroke-width="1.5" />
        </button>
      </div>
    </div>

    <!-- ==================== PROCESSING: progress bar ==================== -->
    <div v-if="isActive" class="px-5 pb-4">
      <div class="flex items-center justify-between mb-2">
        <span class="text-xs text-slate-500">进度</span>
        <span class="text-xs font-mono text-slate-400">{{ progressPercent }}%</span>
      </div>
      <div class="h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          class="h-full rounded-full transition-all duration-500 ease-out"
          :class="task.status === 'processing' ? 'bg-secondary' : 'bg-slate-500'"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
      <p v-if="task.stageText" class="text-[11px] text-slate-500 mt-1.5 truncate">
        {{ task.stageText }}
      </p>
    </div>

    <!-- ==================== FAILED: error message ==================== -->
    <div
      v-if="task.status === 'failed' && task.errorMessage"
      class="px-5 pb-4"
    >
      <p class="text-xs text-red-400 bg-red-400/5 border border-red-400/10 rounded-lg px-3 py-2">
        {{ task.errorMessage }}
      </p>
    </div>

    <!-- ==================== COMPLETED: one AudioTrack per result ==================== -->
    <div
      v-if="task.status === 'completed' && task.audioResults.length > 0"
      class="px-5 pb-4 space-y-4"
    >
      <AudioTrack
        v-for="(result, idx) in task.audioResults"
        :key="result.filePath"
        :result="result"
        :index="idx"
        :total="task.audioResults.length"
      />
    </div>
  </div>
</template>
