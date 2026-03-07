<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useApi } from '../composables/useApi'

interface ChainItem {
  model: string
  alias: string
  provider: string
  status: 'active' | 'cooldown' | 'ready'
  cooldownUntil?: string
  cooldownRemaining?: number
}

interface HistoryItem {
  time: string
  model: string
  alias: string
  reason: string
  level: 'primary' | 'fallback'
  duration?: number
}

const { data: modelStatus } = useApi<Record<string, unknown>>('/api/model-status', 30000)

// Client-side cooldown ticking
let tickTimer: ReturnType<typeof setInterval> | null = null
const tick = ref(0)

onMounted(() => {
  tickTimer = setInterval(() => {
    tick.value++
    // Decrement cooldown counters locally
    if (modelStatus.value?.fallbackChain) {
      const chain = modelStatus.value.fallbackChain as ChainItem[]
      for (const item of chain) {
        if (item.status === 'cooldown' && typeof item.cooldownRemaining === 'number' && item.cooldownRemaining > 0) {
          item.cooldownRemaining--
        }
      }
    }
  }, 1000)
})
onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer)
})

const isFallback = computed(() => modelStatus.value?.isFallback === true)
const active = computed(() => modelStatus.value?.active as Record<string, unknown> | undefined)
const primary = computed(() => modelStatus.value?.primary as Record<string, unknown> | undefined)
const chain = computed(() => (modelStatus.value?.fallbackChain || []) as ChainItem[])
const stats = computed(() => modelStatus.value?.stats as Record<string, number> | undefined)
const history = computed(() => (modelStatus.value?.history || []) as HistoryItem[])

const fallbackLevel = computed(() => (active.value?.fallbackLevel as number) || 0)

const badgeClass = computed(() => {
  if (fallbackLevel.value === 0) return 'primary'
  if (fallbackLevel.value <= 2) return 'fallback-low'
  return 'fallback-high'
})

const alertBorderClass = computed(() => {
  if (fallbackLevel.value >= 3) return 'alert-high'
  return 'alert-low'
})

const primaryCooldownDisplay = computed(() => {
  void tick.value
  const first = chain.value[0]
  if (!first || first.status !== 'cooldown' || !first.cooldownRemaining) return ''
  const m = Math.floor(first.cooldownRemaining / 60)
  return `${m}m remaining`
})

