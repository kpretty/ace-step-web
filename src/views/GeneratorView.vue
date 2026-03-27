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
      <!-- Page heading -->
      <div class="mb-8 text-center sm:text-left">
        <h2 class="text-2xl sm:text-3xl font-bold text-white">
          创作你的音乐
        </h2>
      </div>

      <!-- Vertical layout: Materials → Params → Generation -->
      <div class="space-y-6">
        <!-- 1. Materials -->
        <MaterialPanel />

        <!-- 2. Advanced params (collapsible) -->
        <AdvancedParams />

        <!-- 3. Generation -->
        <GenerationPanel />
      </div>
    </main>
  </div>
</template>
