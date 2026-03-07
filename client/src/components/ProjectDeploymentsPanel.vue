<script setup lang="ts">

const props = defineProps<{
  deploys: {
    hasDeployScript: boolean
    service: { active: boolean; since: string } | null
    lastTest: { timestamp: string; passed: boolean; server: any; client: any; duration: string } | null
    recentDeploys: { hash: string; message: string; date: string }[]
  } | null
}>()

function timeAgo(dateStr: string): string {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}

</script>

<template>
  <div class="panel">
    <div class="panel-header"><span class="panel-title">Deployments</span></div>
    <div class="panel-body">
      <!-- No deploy script -->
      <div v-if="!deploys || !deploys.hasDeployScript" class="empty-state">
        No deployments configured
      </div>

      <template v-else>
        <!-- Service status -->
        <div v-if="deploys.service !== null" class="deploy-row">
          <span class="deploy-dot" :class="deploys.service.active ? 'running' : 'stopped'"></span>
          <div class="deploy-info">
            <div class="deploy-label">Service</div>
            <div class="deploy-value">
              {{ deploys.service.active ? 'Running' : 'Stopped' }}
              <span v-if="deploys.service.active && deploys.service.since" class="deploy-meta">
                · since {{ timeAgo(deploys.service.since) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Last test run -->
        <div v-if="deploys.lastTest" class="deploy-row">
          <span class="deploy-dot" :class="deploys.lastTest.passed ? 'running' : 'stopped'"></span>
          <div class="deploy-info">
            <div class="deploy-label">Last Tests</div>
            <div class="deploy-value">
              <span :class="deploys.lastTest.passed ? 'text-green' : 'text-red'">
                {{ deploys.lastTest.passed ? 'Passed' : 'Failed' }}
              </span>
              <span class="deploy-meta">
                · {{ (deploys.lastTest.server?.passed || 0) + (deploys.lastTest.client?.passed || 0) }} tests
                · {{ deploys.lastTest.duration }}
                · {{ timeAgo(deploys.lastTest.timestamp) }}
              </span>
            </div>
          </div>
        </div>

        <!-- Recent deploy commits -->
        <div v-if="deploys.recentDeploys.length" class="section-label">Recent</div>
        <div v-for="c in deploys.recentDeploys" :key="c.hash" class="deploy-commit">
          <span class="commit-hash">{{ c.hash }}</span>
          <span class="commit-msg">{{ c.message }}</span>
          <span class="commit-time">{{ timeAgo(c.date) }}</span>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.deploy-row {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 16px; border-bottom: 1px solid var(--border);
}
.deploy-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
}
.deploy-dot.running { background: var(--green); }
.deploy-dot.stopped { background: var(--red, #ef4444); }
.deploy-info { flex: 1; min-width: 0; }
.deploy-label { font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); }
.deploy-value { font-size: 11px; }
.deploy-meta { color: var(--text-muted); font-size: 10px; }
.text-green { color: var(--green); font-weight: 500; }
.text-red { color: var(--red, #ef4444); font-weight: 500; }
.section-label {
  font-size: 9px; font-weight: 600; text-transform: uppercase;
  letter-spacing: 0.5px; color: var(--text-muted); padding: 8px 16px 4px;
}
.deploy-commit {
  display: flex; align-items: center; gap: 6px;
  padding: 6px 16px; border-bottom: 1px solid var(--border);
  font-size: 11px;
}
.deploy-commit:last-child { border-bottom: none; }
.commit-hash { font-family: 'SF Mono', Consolas, monospace; font-size: 10px; color: var(--accent); flex-shrink: 0; }
.commit-msg { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; color: var(--text-secondary); }
.commit-time { font-size: 10px; color: var(--text-muted); white-space: nowrap; }
.empty-state { padding: 12px 16px; text-align: center; color: var(--text-muted); font-size: 11px; }
</style>
