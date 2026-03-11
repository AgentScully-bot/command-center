<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

defineProps<{
  waitingCount: number
  projectCount: number
}>()

interface ModelStatus {
  active: { model: string; alias: string }
  isFallback: boolean
}

const modelStatus = ref<ModelStatus | null>(null)
let pollInterval: ReturnType<typeof setInterval> | null = null

async function fetchModelStatus() {
  try {
    const res = await fetch('/api/model-status')
    if (res.ok) {
      modelStatus.value = await res.json()
    }
  } catch {
    // keep last known value on error
  }
}

const dotClass = computed(() => {
  if (modelStatus.value === null) return 'unknown'
  return modelStatus.value.isFallback ? 'fallback' : 'online'
})

const modelLabel = computed(() => modelStatus.value?.active?.alias ?? 'loading…')

const tooltip = computed(() => {
  if (!modelStatus.value) return undefined
  return `${modelStatus.value.active.model} · ${modelStatus.value.isFallback ? 'fallback' : 'primary'}`
})

onMounted(() => {
  fetchModelStatus()
  pollInterval = setInterval(fetchModelStatus, 60_000)
})

onUnmounted(() => {
  if (pollInterval !== null) clearInterval(pollInterval)
})
</script>

<template>
  <nav class="sidebar">
    <div class="sidebar-brand">
      <h1>Command Center</h1>
      <div class="version">v0.1 · bot-linux</div>
    </div>

    <div class="sidebar-nav">
      <div class="nav-group">
        <div class="nav-label">Overview</div>
        <div class="nav-item active"><span class="icon">&#9632;</span> Dashboard</div>
      </div>

      <div class="nav-group">
        <div class="nav-label">Work</div>
        <div class="nav-item"><span class="icon">&#9654;</span> Projects <span v-if="projectCount" class="badge warn">{{ projectCount }}</span></div>
        <div class="nav-item"><span class="icon">&#9733;</span> Ideas</div>
        <div class="nav-item"><span class="icon">&#10003;</span> Tasks <span v-if="waitingCount" class="badge">{{ waitingCount }}</span></div>
      </div>

      <div class="nav-group">
        <div class="nav-label">System</div>
        <div class="nav-item"><span class="icon">&#9881;</span> Status</div>
        <div class="nav-item"><span class="icon">&#8634;</span> Cron Jobs</div>
        <div class="nav-item"><span class="icon">&#9881;</span> Sub-Agents</div>
        <div class="nav-item"><span class="icon">$</span> Costs</div>
      </div>
    </div>

    <div class="sidebar-footer">
      <div class="agent-row" :title="tooltip">
        <span class="status-dot" :class="dotClass"></span>
        <div>
          <div class="name">Agent Scully</div>
          <div class="model">{{ modelLabel }}</div>
        </div>
      </div>
    </div>
  </nav>
</template>

<style scoped>
.sidebar {
  width: var(--sidebar-w); background: var(--bg-secondary); border-right: 1px solid var(--border);
  display: flex; flex-direction: column; position: fixed; top: 0; bottom: 0; z-index: 10;
}
.sidebar-brand { padding: 20px 16px 16px; border-bottom: 1px solid var(--border); }
.sidebar-brand h1 { font-size: 15px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
.sidebar-brand .version { font-size: 10px; color: var(--text-muted); margin-top: 2px; }

.sidebar-nav { flex: 1; padding: 12px 8px; overflow-y: auto; }
.nav-group { margin-bottom: 8px; }
.nav-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); padding: 8px 12px 4px; }
.nav-item {
  display: flex; align-items: center; gap: 10px; padding: 7px 12px; border-radius: var(--radius-sm);
  color: var(--text-secondary); cursor: pointer; transition: all 0.12s; font-size: 13px;
}
.nav-item:hover { background: var(--bg-hover); color: var(--text-primary); }
.nav-item.active { background: var(--accent-dim); color: var(--accent); font-weight: 500; }
.nav-item .icon { width: 18px; text-align: center; font-size: 14px; opacity: 0.8; }
.nav-item .badge {
  margin-left: auto; font-size: 10px; font-weight: 600; padding: 1px 6px; border-radius: 10px;
  background: var(--red); color: #fff; min-width: 18px; text-align: center;
}
.nav-item .badge.warn { background: var(--yellow); color: #000; }

.sidebar-footer { padding: 12px 16px; border-top: 1px solid var(--border); }
.agent-row { display: flex; align-items: center; gap: 8px; cursor: default; }
.status-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.status-dot.online { background: var(--green); box-shadow: 0 0 6px rgba(52, 211, 153, 0.4); }
.status-dot.fallback { background: var(--yellow); box-shadow: 0 0 6px rgba(234, 179, 8, 0.4); }
.status-dot.unknown { background: var(--text-muted); }
.agent-row .name { font-size: 12px; color: var(--text-secondary); }
.agent-row .model { font-size: 10px; color: var(--text-muted); }

@media (max-width: 768px) {
  .sidebar { display: none; }
}
</style>
