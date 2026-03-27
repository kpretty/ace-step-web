<script setup lang="ts">
import { Layers, RotateCcw } from 'lucide-vue-next'
import { useMusicStore } from '@/stores/music'
import AudioUpload from './AudioUpload.vue'
import LyricsEditor from './LyricsEditor.vue'
import MusicCaption from './MusicCaption.vue'

const store = useMusicStore()
</script>

<template>
  <section class="glass-card p-6" aria-label="音乐原材料">
    <!-- Section header + Reset -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="section-title">
        <Layers class="w-5 h-5 text-secondary" :stroke-width="1.5" />
        音乐原材料
      </h2>
      <button
        class="btn-ghost text-sm py-2 px-4 flex items-center gap-1.5 cursor-pointer"
        :disabled="store.isGenerating"
        aria-label="重置原材料"
        @click="store.clearMaterials()"
      >
        <RotateCcw class="w-3.5 h-3.5" :stroke-width="1.5" />
        重置
      </button>
    </div>

    <!-- Horizontal layout: Audio | Lyrics | Caption -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
      <!-- Audio upload -->
      <AudioUpload />

      <!-- Lyrics -->
      <LyricsEditor />

      <!-- Music caption -->
      <MusicCaption />
    </div>
  </section>
</template>
