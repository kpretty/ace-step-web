# ACE-Step Web

ACE-Step 1.5 AI 音乐生成前端，基于 Vue 3 + TypeScript + Vite + Tailwind CSS 构建，暗色玻璃拟态风格，界面语言简体中文。

## 功能特性

- **音乐原材料**：参考音频上传、歌词编辑、音乐描述填写
- **AI 格式化**：对接 `/format_input` 接口，支持对歌词或音乐描述单独进行 AI 增强，自动同步 BPM、调性、时长等参数
- **可选参数**：模型选择、输出格式、批量生成、BPM、调性、拍号、生成时长等
- **任务生成**：实时进度条（来自服务端真实进度）、阶段文字提示、中断任务
- **结果展示**：音频波形可视化、在线试听（含倍速）、多结果批量展示与下载
- **API 设置**：支持自定义 baseUrl 和 API Key，持久化到 localStorage

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Vue 3.4+（`<script setup>` Composition API）|
| 语言 | TypeScript 5.x（strict 模式）|
| 构建 | Vite 5.x |
| 状态 | Pinia 2.x（Setup Store）|
| 路由 | Vue Router 4.x |
| 样式 | Tailwind CSS 3.x |
| 图标 | lucide-vue-next |
| 工具 | @vueuse/core |

## 快速开始

### 前置条件

- Node.js 18+
- 已启动 [ACE-Step 1.5](https://github.com/ace-step/ACE-Step-1.5) 后端服务（默认监听 `http://localhost:8001`）

### 安装与运行

```bash
# 安装依赖
npm install

# 启动开发服务器（自动打开浏览器）
npm run dev

# 生产构建
npm run build

# 预览生产构建
npm run preview
```

开发服务器默认运行在 `http://localhost:5173`，Vite 已配置代理将所有 API 请求转发到后端，无需处理跨域问题。

### API 设置

点击右上角设置图标，可配置：

- **后端地址**：默认 `http://localhost:8001`
- **API Key**：若后端启用了认证，填入对应密钥

## 项目结构

```
src/
├── main.ts
├── App.vue
├── components/
│   ├── common/          # AppNavbar、AppToast
│   ├── generation/      # GenerationPanel、TaskCard、AudioWaveform
│   ├── material/        # MaterialPanel、AudioUpload、LyricsEditor、MusicCaption、SaveTemplate
│   └── params/          # AdvancedParams、SelectField、SegmentedControl、NumberStepper
├── composables/         # useAudioPlayer、useToast
├── router/
├── stores/              # music.ts（唯一 Pinia store）
├── styles/              # main.css（Tailwind @layer）
├── utils/               # api.ts（后端通信）
└── views/               # GeneratorView.vue
```

## 开发说明

类型检查：

```bash
npx vue-tsc --noEmit
```

项目使用 `strict: true` + `noUnusedLocals` + `noUnusedParameters`，每次修改后请确保类型检查通过再构建。

## License

[Apache License 2.0](LICENSE)
