<script setup lang="ts">
import { ref, computed } from 'vue'
import { Upload, X, Music } from 'lucide-vue-next'
import { useMusicStore } from '@/stores/music'

const store = useMusicStore()
const isDragOver = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)

const acceptedTypes = ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/flac', 'audio/mp4']

const hasFile = computed(() => !!store.referenceAudioFile)

function handleDragOver(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = true
}

function handleDragLeave() {
  isDragOver.value = false
}

function handleDrop(e: DragEvent) {
  e.preventDefault()
  isDragOver.value = false
  const file = e.dataTransfer?.files[0]
  if (file && acceptedTypes.includes(file.type)) {
    store.setReferenceAudio(file)
  }
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (file) {
    store.setReferenceAudio(file)
  }
}

function openFilePicker() {
  fileInput.value?.click()
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Label row — matches LyricsEditor / MusicCaption layout -->
    <div class="flex items-center mb-2">
      <label class="label-text mb-0">
        参考音频
        <span class="text-slate-500 font-normal ml-1">（选填）</span>
      </label>
    </div>

    <!-- Upload area — flex-1 to fill available height -->
    <div
      v-if="!hasFile"
      class="relative border-2 border-dashed rounded-xl p-6 text-center transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/50 focus:ring-offset-2 focus:ring-offset-surface flex-1 flex flex-col items-center justify-center"
      :class="[
        isDragOver
          ? 'border-secondary bg-secondary/10'
          : 'border-white/10 hover:border-white/20 hover:bg-white/5',
      ]"
      role="button"
      tabindex="0"
      aria-label="上传参考音频文件"
      @dragover="handleDragOver"
      @dragleave="handleDragLeave"
      @drop="handleDrop"
      @click="openFilePicker"
      @keydown.enter="openFilePicker"
      @keydown.space.prevent="openFilePicker"
    >
      <input
        ref="fileInput"
        type="file"
        :accept="acceptedTypes.join(',')"
        class="hidden"
        @change="handleFileSelect"
      />
      <Upload class="w-8 h-8 text-slate-400 mx-auto mb-3" :stroke-width="1.5" />
      <p class="text-sm text-slate-400">
        拖拽音频文件到此处，或
        <span class="text-secondary font-medium">浏览文件</span>
      </p>
      <p class="text-xs text-slate-500 mt-1">支持 MP3、WAV、OGG、FLAC</p>
    </div>

    <!-- File preview — flex-1 so it fills the same space -->
    <div
      v-else
      class="glass-card p-4 flex items-center gap-4 flex-1"
    >
      <div class="w-10 h-10 rounded-lg bg-secondary/20 flex items-center justify-center flex-shrink-0">
        <Music class="w-5 h-5 text-secondary" :stroke-width="1.5" />
      </div>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-slate-200 truncate">
          {{ store.referenceAudioName }}
        </p>
        <p class="text-xs text-slate-500">
          {{ store.referenceAudioFile ? formatSize(store.referenceAudioFile.size) : '' }}
        </p>
      </div>
      <button
        class="p-1.5 rounded-lg hover:bg-white/10 transition-colors duration-200 cursor-pointer text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/20"
        aria-label="移除参考音频"
        @click="store.clearReferenceAudio()"
      >
        <X class="w-4 h-4" :stroke-width="1.5" />
      </button>
    </div>

    <!-- Bottom spacer — matches the character-count row height in the other columns -->
    <div class="mt-2 h-[1.25rem]" aria-hidden="true" />
  </div>
</template>
