<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{ agents: any[] }>()

const HISTORY_LIMIT = 2

const active = computed(() => props.agents.filter((a: any) => a.status === 'running'))
const history = computed(() => {
  const finished = props.agents.filter((a: any) => a.status !== 'running')
  return finished.slice(0, HISTORY_LIMIT)
})
const hiddenCount = computed(() => {
  const total = props.agents.filter((a: any) => a.status !== 'running').length
  return Math.max(0, total - HISTORY_LIMIT)
})

function formatTime(ts: number): string {
  if (!ts) return ''
  const diff = Date.now() - ts
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  return `${hrs}h ago`
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
</script>

<template>
  <div class="panel">
    <div class="panel-header"><span class="panel-title">Agents on This Project</span></div>
    <div class="panel-body">
      <div v-if="agents.length === 0" class="empty-state">No agents working on this project</div>

      <!-- Active agents -->
      <div v-if="active.length" class="section-label">Active</div>
      <div v-for="a in active" :key="a.sessionKey" class="agent-item-sm">
        <span class="agent-dot running"></span>
        <div class="agent-sm-info">
          <div class="agent-sm-task">{{ a.label }}</div>
          <div class="agent-sm-meta">
            {{ a.model }} &middot; running
            <span v-if="formatDuration(a.duration)" class="duration">&middot; {{ formatDuration(a.duration) }}</span>
          </div>
        </div>
        <div class="agent-sm-time">{{ formatTime(a.updatedAt) }}</div>
      </div>

      <!-- History -->
      <div v-if="history.length" class="section-label">History</div>
      <div v-for="a in history" :key="a.sessionKey" class="agent-item-sm dimmed">
        <span class="agent-dot" :class="a.status === 'stale' ? 'stale' : 'done'"></span>
        <div class="agent-sm-info">
          <div class="agent-sm-task">{{ a.label }}</div>
          <div class="agent-sm-meta">
            {{ a.model }} &middot; {{ a.status }}
            <span v-if="formatDuration(a.duration)" class="duration">&middot; {{ formatDuration(a.duration) }}</span>
          </div>
        </div>
        <div class="agent-sm-time">{{ formatTime(a.updatedAt) }}</div>
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
.agent-item-sm { display: flex; align-items: center; gap: 8px; padding: 8px 16px; border-bottom: 1px solid var(--border); }
.agent-item-sm:last-child { border-bottom: none; }
.agent-item-sm.dimmed { opacity: 0.6; }
.agent-item-sm.dimmed:hover { opacity: 0.85; }
.agent-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.agent-dot.running { background: var(--green); animation: pulse 2s infinite; }
.agent-dot.done { background: var(--text-muted); }
.agent-dot.stale { background: #f59e0b; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
.agent-sm-info { flex: 1; min-width: 0; }
.agent-sm-task { font-size: 11px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.agent-sm-meta { font-size: 10px; color: var(--text-muted); }
.agent-sm-time { font-size: 10px; color: var(--text-muted); white-space: nowrap; }
.duration { color: var(--text-secondary); }
.empty-state { padding: 12px 16px; text-align: center; color: var(--text-muted); font-size: 11px; }
.more-count {
  font-size: 10px;
  color: var(--text-muted);
  text-align: center;
  padding: 6px 16px;
  font-style: italic;
}

@media (max-width: 768px) {
  .agent-item-sm { padding: 12px 14px; min-height: 44px; }
  .agent-sm-task { white-space: normal; font-size: 13px; }
}
</style>
