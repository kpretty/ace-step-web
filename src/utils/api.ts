import { ref } from 'vue'

// ---------------------------------------------------------------------------
// API settings (reactive, persisted to localStorage)
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'ace-api-settings'

interface ApiSettings {
  baseUrl: string
  apiKey: string
}

function loadSettings(): ApiSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw)
  } catch { /* ignore */ }
  return { baseUrl: 'http://localhost:8001', apiKey: '' }
}

function saveSettings(s: ApiSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s))
}

const settings = ref<ApiSettings>(loadSettings())

export function getApiSettings() {
  return settings
}

export function updateApiSettings(partial: Partial<ApiSettings>) {
  Object.assign(settings.value, partial)
  saveSettings(settings.value)
}

// ---------------------------------------------------------------------------
// Shared response types
// ---------------------------------------------------------------------------

export interface ApiResponse<T> {
  data: T
  code: number
  error: string | null
  timestamp: number
  extra: unknown
}

export interface ReleaseTaskResult {
  task_id: string
  status: string
  queue_position: number
}

export interface TaskQueryItem {
  task_id: string
  status: number          // 0=queued/running, 1=succeeded, 2=failed
  result: string          // JSON string to parse
  progress_text?: string  // Server log line (debug info)
}

export interface TaskResultParsed {
  file: string
  wave: string
  status: number
  create_time: number
  env?: string
  progress: number        // 0.0–1.0
  stage: string           // e.g. "Generating music...", "Decoding audio...", "succeeded"
  prompt?: string
  lyrics?: string
  metas?: {
    bpm: number
    duration: number
    genres: string
    keyscale: string
    timesignature: string
    prompt?: string
    lyrics?: string
  }
  generation_info?: string
  seed_value?: string
  lm_model?: string
  dit_model?: string
}

export interface ModelInfo {
  name: string
  is_default: boolean
  is_loaded: boolean
  supported_task_types: string[]
}

export interface LmModelInfo {
  name: string
  is_loaded: boolean
}

export interface ModelInventoryResult {
  models: ModelInfo[]
  default_model: string
  lm_models: LmModelInfo[]
  loaded_lm_model: string | null
  llm_initialized: boolean
}

// ---------------------------------------------------------------------------
// Low-level fetch wrapper
// ---------------------------------------------------------------------------

async function request<T>(
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<ApiResponse<T>> {
  const { baseUrl, apiKey } = settings.value
  const url = `${baseUrl.replace(/\/+$/, '')}${path}`

  const headers: Record<string, string> = {}
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  let fetchBody: BodyInit | undefined
  if (body instanceof FormData) {
    fetchBody = body
    // Do NOT set Content-Type; browser sets multipart boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    fetchBody = JSON.stringify(body)
  }

  const res = await fetch(url, {
    method,
    headers,
    body: fetchBody,
  })

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`API ${res.status}: ${text}`)
  }

  return res.json() as Promise<ApiResponse<T>>
}

// ---------------------------------------------------------------------------
// API methods
// ---------------------------------------------------------------------------

/**
 * POST /release_task — 创建生成任务
 *
 * If `referenceAudio` is provided, uses multipart/form-data upload.
 * Otherwise sends JSON.
 */
export async function createTask(params: {
  prompt: string
  lyrics: string
  model?: string
  vocal_language?: string
  audio_format?: string
  bpm?: number | null
  key_scale?: string
  time_signature?: string
  audio_duration?: number | null
  batch_size?: number
  referenceAudio?: File | null
}): Promise<ApiResponse<ReleaseTaskResult>> {
  const { referenceAudio, ...rest } = params

  if (referenceAudio) {
    // multipart/form-data for file upload
    const fd = new FormData()
    fd.append('reference_audio', referenceAudio)
    for (const [key, val] of Object.entries(rest)) {
      if (val !== null && val !== undefined && val !== '') {
        fd.append(key, String(val))
      }
    }
    return request<ReleaseTaskResult>('POST', '/release_task', fd)
  }

  // JSON body — strip nulls / empty strings
  const body: Record<string, unknown> = {}
  for (const [key, val] of Object.entries(rest)) {
    if (val !== null && val !== undefined && val !== '') {
      body[key] = val
    }
  }
  return request<ReleaseTaskResult>('POST', '/release_task', body)
}

/**
 * POST /query_result — 批量查询任务结果
 */
export async function queryResults(
  taskIds: string[],
): Promise<ApiResponse<TaskQueryItem[]>> {
  return request<TaskQueryItem[]>('POST', '/query_result', {
    task_id_list: taskIds,
  })
}

