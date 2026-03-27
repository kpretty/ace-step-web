<script setup lang="ts">
import { Loader, Sparkles } from 'lucide-vue-next'
import { useMusicStore } from '@/stores/music'
import { useToast } from '@/composables/useToast'

const store = useMusicStore()
const toast = useToast()

const placeholderText =
  '描述音乐风格、情绪和乐器。例如："梦幻的 lo-fi 节拍，柔和的钢琴、温暖的贝斯和轻柔的黑胶噪音。节奏 85 BPM，放松而忧郁的氛围。"'

async function handleFormat() {
  const result = await store.formatInputs('caption')
  if (result.ok) {
    toast.success(result.paramsUpdated ? '音乐描述已增强，BPM、调性等参数已同步更新' : '音乐描述已格式化增强')
  } else {
    toast.error(result.error ?? '格式化失败')
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Label row -->
    <div class="flex items-center justify-between mb-2">
      <label for="caption-input" class="label-text mb-0">
        音乐描述
      </label>
      <button
        type="button"
        class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg
               bg-secondary/30 text-secondary border border-secondary/50
               hover:bg-secondary/50 hover:border-secondary/70 hover:text-white transition-colors duration-200
               disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer
               focus:outline-none focus:ring-2 focus:ring-secondary/40"
        :disabled="store.isFormatting || !store.musicCaption.trim()"
        :title="
          !store.musicCaption.trim()
            ? '请先填写音乐描述'
            : store.isFormatting
              ? '格式化进行中...'
              : '使用 AI 增强格式化音乐描述'
        "
        aria-label="AI 格式化歌词与音乐描述"
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
      id="caption-input"
      v-model="store.musicCaption"
      class="input-field min-h-[180px] flex-1 resize-y leading-relaxed text-sm"
      :placeholder="placeholderText"
    />
    <div class="flex justify-end mt-2">
      <p class="text-xs text-slate-500">{{ store.musicCaption.length }} 字符</p>
    </div>
  </div>
</template>