function formatSince(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

function formatTime(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'p' : 'a'
  const h12 = h % 12 || 12
  return `${h12}:${m}${ampm}`
}

function formatCooldown(seconds: number | undefined): string {
  void tick.value
  if (!seconds || seconds <= 0) return ''
  const m = Math.floor(seconds / 60)
  return `${m}m`
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return ''
  const m = Math.floor(seconds / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  return `${m}m`
}

function historyDotClass(item: HistoryItem): string {
  if (item.level === 'primary') return 'green'
  // Check fallback depth by looking at chain position
  return 'orange'
}

function historyModelColor(item: HistoryItem): string {
  if (item.level === 'primary') return '#22c55e'
  return '#fb923c'
}

const cooldownCount = computed(() => chain.value.filter(c => c.status === 'cooldown').length)
</script>

<template>
  <div class="panel" v-if="modelStatus">
    <div class="panel-header">
      <div class="panel-title">
        Model Status
        <span v-if="cooldownCount > 0" class="alert-count">{{ cooldownCount }}</span>
      </div>
    </div>

    <!-- Alert bar -->
    <div v-if="isFallback" class="alert-bar" :class="alertBorderClass">
      <span class="icon">&#9888;&#65039;</span>
      <span>Running on <strong>fallback #{{ fallbackLevel }}</strong> &mdash; {{ primary?.alias }} rate-limited since {{ formatSince(active?.since as string) }} (cooldown: {{ primaryCooldownDisplay }})</span>
    </div>

    <!-- Active model -->
    <div class="section-label">Active Model</div>
    <div class="current-model">
      <div class="left">
        <span class="model-badge" :class="badgeClass">
          <span class="pulse-dot"></span>
          {{ active?.alias }}
        </span>
        <div>
          <div class="model-name">{{ active?.provider }}/{{ active?.model }}</div>
          <div class="provider">
            <template v-if="isFallback">Fallback #{{ fallbackLevel }} &middot; </template>
            Active since {{ formatSince(active?.since as string) }}
          </div>
        </div>
      </div>
      <div class="right">
        <div class="status-label" :style="{ color: isFallback ? '#fb923c' : '#22c55e' }">
          {{ isFallback ? '&#9889; FALLBACK' : '&#9989; PRIMARY' }}
        </div>
        <div class="since">{{ active?.requestsServed }} requests served</div>
      </div>
    </div>

    <!-- Fallback chain -->
    <div class="section-label">Fallback Chain</div>
    <div class="chain">
      <template v-for="(item, i) in chain" :key="item.model">
        <span v-if="i > 0" class="chain-arrow">&rarr;</span>
        <span class="chain-item"
          :class="{
            active: item.status === 'active' && !isFallback,
            'fallback-active': item.status === 'active' && isFallback,
            cooldown: item.status === 'cooldown'
          }">
          {{ item.alias }}
          <template v-if="item.status === 'active'"> &#10003;</template>
          <template v-if="item.status === 'cooldown'">
            <span class="chain-timer"> &#9201; {{ formatCooldown(item.cooldownRemaining) }}</span>
          </template>
        </span>
      </template>
    </div>

    <hr class="divider">

    <!-- Stats row -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-value green">{{ stats?.primaryRequests ?? 0 }}</div>
        <div class="stat-label">Primary Requests</div>
      </div>
      <div class="stat-card">
        <div class="stat-value orange">{{ stats?.fallbackRequests ?? 0 }}</div>
        <div class="stat-label">Fallback Requests</div>
      </div>
      <div class="stat-card">
        <div class="stat-value red">{{ stats?.cooldownEvents ?? 0 }}</div>
        <div class="stat-label">Cooldown Events</div>
      </div>
      <div class="stat-card">
        <div class="stat-value blue">{{ stats?.primaryUptime ?? 100 }}%</div>
        <div class="stat-label">Primary Uptime</div>
      </div>
    </div>

    <hr class="divider" v-if="history.length > 0">

    <!-- History timeline -->
    <div class="history-section" v-if="history.length > 0">
      <div class="history-title">Recent Model Switches (Today)</div>
      <div class="timeline">
        <div v-for="item in history" :key="item.time + item.model" class="timeline-item">
          <span class="timeline-time">{{ formatTime(item.time) }}</span>
          <span class="timeline-dot" :class="historyDotClass(item)"></span>
          <span class="timeline-model" :style="{ color: historyModelColor(item) }">&rarr; {{ item.alias }}</span>
          <span class="timeline-reason">{{ item.reason }}</span>
          <span v-if="item.duration" class="timeline-duration">
            {{ item.level === 'primary' ? 'on primary' : 'fallback' }} {{ formatDuration(item.duration) }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel {
  background: #1a1d27;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid #2a2d3a;
}
.panel-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 16px;
}
.panel-title {
  font-size: 16px; font-weight: 700;
  display: flex; align-items: center; gap: 8px;
}
.alert-count {
  background: #ef4444; color: white; font-size: 11px;
  padding: 2px 7px; border-radius: 10px; font-weight: 700;
}

/* Alert bar */
.alert-bar {
  border-radius: 8px; padding: 10px 14px;
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; margin-bottom: 16px;
}
.alert-bar.alert-low {
  background: rgba(251, 146, 60, 0.08);
  border: 1px solid rgba(251, 146, 60, 0.25);
  color: #fb923c;
}
.alert-bar.alert-high {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.25);
  color: #ef4444;
}
.alert-bar .icon { font-size: 16px; }

/* Section labels */
.section-label {
  font-size: 11px; color: #555; text-transform: uppercase;
  letter-spacing: 1px; margin-bottom: 8px; margin-top: 4px;
}

