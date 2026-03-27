import { ref, computed, watch, onUnmounted, type Ref } from 'vue'

export interface AudioPlayerState {
  isPlaying: Ref<boolean>
  currentTime: Ref<number>
  duration: Ref<number>
  playbackRate: Ref<number>
  progress: Ref<number>
  waveformData: Ref<number[]>
  isReady: Ref<boolean>
  play: () => void
  pause: () => void
  toggle: () => void
  seek: (time: number) => void
  seekByPercent: (percent: number) => void
  setRate: (rate: number) => void
  cycleRate: () => void
  formatTime: (seconds: number) => string
}

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2]

export function useAudioPlayer(audioUrl: Ref<string | undefined>): AudioPlayerState {
  const isPlaying = ref(false)
  const currentTime = ref(0)
  const duration = ref(0)
  const playbackRate = ref(1)
  const waveformData = ref<number[]>([])
  const isReady = ref(false)

  let audio: HTMLAudioElement | null = null
  let animationFrame = 0

  const progress = computed(() => {
    if (duration.value <= 0) return 0
    return (currentTime.value / duration.value) * 100
  })

  function createAudio(url: string) {
    destroyAudio()

    audio = new Audio(url)
    audio.preload = 'metadata'

    audio.addEventListener('loadedmetadata', () => {
      if (audio) {
        duration.value = audio.duration
        isReady.value = true
        generateWaveform()
      }
    })

    audio.addEventListener('ended', () => {
      isPlaying.value = false
      currentTime.value = 0
      cancelAnimationFrame(animationFrame)
    })

    audio.addEventListener('error', () => {
      isPlaying.value = false
      isReady.value = false
    })
  }

  function destroyAudio() {
    if (audio) {
      audio.pause()
      audio.src = ''
      audio.load()
      audio = null
    }
    cancelAnimationFrame(animationFrame)
    isPlaying.value = false
    currentTime.value = 0
    duration.value = 0
    isReady.value = false
  }

  function updateTime() {
    if (audio && isPlaying.value) {
      currentTime.value = audio.currentTime
      animationFrame = requestAnimationFrame(updateTime)
    }
  }

  function play() {
    if (!audio) return
    audio.play()
    isPlaying.value = true
    animationFrame = requestAnimationFrame(updateTime)
  }

  function pause() {
    if (!audio) return
    audio.pause()
    isPlaying.value = false
    cancelAnimationFrame(animationFrame)
  }

  function toggle() {
    if (isPlaying.value) {
      pause()
    } else {
      play()
    }
  }

  function seek(time: number) {
    if (!audio) return
    audio.currentTime = Math.max(0, Math.min(time, duration.value))
    currentTime.value = audio.currentTime
  }

  function seekByPercent(percent: number) {
    seek((percent / 100) * duration.value)
  }

  function setRate(rate: number) {
    playbackRate.value = rate
    if (audio) {
      audio.playbackRate = rate
    }
  }

  function cycleRate() {
    const currentIndex = PLAYBACK_RATES.indexOf(playbackRate.value)
    const nextIndex = (currentIndex + 1) % PLAYBACK_RATES.length
    setRate(PLAYBACK_RATES[nextIndex])
  }

  function formatTime(seconds: number): string {
    if (!isFinite(seconds) || seconds < 0) return '0:00'
    const m = Math.floor(seconds / 60)
    const s = Math.floor(seconds % 60)
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  function generateWaveform() {
    // Generate a deterministic pseudo-random waveform based on URL hash
    const barCount = 80
    const bars: number[] = []
    let seed = 0
    const url = audioUrl.value ?? ''
    for (let i = 0; i < url.length; i++) {
      seed = ((seed << 5) - seed + url.charCodeAt(i)) | 0
    }
    for (let i = 0; i < barCount; i++) {
      seed = (seed * 16807 + 11) % 2147483647
      const base = 0.15 + (Math.abs(seed % 1000) / 1000) * 0.85
      // Create a natural-looking envelope
      const envelopePos = i / barCount
      const envelope = Math.sin(envelopePos * Math.PI) * 0.4 + 0.6
      bars.push(base * envelope)
    }
    waveformData.value = bars
  }

  watch(audioUrl, (url) => {
    if (url) {
      createAudio(url)
    } else {
      destroyAudio()
    }
  }, { immediate: true })

  onUnmounted(() => {
    destroyAudio()
  })

  return {
    isPlaying,
    currentTime,
    duration,
    playbackRate,
    progress,
    waveformData,
    isReady,
    play,
    pause,
    toggle,
    seek,
    seekByPercent,
    setRate,
    cycleRate,
    formatTime,
  }
}
