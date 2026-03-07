<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useWebSocket } from '../composables/useWebSocket'
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

const { connected: wsConnected } = useWebSocket()

defineProps<{
  system: Record<string, unknown> | null
}>()

defineEmits<{
  refresh: []
}>()

const restarting = ref(false)
const showModelPanel = ref(false)
const historyOpen = ref(false)
const modelWrapRef = ref<HTMLElement | null>(null)

const { data: modelStatus } = useApi<Record<string, unknown>>('/api/model-status', 30000)
const { data: statsData } = useApi<Record<string, unknown>>('/api/stats', 60000)

// Client-side cooldown tick
const tick = ref(0)
let tickTimer: ReturnType<typeof setInterval> | null = null

onMounted(() => {
  tickTimer = setInterval(() => {
    tick.value++
    if (modelStatus.value?.fallbackChain) {
      const chainArr = modelStatus.value.fallbackChain as ChainItem[]
      for (const item of chainArr) {
        if (item.status === 'cooldown' && typeof item.cooldownRemaining === 'number' && item.cooldownRemaining > 0) {
          item.cooldownRemaining--
        }
      }
    }
  }, 1000)
  document.addEventListener('mousedown', onOutsideClick)
})

onUnmounted(() => {
  if (tickTimer) clearInterval(tickTimer)
  document.removeEventListener('mousedown', onOutsideClick)
})

function onOutsideClick(e: MouseEvent) {
  if (showModelPanel.value && modelWrapRef.value && !modelWrapRef.value.contains(e.target as Node)) {
    showModelPanel.value = false
  }
}

// Model status computeds
const isFallback = computed(() => modelStatus.value?.isFallback === true)
const active = computed(() => modelStatus.value?.active as Record<string, unknown> | undefined)
const primary = computed(() => modelStatus.value?.primary as Record<string, unknown> | undefined)
const chain = computed(() => (modelStatus.value?.fallbackChain || []) as ChainItem[])
const stats = computed(() => modelStatus.value?.stats as Record<string, number> | undefined)
const history = computed(() => (modelStatus.value?.history || []) as HistoryItem[])
const fallbackLevel = computed(() => (active.value?.fallbackLevel as number) || 0)

const badgeClass = computed(() => {
  if (!modelStatus.value) return 'primary'
  if (fallbackLevel.value === 0) return 'primary'
  if (fallbackLevel.value <= 2) return 'fallback-low'
  return 'fallback-high'
})

const alertBorderClass = computed(() => {
  if (fallbackLevel.value >= 3) return 'alert-high'
  return 'alert-low'
})

const activeAlias = computed(() => {
  if (!modelStatus.value) return '...'
  return active.value?.alias as string || '...'
})

const fallbackLabel = computed(() => {
  if (!fallbackLevel.value) return ''
  return ` · fallback #${fallbackLevel.value}`
})

const primaryAlias = computed(() => {
  return primary.value?.alias as string || ''
})

const cooldownDisplay = computed(() => {
  void tick.value
  const first = chain.value[0]
  if (!first || first.status !== 'cooldown' || !first.cooldownRemaining) return ''
  const remaining = first.cooldownRemaining as number
  const m = Math.floor(remaining / 60)
  const s = remaining % 60
  return `${m}m ${String(s).padStart(2, '0')}s`
})

const primaryCooldownDisplay = computed(() => {
  void tick.value
  const first = chain.value[0]
  if (!first || first.status !== 'cooldown' || !first.cooldownRemaining) return ''
  const m = Math.floor((first.cooldownRemaining as number) / 60)
  return `${m}m remaining`
})

const errorCount = computed(() => {
  const base = Number(statsData.value?.activeErrors ?? 0)
  const fallbackExtra = isFallback.value ? 1 : 0
  return base + fallbackExtra
})

function channelStatus(system: Record<string, unknown> | null, name: string): string {
  if (!system?.channels) return 'ok'
  const channels = system.channels as Record<string, string>
  return channels[name] || 'ok'
}

