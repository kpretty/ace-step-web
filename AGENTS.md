# AGENTS.md — ACE Step Web

AI 音乐生成前端。Vue 3 + TypeScript + Vite + Tailwind CSS，暗色玻璃拟态风格，界面语言简体中文 (zh-CN)。

## Build & Verification Commands

```bash
npm run dev           # 启动开发服务器 (localhost:5173, auto-open)
npm run build         # vue-tsc 类型检查 + vite 生产构建（两步均须通过）
npm run preview       # 预览生产构建产物
npx vue-tsc --noEmit  # 仅做类型检查，不输出文件
```

**无 ESLint / Prettier / Vitest / Playwright。** 类型正确性唯一保障是 `vue-tsc --noEmit`（strict 模式）。  
每次修改后必须运行 `npx vue-tsc --noEmit`，确保零错误后再运行 `npm run build`。

## Tech Stack

| Layer     | Technology                                   |
|-----------|----------------------------------------------|
| Framework | Vue 3.4+ (`<script setup>` Composition API)  |
| Language  | TypeScript 5.x (`strict: true`)              |
| Build     | Vite 5.x                                     |
| State     | Pinia 2.x (Setup Store style)                |
| Routing   | Vue Router 4.x (history mode, lazy imports)  |
| CSS       | Tailwind CSS 3.x (dark-first, custom tokens) |
| Icons     | lucide-vue-next (tree-shakable, named import) |
| Utilities | @vueuse/core                                 |
| Font      | Plus Jakarta Sans (Google Fonts)             |

## Project Structure

```
src/
├── main.ts                      # createApp + Pinia + Router + CSS
├── App.vue                      # 根组件 (仅 RouterView)
├── components/
│   ├── common/AppNavbar.vue     # 顶栏 + API 设置下拉面板
│   ├── generation/              # GenerationPanel, TaskCard, AudioWaveform
│   ├── material/                # MaterialPanel, AudioUpload, LyricsEditor,
│   │                            #   MusicCaption, SaveTemplate
│   └── params/                  # AdvancedParams, SelectField,
│                                #   SegmentedControl, NumberStepper
├── composables/useAudioPlayer.ts
├── router/index.ts
├── stores/music.ts              # 唯一 Pinia store
├── styles/main.css              # Tailwind @layer base/components
├── utils/api.ts                 # API 客户端（所有后端通信）
└── views/GeneratorView.vue
```

`@/` → `src/`，在 `tsconfig.json` 与 `vite.config.ts` 中均已配置。

## Dev Proxy (重要)

`vite.config.ts` 配置了开发代理，使所有 API 请求同源（避免 CORS）：

| 前端路径前缀      | 转发目标                     |
|-------------------|------------------------------|
| `/v1/*`           | `http://localhost:8001/v1/*` |
| `/release_task`   | `http://localhost:8001/...`  |
| `/query_result`   | `http://localhost:8001/...`  |

**生产部署**：前端应与后端同 origin 部署，代理自动失效，路径相对即可。

## API 层 (`src/utils/api.ts`)

### 后端响应格式

所有内部接口（`/release_task`、`/query_result`、`/v1/model_inventory`）均返回：

```ts
{ data: T, code: 200, error: null | string, timestamp: number, extra: unknown }
```

> **注意**：`code` 成功时为 `200`，**不是** `0`。判断成功用 `!res.error`，不用 `res.code === 0`。

`/v1/models` 是 OpenRouter 兼容格式（`{ object: "list", data: [...] }`），**不用**它，改用 `/v1/model_inventory`。

### `/query_result` — 进度字段

`TaskQueryItem.result` 是一个 **JSON 字符串**（需 `JSON.parse`），内含数组，每项均有：

- `progress: number` — 0.0–1.0 实时进度（轮询中也有）
- `stage: string` — 当前阶段描述（如 `"Generating music (batch size: 2)..."`）
- `status: number` — `0`=运行中，`1`=成功，`2`=失败
- `file: string` — 完成时的相对路径（如 `/v1/audio?path=%2F...`）

轮询时应从 `result[0].progress` 读取真实进度，**不要用虚假递增**。

### 音频 URL 策略

- **播放** (`<audio src>`)：调用 `getAudioStreamUrl(filePath)` — 后端同 origin 时返回相对路径（走 Vite 代理），异 origin 时返回绝对 URL
- **下载**：调用 `fetchAudioBlob(filePath)` — `fetch()` 拿到 Blob → `URL.createObjectURL` → 程序化点击 `<a>`。**禁止**用 `<a :href="..." download>` 直接指向跨域 URL（浏览器会忽略 `download` 属性）
- `getAudioDownloadUrl` 已 `@deprecated`，新代码不用

### API 设置

`getApiSettings()` 返回响应式 `Ref<{ baseUrl, apiKey }>`（持久化到 `localStorage`）。  
`updateApiSettings(partial)` 更新并保存。默认 `baseUrl = 'http://localhost:8001'`。

## Code Style

