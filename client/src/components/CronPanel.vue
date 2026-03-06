<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  jobs: unknown[]
}>()

const runningId = ref<string | null>(null)

function job(j: unknown) {
  return j as { id: string; name: string; schedule: string; lastRun: string; lastStatus: string; nextRun: string; enabled: boolean }
}

async function runNow(id: string) {
  runningId.value = id
  try {
    await globalThis.fetch('/api/actions/run-cron', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
  } catch { /* silent */ }
  setTimeout(() => { runningId.value = null }, 3000)
}
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div><span class="panel-title">Cron Jobs</span><span class="panel-count">{{ jobs.length }} active</span></div>
    </div>
    <div class="panel-body">
      <div class="cron-row cron-header">
        <span>NAME</span><span>SCHEDULE</span><span>LAST RUN</span><span>NEXT</span><span>OK</span><span></span>
      </div>
      <div v-if="jobs.length === 0" class="empty-state">No cron jobs</div>
      <div v-for="j in jobs" :key="job(j).id" class="cron-row">
        <span class="cron-name">{{ job(j).name }}</span>
        <span class="cron-schedule">{{ job(j).schedule }}</span>
        <span class="cron-last" :style="{ color: job(j).lastStatus === 'error' ? 'var(--yellow)' : 'var(--text-muted)' }">
          {{ job(j).lastStatus === 'error' ? 'Failed' : job(j).lastRun }}
        </span>
        <span class="cron-next">{{ job(j).nextRun }}</span>
        <span class="cron-status" :class="job(j).lastStatus === 'error' ? 'warn' : 'ok'"></span>
        <button class="btn btn-action" :disabled="runningId === job(j).id" @click="runNow(job(j).id)">
          {{ runningId === job(j).id ? '...' : 'Run Now' }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cron-row {
  display: grid; grid-template-columns: 1.2fr 1fr 0.8fr 0.6fr auto auto;
  align-items: center; padding: 9px 16px; border-bottom: 1px solid var(--border); font-size: 12px;
}
.cron-row:last-child { border-bottom: none; }
.cron-header { font-size: 10px; color: var(--text-muted); font-weight: 600; padding: 6px 16px; }
.cron-name { font-weight: 500; color: var(--text-primary); }
.cron-schedule { color: var(--text-secondary); font-family: 'SF Mono', 'Consolas', monospace; font-size: 11px; }
.cron-last { color: var(--text-muted); }
.cron-next { color: var(--text-muted); }
.cron-status { width: 7px; height: 7px; border-radius: 50%; justify-self: center; }
.cron-status.ok { background: var(--green); }
.cron-status.warn { background: var(--yellow); }
.cron-status.fail { background: var(--red); }
.btn-action {
  font-size: 10px; padding: 2px 8px; border-color: var(--border-light); color: var(--text-muted);
}
.btn-action:hover { border-color: var(--accent); color: var(--accent); }
.btn-action:disabled { opacity: 0.5; cursor: default; }

@media (max-width: 768px) {
  .cron-row { grid-template-columns: 1fr auto auto; gap: 6px; padding: 10px 14px; }
  .cron-header { display: none; }
  .cron-schedule, .cron-next { display: none; }
  .cron-name { font-size: 13px; }
  .cron-last { font-size: 11px; }
  .btn-action { padding: 5px 12px; min-height: 32px; }
}
</style>
