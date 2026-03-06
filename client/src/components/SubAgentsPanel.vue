<script setup lang="ts">
import { computed, ref } from 'vue'

interface AgentSession {
  project?: string
  pid?: number
  source?: string
  startedAt?: number
  duration?: number
  sessionKey: string
  label: string
  model: string
  modelProvider: string
  inputTokens: number
  outputTokens: number
  cacheRead: number
  totalTokens: number
  updatedAt: number
  status: 'running' | 'completed' | 'errored'
  chatType: string
}

const props = defineProps<{
  agents: unknown[]
}>()

const killingId = ref<string | null>(null)

const HISTORY_LIMIT = 8

const sessions = computed(() => props.agents as AgentSession[])
const running = computed(() => sessions.value.filter(a => a.status === 'running'))
const finished = computed(() => sessions.value.filter(a => a.status !== 'running'))
const history = computed(() => finished.value.slice(0, HISTORY_LIMIT))
const hiddenCount = computed(() => Math.max(0, finished.value.length - HISTORY_LIMIT))

function formatTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M'
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k'
  return String(n)
}

function timeAgo(ts: number): string {
  if (!ts) return ''
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return mins + 'm ago'
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return hrs + 'h ago'
  const days = Math.floor(hrs / 24)
  return days + 'd ago'
}

function shortModel(model: string): string {
  return model
    .replace('claude-', '')
    .replace('gpt-', '')
    .replace(/-\d{8}$/, '')
}

function badgeClass(status: string): string {
  return status === 'errored' ? 'badge-error' : 'badge-success'
}

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return ''
  const totalSecs = Math.floor(ms / 1000)
  if (totalSecs < 60) return `${totalSecs}s`
  const mins = Math.floor(totalSecs / 60)
  const secs = totalSecs % 60
  if (mins < 60) return `${mins}m ${secs}s`
  const hrs = Math.floor(mins / 60)
  const remainMins = mins % 60
  return `${hrs}h ${remainMins}m`
}

async function killAgent(sessionKey: string) {
  killingId.value = sessionKey
  try {
    await globalThis.fetch('/api/actions/kill-agent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: sessionKey }),
    })
  } catch { /* silent */ }
  setTimeout(() => { killingId.value = null }, 3000)
}
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div>
        <span class="panel-title">Sub-Agents</span>
        <span class="panel-count">{{ running.length }} active &middot; {{ finished.length }} history</span>
      </div>
      <span v-if="running.length" class="running-count">{{ running.length }} running</span>
    </div>
    <div class="panel-body">
      <div v-if="sessions.length === 0" class="empty-state">No sub-agent or cron sessions</div>

      <!-- Running agents -->
      <div v-if="running.length" class="section-label">Active</div>
      <div v-for="a in running" :key="a.sessionKey" class="agent-item">
        <span class="agent-pulse running"></span>
        <div class="agent-info-col">
          <div class="agent-task">{{ a.label }}</div>
          <div class="agent-detail">
            {{ shortModel(a.model) }}
            <span class="sep">&middot;</span>
            {{ formatTokens(a.totalTokens) }} tokens
            <span v-if="formatDuration(a.duration)" class="sep">&middot;</span>
            <span v-if="formatDuration(a.duration)">{{ formatDuration(a.duration) }}</span>
            <span v-if="a.chatType === 'cron'" class="agent-badge badge-cron">cron</span>
            <span v-if="a.chatType === 'coding'" class="agent-badge badge-coding">coding</span>
            <span v-if="a.project" class="agent-badge badge-project">{{ a.project }}</span>
          </div>
        </div>
        <div class="agent-runtime running-text">{{ timeAgo(a.updatedAt) }}</div>
        <button class="btn btn-kill" :disabled="killingId === a.sessionKey" @click="killAgent(a.sessionKey)">
          {{ killingId === a.sessionKey ? '...' : 'Kill' }}
        </button>
      </div>

      <!-- Completed / errored agents -->
      <div v-if="history.length" class="section-label">History</div>
      <div v-for="a in history" :key="a.sessionKey" class="agent-item dimmed">
        <span class="agent-pulse" :class="a.status === 'errored' ? 'errored' : 'done'"></span>
        <div class="agent-info-col">
          <div class="agent-task">{{ a.label }}</div>
          <div class="agent-detail">
            {{ shortModel(a.model) }}
            <span class="sep">&middot;</span>
            {{ formatTokens(a.totalTokens) }} tokens
            <span v-if="formatDuration(a.duration)" class="sep">&middot;</span>
            <span v-if="formatDuration(a.duration)">{{ formatDuration(a.duration) }}</span>
            <span class="agent-badge" :class="badgeClass(a.status)">{{ a.status === 'errored' ? 'error' : 'done' }}</span>
            <span v-if="a.chatType === 'cron'" class="agent-badge badge-cron">cron</span>
            <span v-if="a.chatType === 'coding'" class="agent-badge badge-coding">coding</span>
            <span v-if="a.project" class="agent-badge badge-project">{{ a.project }}</span>
          </div>
        </div>
        <div class="agent-runtime">{{ timeAgo(a.updatedAt) }}</div>
      </div>

      <div v-if="hiddenCount > 0" class="more-count">{{ hiddenCount }} more in history</div>
    </div>
  </div>
</template>

<style scoped>
.section-label {
  font-size: 9px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-muted);
  padding: 8px 16px 4px;
}
.agent-item {
  display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--border);
  gap: 10px;
}
.agent-item:last-child { border-bottom: none; }
.agent-item.dimmed { opacity: 0.6; }
.agent-item.dimmed:hover { opacity: 0.85; }

.agent-pulse { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
.agent-pulse.running { background: var(--green); animation: pulse 2s infinite; }
.agent-pulse.done { background: var(--text-muted); }
.agent-pulse.errored { background: var(--red); }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

.agent-info-col { flex: 1; min-width: 0; }
.agent-task { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.agent-detail { font-size: 10px; color: var(--text-muted); margin-top: 2px; display: flex; align-items: center; gap: 4px; }
.sep { opacity: 0.5; }

.agent-runtime { font-size: 11px; color: var(--text-secondary); font-variant-numeric: tabular-nums; white-space: nowrap; }
.agent-runtime.running-text { color: var(--green); }

.running-count { font-size: 11px; color: var(--green); font-weight: 500; }

.agent-badge {
  font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
  padding: 1px 5px; border-radius: 3px;
}
.badge-success { background: var(--green-dim); color: var(--green); }
.badge-error { background: var(--red-dim); color: var(--red); }
.badge-cron { background: var(--purple-dim); color: var(--purple); }
.badge-coding { background: var(--accent-dim); color: var(--accent); }
.badge-project { background: rgba(100,100,120,0.15); color: var(--text-secondary); }
.btn-kill {
  font-size: 10px; padding: 2px 8px; border-color: var(--border-light); color: var(--text-muted);
  flex-shrink: 0; margin-left: 6px;
}
.btn-kill:hover { border-color: var(--red); color: var(--red); }
.btn-kill:disabled { opacity: 0.5; cursor: default; }
.more-count {
  font-size: 10px;
  color: var(--text-muted);
  text-align: center;
  padding: 6px 16px;
  font-style: italic;
}

@media (max-width: 768px) {
  .agent-item { padding: 12px 14px; min-height: 44px; }
  .agent-task { white-space: normal; }
  .btn-kill { padding: 5px 12px; min-height: 32px; }
}
</style>