### Formatting
- **2 空格**缩进 | **单引号** | **无分号** | 多行结构末尾加**尾逗号**
- 配置文件用 ESM（`export default`），`"type": "module"`

### SFC 结构与 Import 顺序

```vue
<script setup lang="ts">
// 1. Vue 核心
import { ref, computed, onMounted } from 'vue'
// 2. 第三方库
import { Download, Loader } from 'lucide-vue-next'
// 3. @/ 别名（store、utils、composables）
import { useMusicStore } from '@/stores/music'
import { fetchAudioBlob } from '@/utils/api'
import type { GenerationTask } from '@/stores/music'  // type 独立行
// 4. 相对路径
import AudioWaveform from './AudioWaveform.vue'
</script>

<template>...</template>

<style scoped>
/* 仅用于 Vue Transition 动画，其余全用 Tailwind */
</style>
```

### TypeScript

- `strict: true` + `noUnusedLocals` + `noUnusedParameters` — 违反即构建失败
- 禁止 `any`；用 `interface` 定义数据结构；联合类型内联：`'pending' | 'processing' | 'completed'`
- `defineProps<{ task: GenerationTask }>()` — 泛型语法，无运行时声明
- Ref 显式泛型：`ref<File | null>(null)`
- 函数签名显式标注：`function formatDuration(seconds: number): string`
- 类型断言仅限 DOM：`e.target as HTMLInputElement`
- 优先 `?.` 和 `??`；async 函数必须有 `try-catch`

### Naming Conventions

| 类型           | 规范                 | 示例                            |
|----------------|----------------------|---------------------------------|
| 组件文件       | PascalCase           | `AudioUpload.vue`               |
| 视图文件       | `XxxView.vue`        | `GeneratorView.vue`             |
| Store          | `use` + 域 + `Store` | `useMusicStore`                 |
| 组合式函数     | `use` 前缀           | `useAudioPlayer.ts`             |
| DOM 事件处理   | `handle` 前缀        | `handleDragOver`, `handleAbort` |
| Store action   | 直接动词             | `startGeneration`, `removeTask` |
| Ref / Computed | camelCase            | `isDragOver`, `hasFile`         |
| API 工具函数   | 动词 + 名词          | `fetchAudioBlob`, `listModels`  |

### CSS / Styling（三层体系）

1. **Tailwind 工具类**（主力）— 直接写在 `class` 中
2. **`@layer components`**（复用类）— 定义在 `styles/main.css`：
   `.glass-card` `.glass-card-hover` `.btn-primary` `.btn-accent` `.btn-ghost` `.input-field` `.label-text` `.section-title`
3. **`<style scoped>`**（极少）— 仅 Vue Transition 动画

**Design Tokens（`tailwind.config.js`）：**

| Token           | Tailwind 用法          | 值        |
|-----------------|------------------------|-----------|
| `primary`       | `bg-primary`           | `#1E1B4B` |
| `secondary`     | `bg-secondary`         | `#4338CA` |
| `accent`        | `bg-accent`            | `#22C55E` |
| `surface`       | `bg-surface`           | `#0F0F23` |
| `surface-light` | `bg-surface-light`     | `#1A1A3E` |

透明度修饰：`bg-secondary/20`、`border-white/10`。  
**禁止** scale transform hover（避免布局偏移）。Hover 用 `transition-colors duration-200`。

### Icons

- 统一用 **lucide-vue-next**，逐个按名导入
- 统一 `:stroke-width="1.5"`，尺寸用 Tailwind（`w-4 h-4` / `w-5 h-5`）
- **禁止** emoji 作图标

### Pinia Store

Setup Store 风格，内部顺序：State → Computed → Actions → return：

```ts
export const useMusicStore = defineStore('music', () => {
  const lyrics = ref('')                                     // State
  const hasContent = computed(() => lyrics.value.length > 0) // Computed
  function clearAll() { lyrics.value = '' }                   // Action
  return { lyrics, hasContent, clearAll }
})
```

组件中 `const store = useMusicStore()`，**不解构**（保持响应性）。

### Error Handling

- Guard clause 提前返回：`if (!task) return`
- 可选链：`e.dataTransfer?.files[0]`
- 异步操作必须 `try-catch`，失败时更新 error state（如 `task.errorMessage`）
- 轮询中网络错误静默忽略（不将任务置为 failed），继续重试

### Accessibility

- 可点击元素必须有 `cursor-pointer`
- 图标按钮必须有 `aria-label`；装饰元素加 `aria-hidden="true"`
- 表单 `<label for="id">` 关联；聚焦样式 `focus:ring-2 focus:ring-*/50`
- 语义标签：`<header>` `<main>` `<nav>` `<section>`
- `prefers-reduced-motion` 已在 `styles/main.css` `@layer base` 全局处理

### Routing

路由懒加载：`component: () => import('@/views/XxxView.vue')`  
响应式断点：`sm:` (640px) `md:` (768px) `lg:` (1024px)
