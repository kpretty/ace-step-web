<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { Settings2, ChevronDown, RotateCcw } from 'lucide-vue-next'
import { useMusicStore } from '@/stores/music'
import { listModels } from '@/utils/api'
import SelectField from './SelectField.vue'
import SegmentedControl from './SegmentedControl.vue'
import NumberStepper from './NumberStepper.vue'

const store = useMusicStore()
const isExpanded = ref(false)

function toggleExpanded() {
  isExpanded.value = !isExpanded.value
}

// Auto-expand when formatInputs() updates params
watch(
  () => store.shouldExpandParams,
  (val) => {
    if (val) {
      isExpanded.value = true
      store.shouldExpandParams = false
    }
  },
)

// Count how many params differ from defaults
const activeCount = computed(() => {
  const p = store.advancedParams
  let count = 0
  if (p.model) count++
  if (p.vocalLanguage !== 'zh') count++
  if (p.audioFormat !== 'mp3') count++
  if (p.bpm !== null) count++
  if (p.keyScale) count++
  if (p.timeSignature) count++
  if (p.audioDuration !== null) count++
  if (p.batchSize !== 1) count++
  return count
})

// Dynamic model options (fetched from API)
// The first entry (value='') acts as the "default" placeholder rendered by SelectField.
// Do NOT add a separate placeholder prop to avoid a duplicate empty option.
const modelOptions = ref([
  { value: '', label: '默认模型' },
])

onMounted(async () => {
  try {
    const res = await listModels()
    if (!res.error && res.data?.models?.length) {
      modelOptions.value = [
        { value: '', label: '默认模型' },
        // Strip the redundant " (默认)" suffix — the first entry already represents the default
        ...res.data.models.map((m) => ({
          value: m.name,
          label: m.name,
        })),
      ]
    }
  } catch {
    // Silently fall back to default-only option
  }
})

const languageOptions = [
  { value: 'zh', label: '中文' },
  { value: 'en', label: 'English' },
  { value: 'ja', label: '日本語' },
  { value: 'ko', label: '한국어' },
]

const formatOptions = [
  { value: 'mp3', label: 'MP3' },
  { value: 'wav', label: 'WAV' },
  { value: 'flac', label: 'FLAC' },
]

const timeSignatureOptions = [
  { value: '', label: '自动' },
  { value: '2', label: '2/4' },
  { value: '3', label: '3/4' },
  { value: '4', label: '4/4' },
  { value: '6', label: '6/8' },
]

const keyOptions = [
  { value: '', label: '自动' },
  { value: 'C Major', label: 'C Major' },
  { value: 'C Minor', label: 'C Minor' },
  { value: 'D Major', label: 'D Major' },
  { value: 'D Minor', label: 'D Minor' },
  { value: 'E Major', label: 'E Major' },
  { value: 'E Minor', label: 'E Minor' },
  { value: 'F Major', label: 'F Major' },
  { value: 'F Minor', label: 'F Minor' },
  { value: 'G Major', label: 'G Major' },
  { value: 'G Minor', label: 'G Minor' },
  { value: 'A Major', label: 'A Major' },
  { value: 'A Minor', label: 'A Minor' },
  { value: 'B Major', label: 'B Major' },
  { value: 'B Minor', label: 'B Minor' },
  { value: 'Bb Major', label: 'Bb Major' },
  { value: 'Bb Minor', label: 'Bb Minor' },
  { value: 'Eb Major', label: 'Eb Major' },
  { value: 'Eb Minor', label: 'Eb Minor' },
  { value: 'Ab Major', label: 'Ab Major' },
  { value: 'F# Minor', label: 'F# Minor' },
]

function handleDurationInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  if (raw === '') {
    store.advancedParams.audioDuration = null
    return
  }
  const num = Number(raw)
  if (!isNaN(num)) {
    store.advancedParams.audioDuration = Math.max(10, Math.min(600, num))
  }
}
</script>

