<script setup lang="ts">
import { ref } from 'vue'
import { useWebSocket } from '../composables/useWebSocket'

const { connected: wsConnected } = useWebSocket()

defineProps<{
  system: Record<string, unknown> | null
}>()

defineEmits<{
  refresh: []
}>()

const restarting = ref(false)

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
