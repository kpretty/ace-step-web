import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import {
  createTask,
  createSampleTask,
  queryResults,
  getAudioStreamUrl,
  formatInput,
  type TaskResultParsed,
} from '@/utils/api'

export interface AudioResult {
  /** Stream URL for <audio src> (same-origin relative path or absolute) */
  url: string
  /** Raw server file path, e.g. "/v1/audio?path=..." — used for blob download */
  filePath: string
  duration: string
  seed: string
  model: string
  /** Fields populated from server metas — used for iterate-to-advanced */
  lyrics?: string
  prompt?: string
  bpm?: number | null
  keyScale?: string
  timeSignature?: string
  vocalLanguage?: string
}

export interface GenerationTask {
  id: string
  /** Server-side task_id returned by /release_task */
  serverTaskId: string
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'aborted'
  progress: number
  /** Current generation stage text from server (e.g. "Generating music...") */
  stageText: string
  title: string
  createdAt: Date
  /** Which UI mode created this task — used to scope task lists per view */
  mode: 'describe' | 'advanced'
  /** Multiple audio results when batch_size > 1 */
  audioResults: AudioResult[]
  /** Shortcut to first audio URL (for single-result convenience) */
  audioUrl?: string
  duration?: string
  errorMessage?: string
}

export interface AdvancedParams {
  model: string
  vocalLanguage: string
  audioFormat: string
  bpm: number | null
  keyScale: string
  timeSignature: string
  audioDuration: number | null
  batchSize: number
}

const POLL_INTERVAL = 2000 // ms

// ---------------------------------------------------------------------------
// Form state persistence
// ---------------------------------------------------------------------------

const PERSIST_KEY = 'ace-form-state'

interface PersistedFormState {
  lyrics?: string
  musicCaption?: string
  sampleQuery?: string
  advancedParams?: Partial<AdvancedParams>
}

function loadFormState(): PersistedFormState {
  try {
    const raw = localStorage.getItem(PERSIST_KEY)
    if (raw) return JSON.parse(raw) as PersistedFormState
  } catch { /* ignore */ }
  return {}
}

function saveFormState(state: PersistedFormState) {
  try {
    localStorage.setItem(PERSIST_KEY, JSON.stringify(state))
  } catch { /* ignore */ }
}