/**
 * GET /v1/model_inventory — 列出可用模型（内部接口，含加载状态）
 */
export async function listModels(): Promise<ApiResponse<ModelInventoryResult>> {
  return request<ModelInventoryResult>('GET', '/v1/model_inventory')
}

/**
 * Build a URL for streaming audio in <audio src>.
 *
 * Strategy:
 *   - If the configured baseUrl matches the current page origin (same-origin),
 *     return a relative path — this also works through the Vite dev proxy.
 *   - Otherwise return the full absolute URL with optional auth token query param.
 *
 * filePath is a relative path like "/v1/audio?path=%2F..." as returned by the server.
 */
export function getAudioStreamUrl(filePath: string): string {
  const { baseUrl, apiKey } = settings.value
  const base = baseUrl.replace(/\/+$/, '')

  let url: string
  try {
    const backendOrigin = new URL(base).origin
    const pageOrigin = window.location.origin
    if (backendOrigin === pageOrigin) {
      // Same origin — use relative path so Vite proxy / production routing works
      url = filePath
    } else {
      url = `${base}${filePath}`
    }
  } catch {
    url = `${base}${filePath}`
  }

  if (apiKey) {
    const sep = url.includes('?') ? '&' : '?'
    return `${url}${sep}ai_token=${encodeURIComponent(apiKey)}`
  }
  return url
}

/**
 * Fetch audio as a Blob using the Authorization header (avoids CORS issues with
 * cross-origin <a download> and works regardless of whether the server sends
 * Access-Control-Allow-Origin headers when the request has credentials).
 *
 * Returns a { blobUrl, filename } pair. The caller is responsible for calling
 * URL.revokeObjectURL(blobUrl) after the download link is clicked.
 */
export async function fetchAudioBlob(filePath: string): Promise<{ blobUrl: string; filename: string }> {
  const { baseUrl, apiKey } = settings.value
  const base = baseUrl.replace(/\/+$/, '')
  const url = `${base}${filePath}`

  const headers: Record<string, string> = {}
  if (apiKey) {
    headers['Authorization'] = `Bearer ${apiKey}`
  }

  const res = await fetch(url, { headers })
  if (!res.ok) {
    throw new Error(`下载失败: HTTP ${res.status}`)
  }

  const blob = await res.blob()
  const blobUrl = URL.createObjectURL(blob)

  // Try to extract a readable filename from the path query param
  let filename = 'audio.mp3'
  try {
    const match = decodeURIComponent(filePath).match(/([^/\\]+\.(?:mp3|wav|flac))/)
    if (match) filename = match[1]
  } catch { /* keep default */ }

  return { blobUrl, filename }
}

/** @deprecated Use getAudioStreamUrl instead */
export function getAudioDownloadUrl(filePath: string): string {
  return getAudioStreamUrl(filePath)
}

/**
 * POST /release_task — 描述驱动生成（sample_mode=true）
 *
 * 后端使用 LLM 从自然语言描述自动生成 caption/lyrics/metas，然后直接出音频。
 * 与 createTask() 共享相同响应格式和轮询流程。
 */
export async function createSampleTask(params: {
  sample_query: string
  model?: string
  audio_format?: string
  batch_size?: number
}): Promise<ApiResponse<ReleaseTaskResult>> {
  const body: Record<string, unknown> = {
    sample_mode: true,
    sample_query: params.sample_query,
  }
  if (params.model) body['model'] = params.model
  if (params.audio_format) body['audio_format'] = params.audio_format
  if (params.batch_size && params.batch_size > 1) body['batch_size'] = params.batch_size
  return request<ReleaseTaskResult>('POST', '/release_task', body)
}

// ---------------------------------------------------------------------------
// Format Input
// ---------------------------------------------------------------------------

export interface FormatInputResult {
  caption: string
  lyrics: string
  bpm: number | null
  key_scale: string | null
  time_signature: string | null
  duration: number | null
  vocal_language: string | null
}

/**
 * POST /format_input — 使用 LLM 增强/格式化 caption 与 lyrics
 */
export async function formatInput(params: {
  prompt: string
  lyrics: string
  temperature?: number
}): Promise<ApiResponse<FormatInputResult>> {
  return request<FormatInputResult>('POST', '/format_input', {
    prompt: params.prompt,
    lyrics: params.lyrics,
    temperature: params.temperature ?? 0.85,
  })
}
