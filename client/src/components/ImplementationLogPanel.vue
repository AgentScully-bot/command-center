<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'

const props = defineProps<{
  projectId: string
  agents: any[]
}>()

const logLines = ref<string[]>([])
const logBodyRef = ref<HTMLElement | null>(null)

const runningAgent = computed(() => props.agents.find((a: any) => a.status === 'running') ?? null)
const lastAgent = computed(() => {
  if (runningAgent.value) return runningAgent.value
  const finished = props.agents.filter((a: any) => a.status !== 'running')
  if (!finished.length) return null
  return finished.reduce((latest: any, a: any) => (a.updatedAt > latest.updatedAt ? a : latest), finished[0])
})

const statusLabel = computed(() => {
  if (!lastAgent.value) return ''
  if (lastAgent.value.status === 'running') return 'Running'
  if (lastAgent.value.status === 'done') return 'Completed'
  if (lastAgent.value.status === 'stale') return 'Stale'
  return lastAgent.value.status
})

const statusClass = computed(() => {
  if (!lastAgent.value) return ''
  if (lastAgent.value.status === 'running') return 'pill-running'
  if (lastAgent.value.status === 'done') return 'pill-done'
  return 'pill-stale'
})

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return ''
  const totalSecs = Math.floor(ms / 1000)
  if (totalSecs < 60) return `${totalSecs}s`
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  if (mins < 60) return `${mins}m ${secs}s`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ${Math.floor(mins % 60)}m`
}

function timeAgo(ts: number): string {
  if (!ts) return ''
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

let pollInterval: ReturnType<typeof setInterval> | null = null

async function fetchLog() {
  try {
    const res = await fetch(`/api/projects/${props.projectId}/run-log`)
    if (res.ok) {
      const data = await res.json()
      logLines.value = data.lines ?? []
      if (runningAgent.value) {
        await nextTick()
        if (logBodyRef.value) {
          logBodyRef.value.scrollTop = logBodyRef.value.scrollHeight
        }
      }
    }
  } catch { /* ignore */ }
}

function startPolling() {
  if (pollInterval) return
  fetchLog()
  pollInterval = setInterval(fetchLog, 2000)
}

function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval)
    pollInterval = null
  }
}

watch(runningAgent, (agent) => {
  if (agent) {
    startPolling()
  } else {
    stopPolling()
    fetchLog()
  }
}, { immediate: true })

onUnmounted(stopPolling)
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <span class="panel-title">Log</span>
      <div v-if="lastAgent" class="log-header-meta">
        <span class="log-feature-name">{{ lastAgent.label }}</span>
        <span class="log-status-pill" :class="statusClass">{{ statusLabel }}</span>
        <span v-if="lastAgent.duration" class="log-duration">{{ formatDuration(lastAgent.duration) }}</span>
      </div>
    </div>
    <div class="panel-body">
      <div v-if="!runningAgent && lastAgent" class="log-last-run">
        Last run: {{ timeAgo(lastAgent.updatedAt) }}
      </div>
      <div v-if="!lastAgent" class="empty-state">No agent runs yet</div>
      <div v-else ref="logBodyRef" class="log-body">
        <div v-if="logLines.length === 0" class="log-empty">
          {{ runningAgent ? 'Waiting for output...' : 'No output recorded' }}
        </div>
        <div v-for="(line, i) in logLines" :key="i" class="log-line">{{ line }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel-header {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.log-header-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  overflow: hidden;
}
.log-feature-name {
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}
.log-status-pill {
  font-size: 9px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 3px;
  text-transform: uppercase;
  letter-spacing: 0.3px;
  white-space: nowrap;
  flex-shrink: 0;
}
.pill-running { background: var(--green-dim); color: var(--green); }
.pill-done { background: rgba(100,100,120,0.15); color: var(--text-muted); }
.pill-stale { background: rgba(245,158,11,0.15); color: #f59e0b; }
.log-duration {
  font-size: 10px;
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}
.log-last-run {
  font-size: 10px;
  color: var(--text-muted);
  padding: 6px 16px 4px;
  font-style: italic;
  border-bottom: 1px solid var(--border);
}
.log-body {
  max-height: 400px;
  overflow-y: auto;
  padding: 6px 16px;
  background: var(--bg-primary);
  font-family: 'SF Mono', 'Consolas', monospace;
  font-size: 11px;
  line-height: 1.5;
}
.log-empty {
  color: var(--text-muted);
  font-style: italic;
  padding: 4px 0;
}
.log-line {
  color: var(--text-secondary);
  white-space: pre-wrap;
  word-break: break-all;
}
.empty-state { padding: 12px 16px; text-align: center; color: var(--text-muted); font-size: 11px; }
</style>
