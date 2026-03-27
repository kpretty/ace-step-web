<script setup lang="ts">
import { ref } from 'vue'
import { Layers, RotateCcw, Shuffle } from 'lucide-vue-next'
import { useMusicStore } from '@/stores/music'
import AudioUpload from './AudioUpload.vue'
import LyricsEditor from './LyricsEditor.vue'
import MusicCaption from './MusicCaption.vue'

const store = useMusicStore()

// Track a spinning state separately so we can animate even if the request
// finishes in <16ms (before the next frame). We guarantee at least one full
// rotation (300ms) so the feedback is always visible.
const isSpinning = ref(false)
const randomError = ref('')

async function handleRandomFill() {
  if (isSpinning.value) return
  randomError.value = ''
  isSpinning.value = true

  // Run the spin animation and the API call in parallel; wait for both
  const [result] = await Promise.all([
    store.randomFill('advanced'),
    new Promise<void>((resolve) => setTimeout(resolve, 300)),
  ])

  isSpinning.value = false

  if (!result.ok) {
    randomError.value = result.error ?? '随机失败'
    setTimeout(() => { randomError.value = '' }, 3000)
  }
}
</script>

<template>
  <section class="glass-card p-6" aria-label="音乐原材料">
    <!-- Section header + actions -->
    <div class="flex items-center justify-between mb-6">
      <h2 class="section-title">
        <Layers class="w-5 h-5 text-secondary" :stroke-width="1.5" />
        音乐原材料
      </h2>
      <div class="flex items-center gap-2">
        <!-- Random fill -->
        <button
          class="btn-ghost text-sm py-2 px-4 flex items-center gap-1.5 cursor-pointer"
          :disabled="store.isGenerating || isSpinning"
          aria-label="随机填充创作灵感"
          @click="handleRandomFill"
        >
          <Shuffle
            class="w-3.5 h-3.5"
            :class="{ 'shuffle-spin': isSpinning }"
            :stroke-width="1.5"
          />
          随机一下
        </button>
        <!-- Reset -->
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
    </div>

    <!-- Error hint -->
    <transition name="fade">
      <p v-if="randomError" class="text-xs text-red-400 mb-4 flex items-center gap-1.5" role="alert">
        {{ randomError }}
      </p>
    </transition>

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

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* One full rotation in 300ms, forwards so icon stays at 0° after */
@keyframes shuffle-once {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.shuffle-spin {
  animation: shuffle-once 0.3s ease-in-out forwards;
}
</style>
