import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
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

export const useMusicStore = defineStore('music', () => {
  // Material state
  const referenceAudioFile = ref<File | null>(null)
  const referenceAudioName = ref('')
  const lyrics = ref('')
  const musicCaption = ref('')

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
    model?: string
    audioFormat?: string
    batchSize?: number
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
      audioResults: [],
    }

    tasks.value.unshift(task)
    isGenerating.value = true

    try {
      const res = await createSampleTask({
        sample_query: params.sampleQuery,
        model: params.model || undefined,
        audio_format: params.audioFormat || undefined,
        batch_size: params.batchSize,
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
    abortTask,
    removeTask,
    saveAsTemplate,
    loadTemplate,
    clearMaterials,
  }
})
