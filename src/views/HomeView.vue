<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Music4, Sparkles, Layers, Activity, Server, Cpu,
  CheckCircle, XCircle, Clock, ListChecks,
  Loader, Zap, ChevronRight,
} from 'lucide-vue-next'
import AppNavbar from '@/components/common/AppNavbar.vue'
import { fetchHealth, fetchStats } from '@/utils/api'
import type { HealthResult, StatsResult } from '@/utils/api'

const router = useRouter()

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const health = ref<HealthResult | null>(null)
const stats = ref<StatsResult | null>(null)
/** true only during the very first load — used to show skeleton screens */
const initializing = ref(true)
const healthError = ref(false)
const statsError = ref(false)
let refreshTimer: number | null = null

/** Silent refresh: do NOT set loading flags after the first load */
async function refresh() {
  const [healthRes, statsRes] = await Promise.allSettled([
    fetchHealth(),
    fetchStats(),
  ])

  if (healthRes.status === 'fulfilled' && !healthRes.value.error) {
    health.value = healthRes.value.data
    healthError.value = false
  } else {
    healthError.value = true
  }

  if (statsRes.status === 'fulfilled' && !statsRes.value.error) {
    stats.value = statsRes.value.data
    statsError.value = false
  } else {
    statsError.value = true
  }

  initializing.value = false
}

onMounted(() => {
  refresh()
  // Silent auto-refresh every 15 seconds — no loading flash
  refreshTimer = window.setInterval(refresh, 15000)
})

onUnmounted(() => {
  if (refreshTimer !== null) clearInterval(refreshTimer)
})

// ---------------------------------------------------------------------------
// Derived display helpers
// ---------------------------------------------------------------------------

const serviceOnline = computed(() => health.value?.status === 'ok')

const avgJobTime = computed(() => {
  const s = stats.value?.avg_job_seconds
  if (!s || s <= 0) return '—'
  if (s < 60) return `${Math.round(s)} 秒`
  return `${(s / 60).toFixed(1)} 分钟`
})

const queueUsagePct = computed(() => {
  if (!stats.value) return 0
  return Math.round((stats.value.queue_size / stats.value.queue_maxsize) * 100)
})
</script>