async function restartGateway() {
  restarting.value = true
  try {
    await globalThis.fetch('/api/actions/restart-gateway', { method: 'POST' })
  } catch { /* silent */ }
  setTimeout(() => { restarting.value = false }, 3000)
}

function formatCost(n: unknown): string {
  const num = Number(n)
  if (isNaN(num)) return '$—'
  return `$${num.toFixed(2)}`
}

function formatTokens(n: unknown): string {
  const num = Number(n) || 0
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M'
  if (num >= 1_000) return Math.round(num / 1_000) + 'k'
  return String(num)
}

function formatSince(iso: unknown): string {
  if (!iso) return ''
  const d = new Date(iso as string)
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
  if (item.level === 'primary') return 'g'
  return 'o'
}

function historyModelColor(item: HistoryItem): string {
  if (item.level === 'primary') return '#22c55e'
  return '#fb923c'
}
</script>

<template>
  <header class="topbar">
    <!-- Title -->
    <span class="topbar-title">Command Center</span>

    <!-- Health group -->
    <div class="pill-group desktop-only">
      <span class="status-pill">
        <span class="dot" :class="system?.gatewayService === 'running' ? 'ok' : 'err'"></span>Gateway
        <button class="restart-btn" :disabled="restarting" @click="restartGateway">
          {{ restarting ? '…' : '↺' }}
        </button>
      </span>
      <span class="status-pill">
        <span class="dot" :class="channelStatus(system, 'telegram')"></span>Telegram
      </span>
      <span class="status-pill ws-pill">
        <span class="dot" :class="wsConnected ? 'ok' : 'warn'"></span>
        {{ wsConnected ? 'Live' : 'Polling' }}
      </span>
    </div>

    <!-- Model badge group (with dropdown) -->
    <div class="pill-group model-dropdown-wrap desktop-only" ref="modelWrapRef">
      <button class="model-badge-btn" :class="badgeClass" @click="showModelPanel = !showModelPanel">
        <span class="pulse-dot"></span>
        <span class="badge-text">{{ activeAlias }}{{ fallbackLabel }}</span>
        <span class="badge-chevron" :class="{ open: showModelPanel }">▾</span>
      </button>
      <span v-if="isFallback && cooldownDisplay" class="cooldown-inline">
        {{ primaryAlias }} ⏱ {{ cooldownDisplay }}
      </span>

      <!-- Dropdown panel -->
      <div v-if="showModelPanel" class="model-dropdown">
        <!-- Alert bar -->
        <div v-if="isFallback" class="dropdown-alert" :class="alertBorderClass">
          ⚠️ Running on <strong>fallback #{{ fallbackLevel }}</strong> —
          {{ primary?.alias }} rate-limited since {{ formatSince(active?.since) }}
          · cooldown: {{ primaryCooldownDisplay }}
        </div>

        <!-- Active row -->
        <div class="dropdown-active-row">
          <span class="dr-badge" :class="badgeClass">
            <span class="pulse-dot"></span>{{ activeAlias }}
          </span>
          <span class="dr-model-name">{{ active?.provider }}/{{ active?.model }}</span>
          <span class="dr-status-pill" :class="isFallback ? 'fallback' : 'primary'">
            {{ isFallback ? '⚡ Fallback #' + fallbackLevel : '✓ Primary' }}
          </span>
          <span class="dr-meta">since {{ formatSince(active?.since) }} · {{ active?.requestsServed }} req</span>
        </div>

        <!-- Inline stats -->
        <div class="dropdown-stats">
          <div class="dstat"><span class="dstat-num g">{{ stats?.primaryRequests ?? 0 }}</span> primary</div>
          <div class="dstat"><span class="dstat-num o">{{ stats?.fallbackRequests ?? 0 }}</span> fallback</div>
          <div class="dstat"><span class="dstat-num r">{{ stats?.cooldownEvents ?? 0 }}</span> cooldowns</div>
          <div class="dstat"><span class="dstat-num b">{{ stats?.primaryUptime ?? 100 }}%</span> uptime</div>
        </div>

        <!-- Fallback chain -->
        <div class="dropdown-chain">
          <template v-for="(item, i) in chain" :key="item.model">
            <span v-if="i > 0" class="chain-arrow">→</span>
            <span class="chain-item" :class="{
              active: item.status === 'active' && !isFallback,
              'fallback-active': item.status === 'active' && isFallback,
              cooldown: item.status === 'cooldown'
            }">
              {{ item.alias }}
              <template v-if="item.status === 'active'"> ✓</template>
              <span v-if="item.status === 'cooldown'" class="chain-timer"> ⏱ {{ formatCooldown(item.cooldownRemaining) }}</span>
            </span>
          </template>
        </div>

        <hr class="dd-divider">

        <!-- History toggle -->
        <button class="history-toggle" @click="historyOpen = !historyOpen">
          <span class="ti" :class="{ open: historyOpen }">▶</span>
          <span class="tl">Recent Model Switches</span>
          <span class="tc">{{ history.length }} today</span>
        </button>
        <div class="history-body" :class="{ open: historyOpen }">
          <div class="timeline">
            <div v-for="item in history" :key="item.time + item.model" class="timeline-item">
              <span class="ttime">{{ formatTime(item.time) }}</span>
              <span class="tdot" :class="historyDotClass(item)"></span>
              <span class="tmodel" :style="{ color: historyModelColor(item) }">→ {{ item.alias }}</span>
              <span class="treason">{{ item.reason }}</span>
              <span v-if="item.duration" class="tduration">
                {{ item.level === 'primary' ? 'primary' : 'fallback' }} {{ formatDuration(item.duration) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Stats group -->
    <div class="pill-group stats-group desktop-only">
      <span class="stat-pill">↑ <span class="stat-val">{{ statsData?.uptime || '—' }}</span></span>
      <span class="stat-pill">Sessions <span class="stat-val">{{ statsData?.sessionsToday ?? '—' }}</span></span>
      <span class="stat-pill">
        <span class="stat-val">{{ formatCost(statsData?.costToday) }}</span>
        <span class="stat-sep">·</span>
        <span class="stat-val muted">{{ formatCost(statsData?.costMonth) }}/mo</span>
      </span>
      <span class="stat-pill">
        <span class="stat-val">{{ formatTokens(statsData?.tokensIn) }}in</span>
        <span class="stat-sep">/</span>
        <span class="stat-val">{{ formatTokens(statsData?.tokensOut) }} out</span>
      </span>
      <span class="stat-pill">
        Errors <span class="stat-val" :class="{ red: errorCount > 0, green: errorCount === 0 }">{{ errorCount }}</span>
      </span>
    </div>

    <div class="topbar-spacer"></div>
    <button class="btn desktop-only" @click="$emit('refresh')">↺ Refresh</button>

    <!-- Mobile -->
    <span class="mobile-status-dot" :class="system?.gatewayService === 'running' ? 'ok' : 'err'"></span>
    <button class="btn mobile-settings-btn" @click="$emit('refresh')">⚙</button>
  </header>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 0 20px;
  height: 48px;
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 100;
}

.topbar-title {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  padding-right: 16px;
  border-right: 1px solid var(--border);
  margin-right: 8px;
}

/* Pill groups */
.pill-group {
  display: flex;
  align-items: center;
  gap: 2px;
  padding-right: 12px;
  border-right: 1px solid var(--border);
  margin-right: 4px;
}
.pill-group.stats-group {
  border-right: none;
  margin-right: 0;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: 5px;
  font-size: 12px;
  color: #888;
  white-space: nowrap;
  border: 1px solid transparent;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 9px;
  border-radius: 5px;
  font-size: 12px;
  color: #666;
  white-space: nowrap;
}

.stat-val {
  font-weight: 600;
  font-size: 12px;
  color: #aaa;
}
.stat-val.red   { color: var(--red); }
.stat-val.green { color: var(--green); }
.stat-val.muted { color: #555; }
.stat-sep { color: #333; margin: 0 2px; }

/* Status dots */
.dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
}
.dot.ok   { background: var(--green); }
.dot.warn { background: var(--yellow); }
.dot.err  { background: var(--red); }

/* Restart button */
.restart-btn {
  font-size: 10px; padding: 1px 5px;
  border-radius: 3px;
  border: 1px solid var(--border-light);
  background: none;
  color: #555;
  cursor: pointer;
  margin-left: 2px;
}
.restart-btn:hover { border-color: var(--yellow); color: var(--yellow); }
.restart-btn:disabled { opacity: 0.5; cursor: default; }

/* Model badge button */
.model-badge-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 11px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: opacity 0.15s;
  background: none;
  font-family: inherit;
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
}

.badge-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  min-width: 0;
}
.model-badge-btn:hover { opacity: 0.85; }
.model-badge-btn.primary {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border-color: rgba(34, 197, 94, 0.2);
}
.model-badge-btn.fallback-low {
  background: rgba(251, 146, 60, 0.1);
  color: #fb923c;
  border-color: rgba(251, 146, 60, 0.2);
}
.model-badge-btn.fallback-high {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.2);
}

