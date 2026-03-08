import { ref, onMounted, onUnmounted } from 'vue'

interface HeartbeatStatus {
  lastFiredAt: string | null
  intervalMs: number
  nextExpectedAt: string | null
  secondsRemaining: number | null
  isOverdue: boolean
  withinActiveHours: boolean
}

export function useHeartbeatStatus() {
  const secondsRemaining = ref<number | null>(null)
  const isOverdue = ref(false)
  const withinActiveHours = ref(true)
  const loading = ref(true)
  const lastFiredAt = ref<string | null>(null)
  const nextExpectedAt = ref<string | null>(null)

  // Track server-provided nextExpectedAt for client-side tick
  let nextExpectedMs: number | null = null
  let tickTimer: ReturnType<typeof setInterval> | null = null
  let pollTimer: ReturnType<typeof setInterval> | null = null

  async function fetchStatus() {
    try {
      const res = await fetch('/api/heartbeat-status')
      if (!res.ok) return
      const data: HeartbeatStatus = await res.json()

      lastFiredAt.value = data.lastFiredAt
      nextExpectedAt.value = data.nextExpectedAt
      withinActiveHours.value = data.withinActiveHours

      if (data.nextExpectedAt) {
        nextExpectedMs = new Date(data.nextExpectedAt).getTime()
        const secs = Math.round((nextExpectedMs - Date.now()) / 1000)
        secondsRemaining.value = secs
        isOverdue.value = secs < 0
      } else {
        nextExpectedMs = null
        secondsRemaining.value = null
        isOverdue.value = false
      }
    } catch {
      // silently ignore fetch errors
    } finally {
      loading.value = false
    }
  }

  function tick() {
    if (nextExpectedMs === null) return
    const secs = Math.round((nextExpectedMs - Date.now()) / 1000)
    secondsRemaining.value = secs
    isOverdue.value = secs < 0
  }

  onMounted(() => {
    fetchStatus()
    tickTimer = setInterval(tick, 1000)
    pollTimer = setInterval(fetchStatus, 30000)
  })

  onUnmounted(() => {
    if (tickTimer) clearInterval(tickTimer)
    if (pollTimer) clearInterval(pollTimer)
  })

  return { secondsRemaining, isOverdue, withinActiveHours, loading, lastFiredAt, nextExpectedAt }
}
