<script setup lang="ts">
import { Layers } from 'lucide-vue-next'
import AudioUpload from './AudioUpload.vue'
import LyricsEditor from './LyricsEditor.vue'
import MusicCaption from './MusicCaption.vue'
import SaveTemplate from './SaveTemplate.vue'
</script>

<template>
  <section class="glass-card p-6" aria-label="音乐原材料">
    <!-- Section header + Save template -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="section-title">
        <Layers class="w-5 h-5 text-secondary" :stroke-width="1.5" />
        音乐原材料
      </h2>
      <SaveTemplate />
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