export const useMusicStore = defineStore('music', () => {
  const _persisted = loadFormState()

  // Material state
  const referenceAudioFile = ref<File | null>(null)
  const referenceAudioName = ref('')
  const lyrics = ref(_persisted.lyrics ?? '')
  const musicCaption = ref(_persisted.musicCaption ?? '')
  const sampleQuery = ref(_persisted.sampleQuery ?? '')

  // Advanced params
  const advancedParams = ref<AdvancedParams>({
    model: '',
    vocalLanguage: 'zh',
    audioFormat: 'mp3',
    bpm: null,
    keyScale: '',
    timeSignature: '',
    audioDuration: null,
    batchSize: 1,
    ...(_persisted.advancedParams ?? {}),
  })

  // Generation state
  const tasks = ref<GenerationTask[]>([])
  const isGenerating = ref(false)
  const isFormatting = ref(false)
  /** Set to true after formatInputs() updates advanced params — consumed by AdvancedParams to auto-expand */
  const shouldExpandParams = ref(false)
  const pollTimers = ref<Record<string, number>>({})

  // Computed
  const completedTasks = computed(() =>
    tasks.value.filter((t) => t.status === 'completed'),
  )

  const activeTasks = computed(() =>
    tasks.value.filter((t) => t.status === 'processing' || t.status === 'pending'),
  )

  const hasActiveTasks = computed(() => activeTasks.value.length > 0)

  /** 歌词与音乐描述均已填写，且当前无生成任务在运行 */
  const canGenerate = computed(
    () =>
      lyrics.value.trim().length > 0 &&
      musicCaption.value.trim().length > 0 &&
      !isGenerating.value,
  )

  // ---------------------------------------------------------------------------
  // Persistence watchers — write to localStorage on every change
  // ---------------------------------------------------------------------------

  function persistFormState() {
    saveFormState({
      lyrics: lyrics.value,
      musicCaption: musicCaption.value,
      sampleQuery: sampleQuery.value,
      advancedParams: advancedParams.value,
    })
  }

  watch(lyrics, persistFormState)
  watch(musicCaption, persistFormState)
  watch(sampleQuery, persistFormState)
  watch(advancedParams, persistFormState, { deep: true })

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  function setReferenceAudio(file: File | null) {
    referenceAudioFile.value = file
    referenceAudioName.value = file?.name ?? ''
  }

  function clearReferenceAudio() {
    referenceAudioFile.value = null
    referenceAudioName.value = ''
  }

  function resetAdvancedParams() {
    advancedParams.value = {
      model: '',
      vocalLanguage: 'zh',
      audioFormat: 'mp3',
      bpm: null,
      keyScale: '',
      timeSignature: '',
      audioDuration: null,
      batchSize: 1,
    }
    // persistFormState will be triggered by the watch above
  }

  /**
   * Call /format_input to enhance caption and/or lyrics via LLM.
   *
   * `target` controls which fields are applied from the response:
   *   - 'lyrics'  : only update lyrics (caption and params are discarded)
   *   - 'caption' : only update caption + music params (lyrics is discarded)
   *   - 'both'    : update everything (default)
   *
   * The API always receives both fields so the LLM has full context regardless.
   */
  async function formatInputs(
    target: 'lyrics' | 'caption' | 'both' = 'both',
  ): Promise<{ ok: boolean; error?: string; paramsUpdated?: boolean }> {
    if (isFormatting.value) return { ok: false, error: '格式化进行中' }
    isFormatting.value = true
    try {
      const res = await formatInput({
        prompt: musicCaption.value,
        lyrics: lyrics.value,
      })
      if (res.error || !res.data) {
        return { ok: false, error: res.error || '格式化失败' }
      }
      const d = res.data

      // Selectively apply text fields based on target
      if (target !== 'caption' && d.lyrics) {
        lyrics.value = d.lyrics
      }
      if (target !== 'lyrics' && d.caption) {
        musicCaption.value = d.caption
      }

      // Music params are only applied when target includes caption
      let paramsUpdated = false
      if (target !== 'lyrics') {
        if (d.bpm != null) {
          advancedParams.value.bpm = d.bpm
          paramsUpdated = true
        }
        if (d.key_scale) {
          advancedParams.value.keyScale = d.key_scale
          paramsUpdated = true
        }
        if (d.time_signature) {
          advancedParams.value.timeSignature = d.time_signature
          paramsUpdated = true
        }
        if (d.duration != null) {
          advancedParams.value.audioDuration = Math.round(d.duration)
          paramsUpdated = true
        }
        if (d.vocal_language) {
          advancedParams.value.vocalLanguage = d.vocal_language
          paramsUpdated = true
        }
        if (paramsUpdated) {
          shouldExpandParams.value = true
        }
      }

      return { ok: true, paramsUpdated }
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : '网络请求失败' }
    } finally {
      isFormatting.value = false
    }
  }

  /**
   * Start a generation: call /release_task, then poll /query_result until done.
   */
  async function startGeneration() {
    const title = musicCaption.value.slice(0, 50) || '未命名曲目'
    const taskId = `task-${Date.now()}`

    const task: GenerationTask = {
      id: taskId,
      serverTaskId: '',
      status: 'pending',
      progress: 0,
      stageText: '',
      title,
      createdAt: new Date(),
      mode: 'advanced',
      audioResults: [],
    }

    tasks.value.unshift(task)
    isGenerating.value = true

    try {
      const res = await createTask({
        prompt: musicCaption.value,
        lyrics: lyrics.value,
        model: advancedParams.value.model || undefined,
        vocal_language: advancedParams.value.vocalLanguage || undefined,
        audio_format: advancedParams.value.audioFormat || undefined,
        bpm: advancedParams.value.bpm,
        key_scale: advancedParams.value.keyScale || undefined,
        time_signature: advancedParams.value.timeSignature || undefined,
        audio_duration: advancedParams.value.audioDuration,
        batch_size: advancedParams.value.batchSize,
        referenceAudio: referenceAudioFile.value,
      })

      if (res.error || !res.data?.task_id) {
        task.status = 'failed'
        task.errorMessage = res.error || '创建任务失败：服务端未返回 task_id'
        isGenerating.value = activeTasks.value.length > 0
        return
      }

      task.serverTaskId = res.data.task_id
      task.status = 'processing'

      // Begin polling
      startPolling(taskId)
    } catch (err) {
      task.status = 'failed'
      task.errorMessage = err instanceof Error ? err.message : '网络请求失败'
      isGenerating.value = activeTasks.value.length > 0
    }
  }

  /**
   * Start a description-driven generation: call /release_task with sample_mode=true,
   * then poll /query_result until done — reusing the same task lifecycle as startGeneration().
   */
  async function startDescriptionGeneration(params: {
    sampleQuery: string
  }) {
    const title = params.sampleQuery.slice(0, 50) || '描述驱动生成'
    const taskId = `task-${Date.now()}`

    const task: GenerationTask = {
      id: taskId,
      serverTaskId: '',
      status: 'pending',
      progress: 0,
      stageText: '',
      title,
      createdAt: new Date(),
      mode: 'describe',
      audioResults: [],
    }

    tasks.value.unshift(task)
    isGenerating.value = true

    try {
      const res = await createSampleTask({
        sample_query: params.sampleQuery,
      })

      if (res.error || !res.data?.task_id) {
        task.status = 'failed'
        task.errorMessage = res.error || '创建任务失败：服务端未返回 task_id'
        isGenerating.value = activeTasks.value.length > 0
        return
      }

      task.serverTaskId = res.data.task_id
      task.status = 'processing'

      // Reuse the same polling logic
      startPolling(taskId)
    } catch (err) {
      task.status = 'failed'
      task.errorMessage = err instanceof Error ? err.message : '网络请求失败'
      isGenerating.value = activeTasks.value.length > 0
    }
  }

  /**
   *
   * The server returns real-time progress inside `result` (a JSON string):
   *   - result[0].progress  (0.0–1.0)
   *   - result[0].stage     ("Generating music...", "Decoding audio...", etc.)
   *
   * We parse this on every poll tick and feed it into the task's reactive state.
   */
  function startPolling(taskId: string) {
    // Clear any existing timer
    stopPolling(taskId)

    const timer = window.setInterval(async () => {
      const task = tasks.value.find((t) => t.id === taskId)
      if (!task || task.status === 'aborted') {
        stopPolling(taskId)
        return
      }

      try {
        const res = await queryResults([task.serverTaskId])
        if (res.error || !res.data?.length) return

        const item = res.data[0]

        // ------ Parse result JSON to extract progress / stage ------
        let parsedResults: TaskResultParsed[] = []
        try {
          const raw = JSON.parse(item.result)
          parsedResults = Array.isArray(raw) ? raw : [raw]
        } catch {
          // result not parseable yet — keep waiting
        }

        if (item.status === 0) {
          // Still running — read real progress from parsed result
          if (parsedResults.length > 0) {
            const first = parsedResults[0]
            const serverProgress = first.progress ?? 0
            // Convert 0.0–1.0 to 0–100, ensure it only goes forward
            const pct = Math.round(serverProgress * 100)
            task.progress = Math.max(task.progress, pct)
            task.stageText = first.stage ?? ''
          }
          return
        }

        if (item.status === 2) {
          // Failed
          task.status = 'failed'
          task.progress = 0
          task.stageText = ''
          task.errorMessage = '服务端生成失败'
          stopPolling(taskId)
          isGenerating.value = activeTasks.value.length > 0
          return
        }

        if (item.status === 1) {
          // Succeeded
          task.progress = 100
          task.status = 'completed'
          task.stageText = ''

          const results: AudioResult[] = parsedResults
            .filter((r) => r.status === 1 && r.file)
            .map((r) => ({
              url: getAudioStreamUrl(r.file),
              filePath: r.file,
              duration: formatDuration(r.metas?.duration ?? 0),
              seed: r.seed_value ?? '',
              model: r.dit_model ?? '',
              // Capture generation metadata for iterate-to-advanced
              // Top-level r.lyrics / r.prompt are the authoritative fields for
              // sample_mode results; metas.lyrics / metas.prompt are empty strings
              // in that case, so we prefer the top-level values first.
              lyrics: r.lyrics || r.metas?.lyrics || '',
              prompt: r.prompt || r.metas?.prompt || '',
              bpm: r.metas?.bpm ?? null,
              keyScale: r.metas?.keyscale ?? '',
              timeSignature: r.metas?.timesignature ?? '',
              vocalLanguage: '',
            }))

          task.audioResults = results

          // Convenience: set first result as primary
          if (results.length > 0) {
            task.audioUrl = results[0].url
            task.duration = results[0].duration
          }

          stopPolling(taskId)
          isGenerating.value = activeTasks.value.length > 0
        }
      } catch {
        // Network error during poll — don't fail the task, just keep trying
      }
    }, POLL_INTERVAL)

    pollTimers.value[taskId] = timer
  }

  function stopPolling(taskId: string) {
    const timer = pollTimers.value[taskId]
    if (timer) {
      clearInterval(timer)
      delete pollTimers.value[taskId]
    }
  }

  function abortTask(taskId: string) {
    const task = tasks.value.find((t) => t.id === taskId)
    if (!task) return
    if (task.status !== 'processing' && task.status !== 'pending') return

    task.status = 'aborted'
    task.progress = 0
    stopPolling(taskId)
    isGenerating.value = activeTasks.value.length > 0
  }

  function removeTask(taskId: string) {
    abortTask(taskId)
    tasks.value = tasks.value.filter((t) => t.id !== taskId)
  }

  function saveAsTemplate() {
    const template = {
      lyrics: lyrics.value,
      musicCaption: musicCaption.value,
      hasReferenceAudio: !!referenceAudioFile.value,
      savedAt: new Date().toISOString(),
    }
    const templates = JSON.parse(localStorage.getItem('ace-templates') || '[]')
    templates.push(template)
    localStorage.setItem('ace-templates', JSON.stringify(templates))
    return template
  }

  function loadTemplate(template: { lyrics: string; musicCaption: string }) {
    lyrics.value = template.lyrics
    musicCaption.value = template.musicCaption
  }

  function clearMaterials() {
    referenceAudioFile.value = null
    referenceAudioName.value = ''
    lyrics.value = ''
    musicCaption.value = ''
    // watches above will persist the cleared state automatically
  }

  /** Reset the describe-mode query (clears its persisted cache too) */
  function resetDescribeQuery() {
    sampleQuery.value = ''
  }

  /**
   * Populate the advanced-creation form from a describe-mode AudioResult,
   * then set the audio file as reference audio so the user can iterate.
   *
   * Callers should navigate to /generator after this returns.
   * Returns false if the blob fetch fails (caller can show an error).
   */
  async function iterateToAdvanced(result: AudioResult): Promise<boolean> {
    // Fill text fields — prefer metas values, fall back gracefully
    if (result.lyrics) lyrics.value = result.lyrics
    if (result.prompt) musicCaption.value = result.prompt

    // Fill advanced params from metas
    if (result.bpm != null) advancedParams.value.bpm = result.bpm
    if (result.keyScale) advancedParams.value.keyScale = result.keyScale
    if (result.timeSignature) advancedParams.value.timeSignature = result.timeSignature
    if (result.vocalLanguage) advancedParams.value.vocalLanguage = result.vocalLanguage

    // Fetch the generated audio as a blob and set it as reference audio
    try {
      const { fetchAudioBlob } = await import('@/utils/api')
      const { blobUrl, filename } = await fetchAudioBlob(result.filePath)
      const res = await fetch(blobUrl)
      const blob = await res.blob()
      URL.revokeObjectURL(blobUrl)
      const file = new File([blob], filename, { type: blob.type })
      setReferenceAudio(file)
    } catch {
      // Non-fatal: proceed without reference audio
    }

    return true
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function formatDuration(seconds: number): string {
    if (!seconds || seconds <= 0) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  return {
    // State
    referenceAudioFile,
    referenceAudioName,
    lyrics,
    musicCaption,
    sampleQuery,
    advancedParams,
    tasks,
    isGenerating,
    isFormatting,
    shouldExpandParams,

    // Computed
    completedTasks,
    activeTasks,
    hasActiveTasks,
    canGenerate,

    // Actions
    setReferenceAudio,
    clearReferenceAudio,
    resetAdvancedParams,
    formatInputs,
    startGeneration,
    startDescriptionGeneration,
    iterateToAdvanced,
    abortTask,
    removeTask,
    saveAsTemplate,
    loadTemplate,
    clearMaterials,
    resetDescribeQuery,
  }
})