.pulse-dot {
  width: 7px; height: 7px; border-radius: 50%;
  animation: pulse 2s infinite;
}
.model-badge-btn.primary .pulse-dot    { background: #22c55e; }
.model-badge-btn.fallback-low .pulse-dot  { background: #fb923c; }
.model-badge-btn.fallback-high .pulse-dot { background: #ef4444; }
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.badge-chevron {
  font-size: 9px; opacity: 0.6; margin-left: 1px;
  transition: transform 0.2s;
}
.badge-chevron.open { transform: rotate(180deg); }

.cooldown-inline {
  font-size: 11px;
  color: #fb923c;
  background: rgba(251, 146, 60, 0.08);
  padding: 2px 6px;
  border-radius: 4px;
  font-weight: 400;
  white-space: nowrap;
}

/* Dropdown */
.model-dropdown-wrap {
  position: relative;
}

.model-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  width: 520px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  z-index: 200;
  padding: 16px 20px;
}

/* Dropdown alert */
.dropdown-alert {
  border-radius: 7px;
  padding: 7px 11px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  margin-bottom: 12px;
}
.dropdown-alert.alert-low {
  background: rgba(251, 146, 60, 0.08);
  border: 1px solid rgba(251, 146, 60, 0.2);
  color: #fb923c;
}
.dropdown-alert.alert-high {
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #ef4444;
}

/* Dropdown active row */
.dropdown-active-row {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #12141c;
  border-radius: 7px;
  padding: 8px 11px;
  margin-bottom: 10px;
}
.dr-badge {
  display: inline-flex; align-items: center; gap: 5px;
  padding: 3px 9px; border-radius: 5px;
  font-size: 12px; font-weight: 600;
}
.dr-badge.primary { background: rgba(34, 197, 94, 0.12); color: #22c55e; border: 1px solid rgba(34, 197, 94, 0.25); }
.dr-badge.fallback-low { background: rgba(251, 146, 60, 0.12); color: #fb923c; border: 1px solid rgba(251, 146, 60, 0.25); }
.dr-badge.fallback-high { background: rgba(239, 68, 68, 0.12); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.25); }
.dr-badge .pulse-dot { width: 6px; height: 6px; }
.dr-model-name { font-size: 11px; color: #555; }
.dr-status-pill {
  font-size: 10px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.5px; padding: 2px 6px; border-radius: 3px;
}
.dr-status-pill.primary { color: #22c55e; background: rgba(34, 197, 94, 0.08); }
.dr-status-pill.fallback { color: #fb923c; background: rgba(251, 146, 60, 0.08); }
.dr-meta { font-size: 11px; color: #444; margin-left: auto; white-space: nowrap; }

/* Dropdown stats */
.dropdown-stats {
  display: flex;
  gap: 0;
  font-size: 11px;
  color: #555;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.dstat {
  display: flex; align-items: center; gap: 4px;
  padding: 0 10px;
  border-right: 1px solid var(--border);
}
.dstat:first-child { padding-left: 0; }
.dstat:last-child { border-right: none; }
.dstat-num { font-weight: 700; font-size: 12px; }
.dstat-num.g { color: #22c55e; }
.dstat-num.o { color: #fb923c; }
.dstat-num.r { color: #ef4444; }
.dstat-num.b { color: #60a5fa; }

/* Fallback chain */
.dropdown-chain {
  display: flex; gap: 4px; align-items: center;
  flex-wrap: wrap; margin-bottom: 12px;
}
.chain-item {
  padding: 3px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;
  border: 1px solid var(--border); color: #555; background: #12141c;
}
.chain-item.active         { border-color: #22c55e; color: #22c55e; background: rgba(34, 197, 94, 0.08); }
.chain-item.fallback-active{ border-color: #fb923c; color: #fb923c; background: rgba(251, 146, 60, 0.08); }
.chain-item.cooldown       { border-color: #ef4444; color: #ef4444; opacity: 0.55; text-decoration: line-through; }
.chain-timer               { font-size: 10px; text-decoration: none; }
.chain-arrow               { color: var(--border); font-size: 12px; }

.dd-divider { border: none; border-top: 1px solid var(--border); margin: 10px 0; }

/* History toggle */
.history-toggle {
  display: flex; align-items: center; gap: 6px;
  background: none; border: none; cursor: pointer;
  font-size: 11px; color: #555; padding: 0;
  width: 100%; text-align: left;
  font-family: inherit;
}
.history-toggle:hover { color: #888; }
.history-toggle .tl { font-weight: 600; }
.history-toggle .ti {
  font-size: 9px; transition: transform 0.2s; display: inline-block;
}
.history-toggle .ti.open { transform: rotate(90deg); }
.history-toggle .tc {
  font-size: 10px; background: var(--bg-tertiary); border: 1px solid var(--border);
  color: #777; padding: 1px 5px; border-radius: 3px; margin-left: auto;
}
.history-body {
  overflow: hidden; max-height: 0; opacity: 0;
  transition: max-height 0.25s ease, opacity 0.2s ease;
}
.history-body.open { max-height: 400px; opacity: 1; }
.timeline { display: flex; flex-direction: column; gap: 5px; margin-top: 8px; }
.timeline-item {
  display: flex; align-items: center; gap: 8px;
  padding: 6px 9px; border-radius: 6px; background: #12141c; font-size: 11px;
}
.ttime { color: #444; font-size: 10px; min-width: 48px; font-family: monospace; }
.tdot  { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.tdot.g { background: #22c55e; }
.tdot.o { background: #fb923c; }
.tdot.r { background: #ef4444; }
.tmodel { font-weight: 600; }
.treason { color: #444; font-size: 10px; margin-left: auto; }
.tduration { color: #555; font-size: 10px; background: #1a1d27; padding: 1px 4px; border-radius: 3px; }

/* Spacer */
.topbar-spacer { flex: 1; }

/* Mobile */
.mobile-status-dot { display: none; }
.mobile-settings-btn { display: none; }

@media (max-width: 768px) {
  .topbar { padding: 8px 16px; }
  .desktop-only { display: none !important; }
  .mobile-status-dot {
    display: block;
    width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  }
  .mobile-status-dot.ok { background: var(--green); }
  .mobile-status-dot.err { background: var(--red); }
  .mobile-settings-btn {
    display: flex;
    width: 32px; height: 32px; border-radius: 50%; background: var(--bg-tertiary);
    align-items: center; justify-content: center; font-size: 14px;
    color: var(--text-secondary); border: none; padding: 0; cursor: pointer;
  }
  .topbar-title { font-size: 20px; font-weight: 700; }
}
@media (min-width: 769px) {
  .topbar-title { font-size: 14px; }
}
</style>
