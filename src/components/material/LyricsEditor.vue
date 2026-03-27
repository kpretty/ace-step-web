<script setup lang="ts">
import { Loader, Sparkles, Info } from 'lucide-vue-next'
import { useMusicStore } from '@/stores/music'
import { useToast } from '@/composables/useToast'

const store = useMusicStore()
const toast = useToast()

async function handleFormat() {
  const result = await store.formatInputs('lyrics')
  if (result.ok) {
    toast.success('歌词已格式化增强')
  } else {
    toast.error(result.error ?? '格式化失败')
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Label row -->
    <div class="flex items-center justify-between mb-2">
      <div class="flex items-center gap-1.5">
        <label for="lyrics-input" class="label-text mb-0">歌词</label>
        <!-- Info tooltip -->
        <span
          class="relative group inline-flex items-center"
          aria-label="歌词格式说明"
        >
          <Info
            class="w-3.5 h-3.5 text-slate-500 hover:text-slate-300 cursor-default transition-colors duration-150"
            :stroke-width="1.5"
            aria-hidden="true"
          />
          <!-- Tooltip bubble -->
          <span
            class="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-[200px]
                   text-xs text-slate-300 bg-surface-light border border-white/10 rounded-lg px-3 py-2 shadow-xl
                   opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 whitespace-normal leading-relaxed"
            role="tooltip"
          >
            支持 [verse]、[chorus]、[bridge] 段落标签
          </span>
        </span>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg
               bg-secondary/30 text-secondary border border-secondary/50
               hover:bg-secondary/50 hover:border-secondary/70 hover:text-white transition-colors duration-200
               disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer
               focus:outline-none focus:ring-2 focus:ring-secondary/40"
        :disabled="store.isFormatting || !store.lyrics.trim()"
        :title="
          !store.lyrics.trim()
            ? '请先填写歌词'
            : store.isFormatting
              ? '格式化进行中...'
              : '使用 AI 增强格式化歌词内容'
        "
        aria-label="AI 格式化歌词"
        @click="handleFormat"
      >
        <Loader
          v-if="store.isFormatting"
          class="w-3 h-3 animate-spin"
          :stroke-width="1.5"
          aria-hidden="true"
        />
        <Sparkles
          v-else
          class="w-3 h-3"
          :stroke-width="1.5"
          aria-hidden="true"
        />
        {{ store.isFormatting ? '格式化中...' : 'AI 格式化' }}
      </button>
    </div>

    <textarea
      id="lyrics-input"
      v-model="store.lyrics"
      class="input-field min-h-[180px] flex-1 resize-y leading-relaxed font-mono text-sm"
      placeholder="[verse]&#10;在这里输入你的歌词...&#10;每一行为一句歌词&#10;&#10;[chorus]&#10;副歌部分写在这里..."
      spellcheck="false"
    />
    <div class="flex justify-end mt-2">
      <p class="text-xs text-slate-500">{{ store.lyrics.length }} 字符</p>
    </div>
  </div>
</template>