<template>
  <div class="min-h-screen relative">
    <!-- Background gradient -->
    <div class="fixed inset-0 pointer-events-none" aria-hidden="true">
      <div class="absolute top-0 left-1/3 w-[700px] h-[500px] bg-secondary/8 rounded-full blur-[140px]" />
      <div class="absolute bottom-0 right-1/4 w-[500px] h-[400px] bg-accent/5 rounded-full blur-[120px]" />
    </div>

    <AppNavbar />

    <main class="relative z-10 pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">

      <!-- ===== Hero ===== -->
      <div class="mb-10">
        <div class="flex items-center gap-3 mb-3">
          <div class="w-12 h-12 rounded-2xl bg-secondary/20 flex items-center justify-center">
            <Music4 class="w-6 h-6 text-secondary" :stroke-width="1.5" />
          </div>
          <div>
            <h2 class="text-3xl font-bold text-white leading-tight">ACE Step</h2>
            <p class="text-sm text-slate-400">AI 音乐生成平台</p>
          </div>
        </div>
      </div>

      <!-- ===== Quick actions ===== -->
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <!-- Describe mode -->
        <button
          class="glass-card glass-card-hover p-6 text-left cursor-pointer group focus:outline-none focus:ring-2 focus:ring-secondary/50"
          @click="router.push('/describe')"
        >
          <div class="flex items-start justify-between mb-4">
            <div class="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center group-hover:bg-accent/25 transition-colors duration-200">
              <Sparkles class="w-5 h-5 text-accent" :stroke-width="1.5" />
            </div>
            <ChevronRight class="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-200" :stroke-width="2" />
          </div>
          <h3 class="text-base font-semibold text-white mb-1">描述驱动生成</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            用自然语言描述你想要的音乐风格、情感和内容，AI 自动完成创作。
          </p>
          <div class="mt-4 flex items-center gap-1.5 text-xs text-accent font-medium">
            <Zap class="w-3 h-3" :stroke-width="2" />
            快速开始
          </div>
        </button>

        <!-- Advanced mode -->
        <button
          class="glass-card glass-card-hover p-6 text-left cursor-pointer group focus:outline-none focus:ring-2 focus:ring-secondary/50"
          @click="router.push('/generator')"
        >
          <div class="flex items-start justify-between mb-4">
            <div class="w-10 h-10 rounded-xl bg-secondary/15 flex items-center justify-center group-hover:bg-secondary/25 transition-colors duration-200">
              <Layers class="w-5 h-5 text-secondary" :stroke-width="1.5" />
            </div>
            <ChevronRight class="w-4 h-4 text-slate-600 group-hover:text-slate-400 group-hover:translate-x-0.5 transition-all duration-200" :stroke-width="2" />
          </div>
          <h3 class="text-base font-semibold text-white mb-1">进阶创作</h3>
          <p class="text-xs text-slate-400 leading-relaxed">
            手动填写歌词、音乐描述，配合 BPM、调性等精细参数，全面掌控生成结果。
          </p>
          <div class="mt-4 flex items-center gap-1.5 text-xs text-secondary font-medium">
            <Zap class="w-3 h-3" :stroke-width="2" />
            精细创作
          </div>
        </button>
      </div>

      <!-- ===== Service status + Stats ===== -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">

        <!-- Health card -->
        <section class="glass-card p-6 space-y-5" aria-label="服务健康状态">
          <div class="flex items-center justify-between">
            <h3 class="section-title">
              <Activity class="w-5 h-5 text-secondary" :stroke-width="1.5" />
              服务状态
            </h3>
            <!-- Online badge -->
            <div v-if="!initializing && !healthError" class="flex items-center gap-1.5">
              <span
                class="w-2 h-2 rounded-full"
                :class="serviceOnline ? 'bg-accent animate-pulse' : 'bg-red-400'"
              />
              <span
                class="text-xs font-medium"
                :class="serviceOnline ? 'text-accent' : 'text-red-400'"
              >
                {{ serviceOnline ? '运行中' : '异常' }}
              </span>
            </div>
            <Loader v-else-if="initializing" class="w-4 h-4 text-slate-500 animate-spin" :stroke-width="1.5" />
          </div>

          <!-- Loading skeleton -->
          <div v-if="initializing" class="space-y-3">
            <div v-for="i in 4" :key="i" class="h-10 bg-white/5 rounded-lg animate-pulse" />
          </div>

          <!-- Error -->
          <div v-else-if="healthError" class="flex items-center gap-2 text-sm text-red-400 bg-red-400/5 border border-red-400/10 rounded-lg px-4 py-3">
            <XCircle class="w-4 h-4 flex-shrink-0" :stroke-width="1.5" />
            无法连接服务端，请检查 API 设置
          </div>

          <!-- Data -->
          <div v-else-if="health" class="space-y-3">
            <!-- Service & version -->
            <div class="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-lg px-4 py-3">
              <div class="flex items-center gap-2.5 text-sm text-slate-300">
                <Server class="w-4 h-4 text-slate-500" :stroke-width="1.5" />
                服务名称
              </div>
              <span class="text-sm font-medium text-white">
                {{ health.service }}
                <span class="text-xs text-slate-500 ml-1.5">v{{ health.version }}</span>
              </span>
            </div>

            <!-- DiT model -->
            <div class="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-lg px-4 py-3">
              <div class="flex items-center gap-2.5 text-sm text-slate-300">
                <Cpu class="w-4 h-4 text-slate-500" :stroke-width="1.5" />
                DiT 模型
              </div>
              <div class="flex items-center gap-2">
                <CheckCircle v-if="health.models_initialized" class="w-3.5 h-3.5 text-accent" :stroke-width="2" />
                <XCircle v-else class="w-3.5 h-3.5 text-red-400" :stroke-width="2" />
                <span class="text-sm text-slate-300 font-mono">
                  {{ health.loaded_model ?? '未加载' }}
                </span>
              </div>
            </div>

            <!-- LM model -->
            <div class="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-lg px-4 py-3">
              <div class="flex items-center gap-2.5 text-sm text-slate-300">
                <Sparkles class="w-4 h-4 text-slate-500" :stroke-width="1.5" />
                LM 模型
              </div>
              <div class="flex items-center gap-2">
                <CheckCircle v-if="health.llm_initialized" class="w-3.5 h-3.5 text-accent" :stroke-width="2" />
                <XCircle v-else class="w-3.5 h-3.5 text-slate-600" :stroke-width="2" />
                <span class="text-sm text-slate-300 font-mono">
                  {{ health.loaded_lm_model ?? (health.llm_initialized ? '已加载' : '未加载') }}
                </span>
              </div>
            </div>
          </div>
        </section>

        <!-- Stats card -->
        <section class="glass-card p-6 space-y-5" aria-label="任务队列统计">
          <h3 class="section-title">
            <ListChecks class="w-5 h-5 text-secondary" :stroke-width="1.5" />
            任务统计
          </h3>

          <!-- Loading skeleton -->
          <div v-if="initializing" class="space-y-3">
            <div v-for="i in 4" :key="i" class="h-10 bg-white/5 rounded-lg animate-pulse" />
          </div>

          <!-- Error -->
          <div v-else-if="statsError" class="flex items-center gap-2 text-sm text-red-400 bg-red-400/5 border border-red-400/10 rounded-lg px-4 py-3">
            <XCircle class="w-4 h-4 flex-shrink-0" :stroke-width="1.5" />
            无法获取统计数据
          </div>

          <!-- Data -->
          <div v-else-if="stats" class="space-y-4">
            <!-- Job counters grid -->
            <div class="grid grid-cols-2 gap-3">
              <div class="bg-white/[0.03] border border-white/5 rounded-lg px-4 py-3">
                <p class="text-[11px] text-slate-500 mb-1">累计任务</p>
                <p class="text-2xl font-bold text-white font-mono">{{ stats.jobs.total }}</p>
              </div>
              <div class="bg-white/[0.03] border border-white/5 rounded-lg px-4 py-3">
                <p class="text-[11px] text-slate-500 mb-1">成功完成</p>
                <p class="text-2xl font-bold text-accent font-mono">{{ stats.jobs.succeeded }}</p>
              </div>
              <div class="bg-white/[0.03] border border-white/5 rounded-lg px-4 py-3">
                <p class="text-[11px] text-slate-500 mb-1">排队中</p>
                <p class="text-2xl font-bold text-secondary font-mono">{{ stats.jobs.queued }}</p>
              </div>
              <div class="bg-white/[0.03] border border-white/5 rounded-lg px-4 py-3">
                <p class="text-[11px] text-slate-500 mb-1">失败</p>
                <p class="text-2xl font-bold font-mono" :class="stats.jobs.failed > 0 ? 'text-red-400' : 'text-slate-500'">
                  {{ stats.jobs.failed }}
                </p>
              </div>
            </div>

            <!-- Average time -->
            <div class="flex items-center justify-between bg-white/[0.03] border border-white/5 rounded-lg px-4 py-3">
              <div class="flex items-center gap-2.5 text-sm text-slate-300">
                <Clock class="w-4 h-4 text-slate-500" :stroke-width="1.5" />
                平均生成时长
              </div>
              <span class="text-sm font-medium text-white font-mono">{{ avgJobTime }}</span>
            </div>

            <!-- Queue usage bar -->
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-[11px] text-slate-500">队列占用</span>
                <span class="text-[11px] font-mono text-slate-400">
                  {{ stats.queue_size }} / {{ stats.queue_maxsize }}
                </span>
              </div>
              <div class="h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-500"
                  :class="queueUsagePct > 80 ? 'bg-red-400' : queueUsagePct > 40 ? 'bg-yellow-400' : 'bg-accent'"
                  :style="{ width: `${queueUsagePct}%` }"
                />
              </div>
            </div>
          </div>
        </section>

      </div>
    </main>
  </div>
</template>
