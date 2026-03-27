<script setup lang="ts">
import { Zap, Disc3 } from 'lucide-vue-next'
import { useMusicStore } from '@/stores/music'
import TaskCard from './TaskCard.vue'

defineProps<{
  /** 隐藏面板内置的生成按钮（当父级自己提供生成按钮时使用） */
  hideGenerateButton?: boolean
}>()

const store = useMusicStore()
</script>

<template>
  <section class="glass-card p-6 space-y-6" aria-label="音乐生成">
    <!-- Section header -->
    <div class="flex items-center justify-between">
      <h2 class="section-title">
        <Zap class="w-5 h-5 text-accent" :stroke-width="1.5" />
        生成结果
      </h2>
      <div class="flex items-center gap-3">
        <span
          v-if="store.activeTasks.length > 0"
          class="text-xs font-medium text-secondary bg-secondary/10 px-2 py-1 rounded-md"
        >
          {{ store.activeTasks.length }} 个进行中
        </span>
        <button
          v-if="!hideGenerateButton"
          class="btn-primary text-sm py-2.5 px-5"
          :disabled="!store.canGenerate"
          :title="
            store.isGenerating
              ? '当前有任务正在生成'
              : !store.lyrics.trim()
                ? '请先填写歌词'
                : !store.musicCaption.trim()
                  ? '请先填写音乐描述'
                  : ''
          "
          @click="store.startGeneration()"
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

    <!-- Divider -->
    <div class="h-px bg-white/5" />

    <!-- Task list (single column, full width) -->
    <div>
      <p
        v-if="store.tasks.length === 0"
        class="text-center text-sm text-slate-500 py-10"
      >
        暂无生成任务，点击「开始生成」后结果将在这里显示。
      </p>

      <TransitionGroup
        name="task-list"
        tag="div"
        class="space-y-4"
      >
        <TaskCard
          v-for="task in store.tasks"
          :key="task.id"
          :task="task"
          @remove="store.removeTask"
          @abort="store.abortTask"
        />
      </TransitionGroup>
    </div>
  </section>
</template>

<style scoped>
.task-list-enter-active {
  transition: all 0.3s ease-out;
}
.task-list-leave-active {
  transition: all 0.3s ease-in;
}
.task-list-enter-from {
  opacity: 0;
  transform: translateY(-12px);
}
.task-list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
.task-list-move {
  transition: transform 0.3s ease;
}
</style>
