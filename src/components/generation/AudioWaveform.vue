<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, computed } from 'vue'

const props = defineProps<{
  bars: number[]
  progress: number
  accentColor?: string
}>()

const emit = defineEmits<{
  seek: [percent: number]
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
const container = ref<HTMLDivElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const barColor = computed(() => props.accentColor ?? '#4338CA')

function draw() {
  const cvs = canvas.value
  if (!cvs) return

  const ctx = cvs.getContext('2d')
  if (!ctx) return

  const dpr = window.devicePixelRatio || 1
  const rect = cvs.getBoundingClientRect()
  cvs.width = rect.width * dpr
  cvs.height = rect.height * dpr
  ctx.scale(dpr, dpr)

  const w = rect.width
  const h = rect.height
  const bars = props.bars
  if (bars.length === 0) return

  ctx.clearRect(0, 0, w, h)

  const gap = 2
  const barWidth = Math.max(1, (w - gap * (bars.length - 1)) / bars.length)
  const progressX = (props.progress / 100) * w

  for (let i = 0; i < bars.length; i++) {
    const x = i * (barWidth + gap)
    const barH = Math.max(2, bars[i] * h * 0.9)
    const y = (h - barH) / 2

    const isPast = x + barWidth <= progressX
    const isCurrent = x < progressX && x + barWidth > progressX

    if (isPast) {
      ctx.fillStyle = barColor.value
      ctx.globalAlpha = 0.95
    } else if (isCurrent) {
      ctx.fillStyle = barColor.value
      ctx.globalAlpha = 0.7
    } else {
      ctx.fillStyle = '#94a3b8'
      ctx.globalAlpha = 0.25
    }

    ctx.beginPath()
    ctx.roundRect(x, y, barWidth, barH, 1)
    ctx.fill()
  }

  ctx.globalAlpha = 1
}

function handleClick(e: MouseEvent) {
  const cvs = canvas.value
  if (!cvs) return
  const rect = cvs.getBoundingClientRect()
  const x = e.clientX - rect.left
  const percent = Math.max(0, Math.min(100, (x / rect.width) * 100))
  emit('seek', percent)
}

watch(() => [props.bars, props.progress], () => {
  draw()
}, { deep: true })

onMounted(() => {
  draw()
  if (container.value) {
    resizeObserver = new ResizeObserver(() => {
      draw()
    })
    resizeObserver.observe(container.value)
  }
})

onUnmounted(() => {
  resizeObserver?.disconnect()
})
</script>

<template>
  <div
    ref="container"
    class="w-full h-full cursor-pointer"
    role="slider"
    tabindex="0"
    :aria-valuenow="Math.round(progress)"
    aria-valuemin="0"
    aria-valuemax="100"
    aria-label="音频进度"
    @click="handleClick"
  >
    <canvas
      ref="canvas"
      class="w-full h-full block"
    />
  </div>
</template>
