<script setup lang="ts">
import { ref } from 'vue'
import { Music4, Settings, X, ExternalLink } from 'lucide-vue-next'
import { getApiSettings, updateApiSettings } from '@/utils/api'

const showSettings = ref(false)
const settings = getApiSettings()

function handleBaseUrlInput(e: Event) {
  updateApiSettings({ baseUrl: (e.target as HTMLInputElement).value })
}

function handleApiKeyInput(e: Event) {
  updateApiSettings({ apiKey: (e.target as HTMLInputElement).value })
}
</script>

<template>
  <header class="fixed top-4 left-4 right-4 z-50">
    <nav class="glass-card px-6 py-3 flex items-center justify-between max-w-7xl mx-auto" aria-label="主导航">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 rounded-xl bg-secondary/20 flex items-center justify-center">
          <Music4 class="w-5 h-5 text-secondary" :stroke-width="1.5" />
        </div>
        <div>
          <h1 class="text-base font-bold text-white leading-tight">ACE Step</h1>
          <p class="text-[11px] text-slate-400 leading-tight">AI 音乐生成</p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <span class="text-xs font-medium text-accent bg-accent/10 px-2.5 py-1 rounded-full">
          v1.0
        </span>
        <!-- Settings button -->
        <button
          class="p-2 rounded-lg hover:bg-white/10 transition-colors duration-200 cursor-pointer text-slate-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-secondary/30"
          aria-label="API 设置"
          @click="showSettings = !showSettings"
        >
          <Settings class="w-4.5 h-4.5" :stroke-width="1.5" />
        </button>
      </div>
    </nav>

    <!-- Settings panel (dropdown below navbar) -->
    <transition name="settings">
      <div
        v-if="showSettings"
        class="absolute right-4 top-full mt-2 w-full max-w-sm"
      >
        <div class="glass-card border border-white/10 p-5 space-y-4 shadow-2xl">
          <!-- Header -->
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-semibold text-white flex items-center gap-2">
              <Settings class="w-4 h-4 text-secondary" :stroke-width="1.5" />
              API 设置
            </h3>
            <button
              class="p-1 rounded-md hover:bg-white/10 transition-colors duration-200 cursor-pointer text-slate-400 hover:text-white focus:outline-none"
              aria-label="关闭设置"
              @click="showSettings = false"
            >
              <X class="w-4 h-4" :stroke-width="2" />
            </button>
          </div>

          <!-- Base URL -->
          <div>
            <label for="api-base-url" class="label-text text-xs">
              服务地址
              <span class="text-slate-600 font-normal ml-1">(Base URL)</span>
            </label>
            <input
              id="api-base-url"
              type="url"
              class="input-field text-sm"
              placeholder="http://localhost:8001"
              :value="settings.baseUrl"
              @input="handleBaseUrlInput"
            />
          </div>

          <!-- API Key -->
          <div>
            <label for="api-key" class="label-text text-xs">
              认证密钥
              <span class="text-slate-600 font-normal ml-1">(API Key)</span>
            </label>
            <input
              id="api-key"
              type="password"
              class="input-field text-sm"
              placeholder="留空则不认证"
              :value="settings.apiKey"
              @input="handleApiKeyInput"
            />
          </div>

          <!-- Hint -->
          <p class="text-[11px] text-slate-500 flex items-start gap-1.5">
            <ExternalLink class="w-3 h-3 mt-0.5 flex-shrink-0" :stroke-width="1.5" />
            <span>
              设置自动保存到浏览器。需要运行
              <a
                href="https://github.com/ace-step/ACE-Step-1.5"
                target="_blank"
                rel="noopener noreferrer"
                class="text-secondary hover:underline"
              >ACE-Step 后端</a>
              服务。
            </span>
          </p>
        </div>
      </div>
    </transition>
  </header>
</template>

<style scoped>
.settings-enter-active {
  transition: all 0.2s ease-out;
}
.settings-leave-active {
  transition: all 0.15s ease-in;
}
.settings-enter-from,
.settings-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}
</style>
