<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  items: unknown[]
}>()

type LogLevel = 'all' | 'error' | 'warn'
const activeFilter = ref<LogLevel>('all')

interface LogEntry {
  timestamp: string
  level: 'error' | 'warn' | 'info'
  message: string
  source: string
}

function entry(i: unknown): LogEntry {
  return i as LogEntry
}

const filtered = computed(() => {
  if (activeFilter.value === 'all') return props.items
  return props.items.filter((i) => entry(i).level === activeFilter.value)
})

function levelClass(level: string) {
  if (level === 'error') return 'level-error'
  if (level === 'warn') return 'level-warn'
  return 'level-info'
}

function levelDot(level: string) {
  if (level === 'error') return '●'
  if (level === 'warn') return '▲'
  return '○'
}

function filterCount(level: string) {
  if (level === 'all') return props.items.length
  return props.items.filter((i) => entry(i).level === level).length
}
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div><span class="panel-title">Error & Event Log</span><span class="panel-count">{{ items.length }}</span></div>
      <div class="log-filters">
        <button class="filter-btn" :class="{ active: activeFilter === 'all' }" @click="activeFilter = 'all'">All ({{ filterCount('all') }})</button>
        <button class="filter-btn filter-error" :class="{ active: activeFilter === 'error' }" @click="activeFilter = 'error'">Errors ({{ filterCount('error') }})</button>
        <button class="filter-btn filter-warn" :class="{ active: activeFilter === 'warn' }" @click="activeFilter = 'warn'">Warnings ({{ filterCount('warn') }})</button>
      </div>
    </div>
    <div class="log-body">
      <div v-if="filtered.length === 0" class="empty-state">No log entries</div>
      <div v-for="(i, idx) in filtered" :key="idx" class="log-item" :class="levelClass(entry(i).level)">
        <span class="log-dot">{{ levelDot(entry(i).level) }}</span>
        <span class="log-ts">{{ entry(i).timestamp }}</span>
        <span class="log-src">{{ entry(i).source }}</span>
        <span class="log-msg">{{ entry(i).message }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.log-filters {
  display: flex; gap: 4px;
}
.filter-btn {
  padding: 3px 10px; border-radius: var(--radius-sm); border: 1px solid var(--border);
  background: transparent; color: var(--text-muted); font-size: 10px; cursor: pointer;
  font-family: inherit; transition: all 0.12s;
}
.filter-btn:hover { border-color: var(--text-secondary); color: var(--text-secondary); }
.filter-btn.active { border-color: var(--accent); color: var(--accent); background: var(--accent-dim); }
.filter-btn.filter-error.active { border-color: var(--red); color: var(--red); background: var(--red-dim); }
.filter-btn.filter-warn.active { border-color: var(--yellow); color: var(--yellow); background: var(--yellow-dim); }

.log-body {
  max-height: 320px; overflow-y: auto;
}
.log-body::-webkit-scrollbar { width: 5px; }
.log-body::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 3px; }
.log-body::-webkit-scrollbar-track { background: transparent; }

.log-item {
  display: flex; align-items: baseline; gap: 8px; padding: 6px 16px; flex-wrap: wrap;
  border-bottom: 1px solid var(--border); font-size: 11px; font-family: 'SF Mono', 'Fira Code', monospace;
}
.log-item:last-child { border-bottom: none; }

.log-dot { flex-shrink: 0; font-size: 8px; color: var(--text-muted); }
.log-ts { flex-shrink: 0; color: var(--text-muted); min-width: 70px; font-size: 10px; }
.log-src { flex-shrink: 0; color: var(--text-muted); min-width: 60px; font-size: 10px; }
.log-msg { color: var(--text-secondary); word-break: break-word; overflow-wrap: break-word; min-width: 0; flex: 1; }

.level-error .log-dot { color: var(--red); }
.level-error .log-msg { color: var(--red); }
.level-warn .log-dot { color: var(--yellow); }
.level-warn .log-msg { color: var(--yellow); }
.level-info .log-dot { color: var(--text-muted); }

@media (max-width: 768px) {
  .log-item { padding: 8px 14px; font-size: 10px; }
  .log-ts { display: none; }
  .log-src { min-width: 40px; }
  .panel-header { flex-wrap: wrap; gap: 8px; }
  .log-filters { width: 100%; }
  .filter-btn { flex: 1; text-align: center; padding: 6px 8px; min-height: 32px; }
}
</style>
