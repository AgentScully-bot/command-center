<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useWebSocket } from '../composables/useWebSocket'
import { useApi } from '../composables/useApi'

const { connected: wsConnected } = useWebSocket()

defineProps<{
  system: Record<string, unknown> | null
}>()

defineEmits<{
  refresh: []
}>()

const restarting = ref(false)

const { data: modelStatus } = useApi<Record<string, unknown>>('/api/model-status', 30000)

// Client-side cooldown timer
const cooldownDisplay = ref('')
let cooldownTimer: ReturnType<typeof setInterval> | null = null

function updateCooldownTimer() {
  if (!modelStatus.value) return
  const chain = modelStatus.value.fallbackChain as Array<Record<string, unknown>> | undefined
  if (!chain) return
  const primary = chain[0]
  if (primary?.status === 'cooldown' && typeof primary.cooldownRemaining === 'number') {
    const remaining = Math.max(0, primary.cooldownRemaining - 1)
    primary.cooldownRemaining = remaining
    const m = Math.floor(remaining / 60)
    const s = remaining % 60
    cooldownDisplay.value = `${m}m ${String(s).padStart(2, '0')}s`
  } else {
    cooldownDisplay.value = ''
  }
}

onMounted(() => {
  cooldownTimer = setInterval(updateCooldownTimer, 1000)
})
onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer)
})

const badgeClass = computed(() => {
  if (!modelStatus.value) return 'primary'
  const level = (modelStatus.value.active as Record<string, unknown>)?.fallbackLevel as number
  if (!level || level === 0) return 'primary'
  if (level <= 2) return 'fallback-low'
  return 'fallback-high'
})

const activeAlias = computed(() => {
  if (!modelStatus.value) return '...'
  const active = modelStatus.value.active as Record<string, unknown>
  return active?.alias as string || '...'
})

const isFallback = computed(() => modelStatus.value?.isFallback === true)

const fallbackLabel = computed(() => {
  if (!modelStatus.value) return ''
  const level = (modelStatus.value.active as Record<string, unknown>)?.fallbackLevel as number
  return level ? ` (fallback #${level})` : ''
})

const primaryAlias = computed(() => {
  if (!modelStatus.value) return ''
  return (modelStatus.value.primary as Record<string, unknown>)?.alias as string || ''
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
</script>

<template>
  <header class="topbar">
    <div class="topbar-left">
      <h2 class="topbar-title">Command Center</h2>
      <div class="system-health desktop-only">
        <div class="health-item">
          <span class="health-dot" :class="system?.gatewayService === 'running' ? 'ok' : 'err'"></span>
          Gateway
          <button class="btn btn-action" :disabled="restarting" @click="restartGateway">
            {{ restarting ? 'Restarting...' : 'Restart' }}
          </button>
        </div>
        <div class="health-item">
          <span class="health-dot" :class="channelStatus(system, 'telegram')"></span>
          Telegram
        </div>
        <div class="health-item ws-status">
          <span class="health-dot" :class="wsConnected ? 'ok' : 'warn'"></span>
          {{ wsConnected ? 'Live' : 'Polling' }}
        </div>
        <div class="health-item model-badge-wrapper">
          <span class="topbar-label">Model</span>
          <span class="model-badge" :class="badgeClass">
            <span class="pulse-dot"></span>
            {{ activeAlias }}{{ fallbackLabel }}
          </span>
          <span v-if="isFallback && cooldownDisplay" class="cooldown-tag">
            {{ primaryAlias }} cooldown: {{ cooldownDisplay }}
          </span>
        </div>
      </div>
    </div>
    <div class="topbar-actions">
      <span class="mobile-status-dot" :class="system?.gatewayService === 'running' ? 'ok' : 'err'"></span>
      <button class="btn desktop-only" @click="$emit('refresh')">Refresh</button>
      <button class="btn mobile-settings-btn" @click="$emit('refresh')">&#9881;</button>
    </div>
  </header>
</template>

<style scoped>
.topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px; border-bottom: 1px solid var(--border); background: var(--bg-secondary);
  position: sticky; top: 0; z-index: 5;
}
.topbar-left { display: flex; align-items: center; gap: 12px; }
.topbar-left h2 { font-size: 16px; font-weight: 600; }
.system-health { display: flex; align-items: center; gap: 16px; }
.health-item { display: flex; align-items: center; gap: 6px; font-size: 11px; color: var(--text-secondary); }
.health-dot { width: 6px; height: 6px; border-radius: 50%; }
.health-dot.ok { background: var(--green); }
.health-dot.warn { background: var(--yellow); }
.health-dot.err { background: var(--red); }
.topbar-actions { display: flex; gap: 6px; }
.btn-action {
  font-size: 10px; padding: 2px 8px; margin-left: 6px;
  border-color: var(--border-light); color: var(--text-muted);
}
.btn-action:hover { border-color: var(--yellow); color: var(--yellow); }
.btn-action:disabled { opacity: 0.5; cursor: default; }
.ws-status { opacity: 0.6; font-size: 10px; }

/* Model badge */
.model-badge-wrapper { gap: 8px; }
.topbar-label { color: #888; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
.model-badge {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 4px 12px; border-radius: 8px; font-size: 13px; font-weight: 600;
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

.cooldown-tag {
  font-size: 11px; color: #fb923c;
  background: rgba(251, 146, 60, 0.1);
  padding: 3px 8px; border-radius: 4px; font-weight: 500;
}

.mobile-status-dot { display: none; }
.mobile-settings-btn { display: none; }

@media (max-width: 768px) {
  .topbar { padding: 8px 16px 12px; }
  .topbar-title { font-size: 20px; font-weight: 700; }
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
    color: var(--text-secondary); border: none; padding: 0;
  }
}
@media (min-width: 769px) {
  .topbar-title { font-size: 16px; }
}
</style>
