<script setup lang="ts">
import { ref, computed, toRef } from 'vue'
import {
  Loader, Check, AlertCircle, Download, Trash2,
  Clock, Play, Pause, StopCircle, Ban,
} from 'lucide-vue-next'
import type { GenerationTask } from '@/stores/music'
import { fetchAudioBlob } from '@/utils/api'
import { useAudioPlayer } from '@/composables/useAudioPlayer'
import AudioWaveform from './AudioWaveform.vue'

const props = defineProps<{
  task: GenerationTask
}>()

const emit = defineEmits<{
  remove: [id: string]
  abort: [id: string]
}>()

const progressPercent = computed(() => Math.round(props.task.progress))

const audioUrl = toRef(() => props.task.audioUrl)

const player = useAudioPlayer(audioUrl)

const hasMultipleResults = computed(() => props.task.audioResults.length > 1)

// Track per-result download loading state (index → boolean)
const downloadingIdx = ref<number | null>(null)

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

/**
 * Download audio via JS fetch → Blob → <a click>.
 * This avoids the browser's CORS restriction on cross-origin <a download> links
 * and works even when the server doesn't send CORS headers, because the request
 * goes through the Vite dev proxy (same-origin in dev) or the same host in prod.
 */
async function handleDownload(filePath: string, idx: number) {
  if (downloadingIdx.value !== null) return
  downloadingIdx.value = idx
  try {
    const { blobUrl, filename } = await fetchAudioBlob(filePath)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    // Delay revoke so browser can start the download
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)
  } catch (err) {
    console.error('下载失败', err)
  } finally {
    downloadingIdx.value = null
  }
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
            <span v-if="hasMultipleResults" class="text-xs text-slate-500 ml-1">
              ({{ task.audioResults.length }} 首)
            </span>
          </p>
          <p class="text-xs text-slate-500">
            {{ formatTime(task.createdAt) }}
            <span v-if="task.duration" class="ml-2">{{ task.duration }}</span>
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

        <!-- Abort button (active tasks only) -->
        <button
          v-if="isActive"
          class="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors duration-200 cursor-pointer text-slate-400 hover:text-red-400 focus:outline-none focus:ring-2 focus:ring-red-400/30"
          aria-label="中断任务"
          @click="handleAbort"
        >
          <StopCircle class="w-4 h-4" :stroke-width="1.5" />
        </button>

        <!-- Remove button (terminal states) -->
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

    <!-- ==================== PROCESSING: full-width progress bar ==================== -->
    <div
      v-if="isActive"
      class="px-5 pb-4"
    >
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
      <!-- Stage text from server -->
      <p
        v-if="task.stageText"
        class="text-[11px] text-slate-500 mt-1.5 truncate"
      >
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

    <!-- ==================== COMPLETED: primary audio waveform + controls (10:2 grid) ==================== -->
    <div
      v-if="task.status === 'completed' && task.audioResults.length > 0"
      class="px-5 pb-4"
    >
      <!-- Player row: waveform (10) | controls (2) -->
      <div class="grid grid-cols-12 gap-3 items-center">
        <!-- Waveform area: col-span-10 -->
        <div class="col-span-10">
          <div class="flex items-center gap-3">
            <!-- Play / Pause button -->
            <button
              class="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 hover:bg-secondary/30 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/50"
              :aria-label="player.isPlaying.value ? '暂停' : '播放'"
              @click="player.toggle()"
            >
              <Pause v-if="player.isPlaying.value" class="w-4 h-4 text-secondary" :stroke-width="2" />
              <Play v-else class="w-4 h-4 text-secondary ml-0.5" :stroke-width="2" />
            </button>

            <!-- Waveform + time -->
            <div class="flex-1 min-w-0">
              <div class="h-10">
                <AudioWaveform
                  :bars="player.waveformData.value"
                  :progress="player.progress.value"
                  @seek="player.seekByPercent"
                />
              </div>
              <div class="flex items-center justify-between mt-1">
                <span class="text-[11px] font-mono text-slate-500">
                  {{ player.formatTime(player.currentTime.value) }}
                </span>
                <span class="text-[11px] font-mono text-slate-500">
                  {{ player.formatTime(player.duration.value) }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Controls area: col-span-2 -->
        <div class="col-span-2 flex flex-col items-center gap-2">
          <!-- Speed toggle -->
          <button
            class="w-full h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-medium text-slate-300 hover:text-white transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20"
            aria-label="切换播放速度"
            @click="player.cycleRate()"
          >
            {{ player.playbackRate.value }}x
          </button>

          <!-- Download first result via JS blob -->
          <button
            class="w-full h-8 rounded-lg bg-accent/10 hover:bg-accent/20 border border-accent/20 flex items-center justify-center transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="下载音频"
            :disabled="downloadingIdx === 0"
            @click="handleDownload(task.audioResults[0].filePath, 0)"
          >
            <Loader
              v-if="downloadingIdx === 0"
              class="w-4 h-4 text-accent animate-spin"
              :stroke-width="1.5"
            />
            <Download v-else class="w-4 h-4 text-accent" :stroke-width="1.5" />
          </button>
        </div>
      </div>

      <!-- Extra results (batch_size > 1): compact download list -->
      <div
        v-if="hasMultipleResults"
        class="mt-3 pt-3 border-t border-white/5 space-y-2"
      >
        <p class="text-xs text-slate-500 mb-2">批量结果 ({{ task.audioResults.length }} 首)</p>
        <div
          v-for="(result, idx) in task.audioResults"
          :key="idx"
          class="flex items-center justify-between bg-white/[0.02] rounded-lg px-3 py-2"
        >
          <div class="flex items-center gap-2 text-xs text-slate-400">
            <span class="font-mono text-slate-500">#{{ idx + 1 }}</span>
            <span>{{ result.duration }}</span>
          </div>
          <button
            class="flex items-center gap-1.5 text-xs text-accent hover:text-accent/80 transition-colors duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            :disabled="downloadingIdx === idx"
            @click="handleDownload(result.filePath, idx)"
          >
            <Loader
              v-if="downloadingIdx === idx"
              class="w-3.5 h-3.5 animate-spin"
              :stroke-width="1.5"
            />
            <Download v-else class="w-3.5 h-3.5" :stroke-width="1.5" />
            {{ downloadingIdx === idx ? '下载中...' : '下载' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
