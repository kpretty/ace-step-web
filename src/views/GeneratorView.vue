<script setup lang="ts">
import AppNavbar from '@/components/common/AppNavbar.vue'
import MaterialPanel from '@/components/material/MaterialPanel.vue'
import AdvancedParams from '@/components/params/AdvancedParams.vue'
import GenerationPanel from '@/components/generation/GenerationPanel.vue'
</script>

<template>
  <div class="min-h-screen relative">
    <!-- Background gradient overlay -->
    <div
      class="fixed inset-0 pointer-events-none"
      aria-hidden="true"
    >
      <div class="absolute top-0 left-1/4 w-[600px] h-[600px] bg-secondary/8 rounded-full blur-[128px]" />
      <div class="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-accent/5 rounded-full blur-[100px]" />
    </div>

    <!-- Navbar -->
    <AppNavbar />

    <!-- Main content -->
    <main class="relative z-10 pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" aria-label="音乐生成器">
      <p class="text-sm text-slate-400 mb-6">手动填写歌词与音乐描述，精细调节 BPM、调性、时长等参数，全面掌控每一次生成。</p>
      <!-- Vertical layout: Materials → Params → Generation -->
      <div class="space-y-6">
        <!-- 1. Materials -->
        <MaterialPanel />

        <!-- 2. Advanced params (collapsible) -->
        <AdvancedParams />

        <!-- 3. Generation -->
        <GenerationPanel mode="advanced" />
      </div>
    </main>
  </div>
</template>