/* Current model */
.current-model {
  background: #12141c; border-radius: 10px; padding: 16px;
  margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;
}
.current-model .left { display: flex; align-items: center; gap: 12px; }
.model-name { font-size: 14px; font-weight: 700; }
.provider { font-size: 12px; color: #666; margin-top: 2px; }
.current-model .right { text-align: right; }
.status-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; }
.since { font-size: 12px; color: #666; margin-top: 2px; }

/* Model badge */
.model-badge {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-radius: 8px; font-size: 16px; font-weight: 600;
}
.model-badge.primary { background: rgba(34, 197, 94, 0.12); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.25); }
.model-badge.fallback-low { background: rgba(251, 146, 60, 0.12); color: #fb923c; border: 1px solid rgba(251, 146, 60, 0.25); }
.model-badge.fallback-high { background: rgba(239, 68, 68, 0.12); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.25); }
.pulse-dot {
  width: 8px; height: 8px; border-radius: 50%;
  animation: pulse 2s infinite;
}
.model-badge.primary .pulse-dot { background: #22c55e; }
.model-badge.fallback-low .pulse-dot { background: #fb923c; }
.model-badge.fallback-high .pulse-dot { background: #ef4444; }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* Fallback chain */
.chain {
  display: flex; gap: 4px; align-items: center;
  margin-bottom: 16px; flex-wrap: wrap;
}
.chain-item {
  padding: 5px 10px; border-radius: 6px; font-size: 12px; font-weight: 500;
  border: 1px solid #2a2d3a; color: #666; background: #12141c;
}
.chain-item.active { border-color: #22c55e; color: #22c55e; background: rgba(34, 197, 94, 0.08); }
.chain-item.fallback-active { border-color: #fb923c; color: #fb923c; background: rgba(251, 146, 60, 0.08); }
.chain-item.cooldown { border-color: #ef4444; color: #ef4444; opacity: 0.6; text-decoration: line-through; }
.chain-timer { font-size: 10px; text-decoration: none; display: inline; }
.chain-arrow { color: #333; font-size: 14px; }

.divider { border: none; border-top: 1px solid #222; margin: 16px 0; }

/* Stats row */
.stats-row { display: flex; gap: 12px; }
.stat-card {
  flex: 1; background: #12141c; border-radius: 8px;
  padding: 12px; text-align: center;
}
.stat-value { font-size: 20px; font-weight: 700; }
.stat-label { font-size: 11px; color: #666; margin-top: 4px; text-transform: uppercase; }
.stat-value.green { color: #22c55e; }
.stat-value.orange { color: #fb923c; }
.stat-value.red { color: #ef4444; }
.stat-value.blue { color: #60a5fa; }

/* History timeline */
.history-section { margin-top: 16px; }
.history-title { font-size: 13px; color: #888; margin-bottom: 10px; font-weight: 600; }
.timeline { display: flex; flex-direction: column; gap: 8px; }
.timeline-item {
  display: flex; align-items: center; gap: 12px;
  padding: 8px 12px; border-radius: 8px; background: #12141c; font-size: 13px;
}
.timeline-time { color: #666; font-size: 12px; min-width: 60px; font-family: monospace; }
.timeline-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.timeline-dot.green { background: #22c55e; }
.timeline-dot.orange { background: #fb923c; }
.timeline-dot.red { background: #ef4444; }
.timeline-model { font-weight: 600; }
.timeline-reason { color: #666; font-size: 12px; margin-left: auto; }
.timeline-duration {
  color: #888; font-size: 11px; background: #1a1d27;
  padding: 2px 6px; border-radius: 4px;
}

@media (max-width: 768px) {
  .stats-row { flex-wrap: wrap; }
  .stat-card { flex: 1 1 45%; }
  .current-model { flex-direction: column; gap: 12px; }
  .current-model .right { text-align: left; }
  .timeline-item { flex-wrap: wrap; gap: 8px; }
  .timeline-reason { margin-left: 0; }
}
</style>
