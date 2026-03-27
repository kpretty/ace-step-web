<script setup lang="ts">
import { ref, computed } from 'vue'
import { Sparkles, Disc3, RotateCcw, Shuffle } from 'lucide-vue-next'
import AppNavbar from '@/components/common/AppNavbar.vue'
import GenerationPanel from '@/components/generation/GenerationPanel.vue'
import { useMusicStore } from '@/stores/music'

const store = useMusicStore()

const sampleQuery = computed({
  get: () => store.sampleQuery,
  set: (v: string) => { store.sampleQuery = v },
})

const canGenerate = computed(
  () => store.sampleQuery.trim().length > 0 && !store.isGenerating,
)

const isSpinning = ref(false)
const randomError = ref('')

async function handleRandomFill() {
  if (isSpinning.value) return
  randomError.value = ''
  isSpinning.value = true

  const [result] = await Promise.all([
    store.randomFill('describe'),
    new Promise<void>((resolve) => setTimeout(resolve, 300)),
  ])

  isSpinning.value = false

  if (!result.ok) {
    randomError.value = result.error ?? '随机失败'
    setTimeout(() => { randomError.value = '' }, 3000)
  }
}

async function handleGenerate() {
  if (!canGenerate.value) return
  await store.startDescriptionGeneration({
    sampleQuery: store.sampleQuery.trim(),
  })
}
</script>

<template>
  <div class="min-h-screen relative">
    <!-- Background gradient overlay -->
    <div
      class="fixed inset-0 pointer-events-none"
      aria-hidden="true"
    >
      <div class="absolute top-0 right-1/4 w-[600px] h-[600px] bg-secondary/8 rounded-full blur-[128px]" />
      <div class="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
    </div>

    <!-- Navbar -->
    <AppNavbar />

    <!-- Main content -->
    <main class="relative z-10 pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" aria-label="描述驱动生成">
      <p class="text-sm text-slate-400 mb-6">输入一段自然语言，AI 自动生成歌词、编曲参数，直接出音频。</p>
      <div class="space-y-6">
        <!-- Input card -->
        <section class="glass-card p-6 space-y-5" aria-label="音乐描述输入">
          <h3 class="section-title">
            <Sparkles class="w-5 h-5 text-accent" :stroke-width="1.5" />
            描述你的音乐
          </h3>

          <!-- Natural language query -->
          <div>
            <label for="sample-query" class="label-text mb-2 block">
              音乐描述
              <span class="text-slate-500 font-normal ml-1">（自然语言）</span>
            </label>
            <textarea
              id="sample-query"
              v-model="sampleQuery"
              rows="5"
              class="input-field resize-none leading-relaxed w-full"
              placeholder="例如：一首轻快的流行歌曲，带有吉他和钢琴，适合夏日午后，歌词关于海边旅行和自由…"
            />
          </div>

          <!-- Action row -->
          <div class="space-y-3 pt-1">
            <!-- Error hint -->
            <transition name="fade">
              <p v-if="randomError" class="text-xs text-red-400 flex items-center gap-1.5" role="alert">
                {{ randomError }}
              </p>
            </transition>

            <div class="flex items-center justify-between">
              <!-- Left: Reset + Random -->
              <div class="flex items-center gap-2">
                <button
                  class="btn-ghost text-sm py-2 px-4 flex items-center gap-1.5 cursor-pointer"
                  :disabled="store.isGenerating"
                  aria-label="重置"
                  @click="store.resetDescribeQuery()"
                >
                  <RotateCcw class="w-3.5 h-3.5" :stroke-width="1.5" />
                  重置
                </button>
                <button
                  class="btn-ghost text-sm py-2 px-4 flex items-center gap-1.5 cursor-pointer"
                  :disabled="store.isGenerating || isSpinning"
                  aria-label="随机填充音乐描述"
                  @click="handleRandomFill"
                >
                  <Shuffle
                    class="w-3.5 h-3.5"
                    :class="{ 'shuffle-spin': isSpinning }"
                    :stroke-width="1.5"
                  />
                  随机一下
                </button>
              </div>

              <!-- Right: Generate -->
              <button
                class="btn-primary text-sm py-2.5 px-6"
                :disabled="!canGenerate"
                :title="
                  store.isGenerating
                    ? '当前有任务正在生成'
                    : !sampleQuery.trim()
                      ? '请先输入音乐描述'
                      : ''
                "
                @click="handleGenerate"
              >
                <Disc3
                  class="w-4 h-4"
                  :class="{ 'animate-spin': store.isGenerating }"
                  :stroke-width="1.5"
                />
                {{ store.isGenerating ? '生成中...' : '开始生成' }}
              </button>
            </div>
          </div>
        </section>

        <!-- Generation results — reuse GenerationPanel, hide its own generate button -->
        <GenerationPanel :hide-generate-button="true" mode="describe" />
      </div>
    </main>
  </div>
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

@keyframes shuffle-once {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.shuffle-spin {
  animation: shuffle-once 0.3s ease-in-out forwards;
}
</style>
