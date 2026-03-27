<script setup lang="ts">
import { ref, toRef } from 'vue'
import { Play, Pause, Download, Loader } from 'lucide-vue-next'
import type { AudioResult } from '@/stores/music'
import { fetchAudioBlob } from '@/utils/api'
import { useAudioPlayer } from '@/composables/useAudioPlayer'
import AudioWaveform from './AudioWaveform.vue'

const props = defineProps<{
  result: AudioResult
  index: number
  total: number
}>()

const audioUrl = toRef(() => props.result.url)
const player = useAudioPlayer(audioUrl)

const isDownloading = ref(false)

async function handleDownload() {
  if (isDownloading.value) return
  isDownloading.value = true
  try {
    const { blobUrl, filename } = await fetchAudioBlob(props.result.filePath)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5000)
  } catch (err) {
    console.error('下载失败', err)
  } finally {
    isDownloading.value = false
  }
}
</script>

<template>
  <div class="space-y-1">
    <!-- Track label (only shown when multiple results) -->
    <p v-if="total > 1" class="text-[11px] text-slate-500 px-1">
      版本 {{ index + 1 }}
      <span v-if="result.duration" class="ml-1.5 text-slate-600">{{ result.duration }}</span>
    </p>

    <!-- Player row: waveform + controls -->
    <div class="grid grid-cols-12 gap-3 items-center">
      <!-- Waveform area: col-span-10 -->
      <div class="col-span-10">
        <div class="flex items-center gap-3">
          <!-- Play / Pause -->
          <button
            class="w-9 h-9 rounded-full bg-secondary/20 flex items-center justify-center flex-shrink-0 hover:bg-secondary/30 transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/50"
            :aria-label="player.isPlaying.value ? '暂停' : '播放'"
            @click="player.toggle()"
          >
            <Pause v-if="player.isPlaying.value" class="w-4 h-4 text-secondary" :stroke-width="2" />
            <Play v-else class="w-4 h-4 text-secondary ml-0.5" :stroke-width="2" />
          </button>

          <!-- Waveform + timestamps -->
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

      <!-- Controls: col-span-2 -->
      <div class="col-span-2 flex flex-col items-center gap-2">
        <!-- Speed toggle -->
        <button
          class="w-full h-8 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-mono font-medium text-slate-300 hover:text-white transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20"
          aria-label="切换播放速度"
          @click="player.cycleRate()"
        >
          {{ player.playbackRate.value }}x
        </button>

        <!-- Download -->
        <button
          class="w-full h-8 rounded-lg bg-accent/10 hover:bg-accent/20 border border-accent/20 flex items-center justify-center transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-accent/30 disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="下载音频"
          :disabled="isDownloading"
          @click="handleDownload"
        >
          <Loader
            v-if="isDownloading"
            class="w-4 h-4 text-accent animate-spin"
            :stroke-width="1.5"
          />
          <Download v-else class="w-4 h-4 text-accent" :stroke-width="1.5" />
        </button>
      </div>
    </div>
  </div>
</template>