<template>
  <section class="glass-card overflow-hidden transition-all duration-300">
    <!-- Collapse trigger bar -->
    <button
      class="w-full flex items-center justify-between px-6 py-4 cursor-pointer hover:bg-white/[0.03] transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-secondary/30 focus:ring-inset"
      :aria-expanded="isExpanded"
      aria-controls="advanced-params-content"
      @click="toggleExpanded"
    >
      <div class="flex items-center gap-2">
        <Settings2 class="w-5 h-5 text-slate-400" :stroke-width="1.5" />
        <span class="text-sm font-medium text-slate-300">可选参数</span>
        <span
          v-if="activeCount > 0"
          class="text-[11px] font-medium text-secondary bg-secondary/15 px-1.5 py-0.5 rounded"
        >
          {{ activeCount }} 项已配置
        </span>
      </div>
      <ChevronDown
        class="w-4 h-4 text-slate-500 transition-transform duration-300"
        :class="{ 'rotate-180': isExpanded }"
        :stroke-width="2"
      />
    </button>

    <!-- Expandable content -->
    <transition name="collapse">
      <div
        v-show="isExpanded"
        id="advanced-params-content"
      >
        <div class="border-t border-white/5 px-6 pt-5 pb-6 space-y-6">

          <!-- Group 1: 模型与输出 -->
          <div>
            <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">模型与输出</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
              <!-- Model -->
              <div>
                <label for="param-model" class="label-text text-xs">模型</label>
                <SelectField
                  id="param-model"
                  v-model="store.advancedParams.model"
                  :options="modelOptions"
                />
              </div>

              <!-- Audio format -->
              <div>
                <label class="label-text text-xs">输出格式</label>
                <SegmentedControl
                  v-model="store.advancedParams.audioFormat"
                  :options="formatOptions"
                />
              </div>

              <!-- Batch size -->
              <div>
                <label class="label-text text-xs">批量生成</label>
                <NumberStepper
                  v-model="store.advancedParams.batchSize"
                  :min="1"
                  :max="8"
                />
              </div>

              <!-- Vocal language -->
              <div>
                <label class="label-text text-xs">歌词语言</label>
                <SelectField
                  v-model="store.advancedParams.vocalLanguage"
                  :options="languageOptions"
                />
              </div>
            </div>
          </div>

          <!-- Group 2: 音乐参数 -->
          <div>
            <h3 class="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">音乐参数</h3>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-x-5 gap-y-4">
              <!-- BPM -->
              <div>
                <label class="label-text text-xs">BPM 节奏</label>
                <NumberStepper
                  v-model="store.advancedParams.bpm"
                  :min="30"
                  :max="300"
                  :step="5"
                  :nullable="true"
                  placeholder="自动"
                />
              </div>

              <!-- Key scale -->
              <div>
                <label class="label-text text-xs">调性</label>
                <SelectField
                  v-model="store.advancedParams.keyScale"
                  :options="keyOptions"
                />
              </div>

              <!-- Time signature -->
              <div>
                <label class="label-text text-xs">拍号</label>
                <SegmentedControl
                  v-model="store.advancedParams.timeSignature"
                  :options="timeSignatureOptions"
                />
              </div>

              <!-- Audio duration -->
              <div>
                <label for="param-duration" class="label-text text-xs">
                  生成时长
                  <span class="text-slate-600 font-normal ml-1">
                    {{ store.advancedParams.audioDuration ? `${store.advancedParams.audioDuration}s` : '' }}
                  </span>
                </label>
                <div class="flex items-center gap-2">
                  <input
                    id="param-duration"
                    type="range"
                    class="flex-1 h-1.5 accent-secondary cursor-pointer"
                    :value="store.advancedParams.audioDuration ?? 60"
                    min="10"
                    max="600"
                    step="5"
                    @input="(e: Event) => { store.advancedParams.audioDuration = Number((e.target as HTMLInputElement).value) }"
                  />
                  <input
                    type="text"
                    inputmode="numeric"
                    class="w-14 h-8 text-center bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-slate-300 outline-none focus:border-secondary/50 placeholder-slate-600"
                    :value="store.advancedParams.audioDuration ?? ''"
                    placeholder="自动"
                    @change="handleDurationInput"
                  />
                </div>
              </div>
            </div>
          </div>

          <!-- Reset button -->
          <div class="flex justify-end pt-1">
            <button
              class="btn-ghost text-xs py-1.5 px-3"
              :disabled="activeCount === 0"
              @click="store.resetAdvancedParams()"
            >
              <RotateCcw class="w-3.5 h-3.5" :stroke-width="1.5" />
              重置参数
            </button>
          </div>
        </div>
      </div>
    </transition>
  </section>
</template>

<style scoped>
.collapse-enter-active {
  transition: all 0.3s ease-out;
  overflow: hidden;
}
.collapse-leave-active {
  transition: all 0.25s ease-in;
  overflow: hidden;
}
.collapse-enter-from,
.collapse-leave-to {
  opacity: 0;
  max-height: 0;
}
.collapse-enter-to,
.collapse-leave-from {
  opacity: 1;
  max-height: 500px;
}
</style>
