<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import TaskBoard from '../components/TaskBoard.vue'
import ToastNotification from '../components/ToastNotification.vue'
import ProjectAgentsPanel from '../components/ProjectAgentsPanel.vue'
import ProjectWaitingPanel from '../components/ProjectWaitingPanel.vue'
import DecisionsPanel from '../components/DecisionsPanel.vue'
import ProjectActivityPanel from '../components/ProjectActivityPanel.vue'
import ProjectGitPanel from '../components/ProjectGitPanel.vue'
import ProjectDeploymentsPanel from '../components/ProjectDeploymentsPanel.vue'
import { useApi } from '../composables/useApi'

const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id as string)

const { data: project, refresh } = useApi<Record<string, any>>(`/api/projects/${id.value}`)
const { data: agents } = useApi<any[]>('/api/agents')
const { data: git } = useApi<Record<string, any>>(`/api/projects/${id.value}/git`)
const { data: activity } = useApi<any[]>(`/api/projects/${id.value}/activity`)
const { data: prompts } = useApi<any[]>(`/api/projects/${id.value}/prompts`)
const { data: deployInfo, refresh: refreshDeploy } = useApi<Record<string, any>>(`/api/projects/${id.value}/deploys`)

const projectAgents = computed(() => {
  if (!agents.value) return []
  return agents.value.filter((a: any) => a.project === id.value)
})

const waitingItems = computed(() => {
  if (!project.value?.tasks) return []
  const items: any[] = []
  for (const section of ['blocked', 'inProgress', 'approved', 'planned'] as const) {
    for (const group of (project.value.tasks[section] || [])) {
      for (const task of group.tasks) {
        if (task.waiting) {
          items.push({ text: task.text, waiting: task.waiting, section, feature: group.feature })
        }
      }
    }
  }
  return items
})

// Status bar computed properties

const progressPillClass = computed(() => {
  const p = project.value?.progress ?? 0
  if (p >= 80) return 'green'
  if (p >= 40) return 'orange'
  return 'muted'
})

const deployLabel = computed(() => {
  const d = deployInfo.value
  if (!d || d.status === 'unknown') return 'no deploy data'
  if (d.status === 'success') return `✓ deployed ${d.relativeTime}`
  if (d.status === 'failed') return `✗ deploy failed`
  return 'no deploy data'
})

const deployPillClass = computed(() => {
  const d = deployInfo.value
  if (!d || d.status === 'unknown') return 'muted'
  if (d.status === 'success') return 'green'
  if (d.status === 'failed') return 'red'
  return 'muted'
})

const runningAgentCount = computed(() => {
  return projectAgents.value.filter((a: any) => a.status === 'running').length
})

const agentLabel = computed(() => {
  const n = runningAgentCount.value
  if (n === 0) return 'no agents'
  return `${n} agent${n === 1 ? '' : 's'} running`
})

const agentPillClass = computed(() => {
  return runningAgentCount.value > 0 ? 'green' : 'muted'
})

const toastRef = ref<InstanceType<typeof ToastNotification> | null>(null)

function showToast(message: string, type: 'success' | 'error' | 'info' = 'info') {
  toastRef.value?.addToast(message, type)
}

async function approveTask(task: string) {
  await fetch(`/api/projects/${id.value}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task }),
  })
  refresh()
}

async function approveFeature(feature: string) {
  await fetch(`/api/projects/${id.value}/approve`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ feature }),
  })
  refresh()
}

const activeSideTab = ref('waiting')
const sideTabs = [
  { key: 'waiting', label: 'Waiting' },
  { key: 'agents', label: 'Agents' },
  { key: 'git', label: 'Git' },
  { key: 'decisions', label: 'Decisions' },
  { key: 'activity', label: 'Activity' },
  { key: 'deploys', label: 'Deploys' },
]

async function deploy() {
  if (!confirm('Run deploy.sh?')) return
  const res = await fetch(`/api/projects/${id.value}/deploy`, { method: 'POST' })
  const data = await res.json()
  if (data.ok) {
    alert('Deploy complete')
    refreshDeploy()
  } else {
    alert('Deploy failed: ' + (data.error || 'unknown'))
    refreshDeploy()
  }
}
</script>

<template>
  <div v-if="project">
    <header class="detail-topbar">
      <div class="topbar-left">
        <a class="back-link" @click="router.push('/')">&larr; Projects</a>
        <h2>{{ project.name }}</h2>
        <span class="status-badge badge-active" v-if="project.status === 'active'">Active</span>
        <span class="status-badge badge-paused" v-else-if="project.status === 'paused'">Paused</span>
        <span class="status-badge badge-done" v-else>{{ project.status }}</span>
      </div>
      <div class="topbar-actions">
        <button class="btn success">Spawn Coder</button>
        <button class="btn">Spawn Reviewer</button>
        <button class="btn" @click="deploy">Deploy</button>
        <button class="btn" @click="router.push('/')">Dashboard</button>
      </div>
    </header>

    <div class="content">
      <div class="project-header">
        <!-- Row 1: Quick status bar -->
        <div class="project-status-bar">
          <!-- Task progress -->
          <span v-if="project.tasks" class="status-pill" :class="progressPillClass">
            {{ project.tasks.counts.done }}/{{ project.tasks.counts.total }} tasks · {{ project.progress }}%
          </span>

          <!-- Git status -->
          <span v-if="project.git?.branch" class="status-pill">
            <span class="git-dot" :class="project.git.clean ? 'clean' : 'dirty'"></span>
            {{ project.git.branch }}
          </span>

          <!-- Deploy status -->
          <span class="status-pill" :class="deployPillClass">
            {{ deployLabel }}
          </span>

          <!-- Agents -->
          <span class="status-pill" :class="agentPillClass">
            <span v-if="runningAgentCount > 0" class="agent-pulse"></span>
            {{ agentLabel }}
          </span>
        </div>

        <!-- Row 2: Compact meta -->
        <div class="project-meta-compact">
          <span class="project-desc-inline">{{ project.description }}</span>
          <template v-if="project.stack || project.started || project.port">
            <span class="meta-divider">|</span>
            <span class="meta-inline" v-if="project.stack">Stack: {{ project.stack }}</span>
            <span class="meta-dot" v-if="project.stack && (project.started || project.port)">·</span>
            <span class="meta-inline" v-if="project.started">Started: {{ project.started }}</span>
            <span class="meta-dot" v-if="project.started && project.port">·</span>
            <span class="meta-inline" v-if="project.port">Port: {{ project.port }}</span>
          </template>
        </div>
      </div>

      <div class="project-grid">
        <TaskBoard
          :tasks="project.tasks"
          :project-id="id"
          :prompts="prompts || []"
          @approve-task="approveTask"
          @approve-feature="approveFeature"
          @refresh="refresh"
          @toast="showToast"
        />

        <div class="sidebar-panels">
          <!-- Mobile tab bar -->
          <div class="side-tab-bar mobile-only">
            <div
              v-for="tab in sideTabs"
              :key="tab.key"
              class="side-tab"
              :class="{ active: activeSideTab === tab.key }"
              @click="activeSideTab = tab.key"
            >{{ tab.label }}</div>
          </div>

          <!-- Desktop: show all, Mobile: show selected -->
          <ProjectWaitingPanel v-show="activeSideTab === 'waiting'" class="side-panel" :items="waitingItems" />
          <ProjectAgentsPanel v-show="activeSideTab === 'agents'" class="side-panel" :agents="projectAgents" />
          <ProjectGitPanel v-show="activeSideTab === 'git'" class="side-panel" :git="git as any" />
          <DecisionsPanel v-show="activeSideTab === 'decisions'" class="side-panel" :decisions="project.decisions || []" />
          <ProjectActivityPanel v-show="activeSideTab === 'activity'" class="side-panel" :activity="activity || []" />
          <ProjectDeploymentsPanel v-show="activeSideTab === 'deploys'" class="side-panel" :deploys="deployInfo as any" />
        </div>
      </div>
    </div>
  </div>
  <div v-else class="content">
    <div class="empty-state">Loading project...</div>
  </div>
  <ToastNotification ref="toastRef" />
</template>

<style scoped>
.detail-topbar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 24px; border-bottom: 1px solid var(--border); background: var(--bg-secondary);
  position: sticky; top: 0; z-index: 5;
}
.topbar-left { display: flex; align-items: center; gap: 12px; }
.back-link { font-size: 12px; color: var(--text-muted); cursor: pointer; text-decoration: none; display: flex; align-items: center; gap: 4px; }
.back-link:hover { color: var(--accent); }
.topbar-left h2 { font-size: 16px; font-weight: 600; }
.status-badge { font-size: 10px; font-weight: 600; padding: 3px 10px; border-radius: 4px; }
.badge-active { background: var(--green-dim); color: var(--green); }
.badge-paused { background: var(--yellow-dim); color: var(--yellow); }
.badge-done { background: rgba(100,100,120,0.15); color: var(--text-muted); }
.topbar-actions { display: flex; gap: 6px; }
.btn.success { border-color: var(--green); color: var(--green); }
.btn.success:hover { background: var(--green-dim); }

.project-header {
  background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 16px 24px; margin-bottom: 16px;
}

/* Row 1: Status bar */
.project-status-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 0 10px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 12px;
  flex-wrap: wrap;
}

.status-pill {
  font-size: 11px;
  padding: 3px 10px;
  border-radius: 4px;
  background: var(--bg-tertiary);
  border: 1px solid var(--border);
  display: inline-flex;
  align-items: center;
  gap: 5px;
  white-space: nowrap;
}
.status-pill.green { border-color: var(--green); color: var(--green); background: var(--green-dim); }
.status-pill.orange { border-color: var(--orange); color: var(--orange); background: var(--orange-dim); }
.status-pill.red { border-color: var(--red); color: var(--red); background: var(--red-dim); }
.status-pill.muted { color: var(--text-muted); }

.git-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.git-dot.clean { background: var(--green); }
.git-dot.dirty { background: var(--red); }

.agent-pulse {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--green);
  animation: pulse 2s infinite;
  flex-shrink: 0;
}

/* Row 2: Compact meta */
.project-meta-compact {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--text-muted);
}
.project-desc-inline { font-size: 13px; color: var(--text-secondary); max-width: 50ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.meta-divider { color: var(--border-light); margin: 0 4px; }
.meta-dot { color: var(--border-light); }
.meta-inline { color: var(--text-muted); }

.project-grid { display: grid; grid-template-columns: 1fr 340px; gap: 16px; }
.sidebar-panels { display: flex; flex-direction: column; gap: 12px; }

/* Side tab bar (mobile only) */
.side-tab-bar {
  display: flex;
  border-radius: var(--radius);
  overflow: hidden;
  border: 1px solid var(--border);
}
.side-tab {
  flex: 1;
  padding: 8px;
  text-align: center;
  font-size: 11px;
  font-weight: 500;
  background: var(--bg-secondary);
  color: var(--text-muted);
  border-right: 1px solid var(--border);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}
.side-tab:last-child { border-right: none; }
.side-tab.active { background: var(--accent-dim); color: var(--accent); }

/* Desktop: show all side panels, hide tab bar */
@media (min-width: 769px) {
  .mobile-only { display: none !important; }
  .side-panel { display: block !important; }
}

@media (max-width: 768px) {
  .detail-topbar { padding: 12px 16px; flex-wrap: wrap; gap: 8px; }
  .topbar-left { flex-wrap: wrap; gap: 6px; }
  .topbar-left h2 { font-size: 18px; font-weight: 700; }
  .topbar-actions { width: 100%; overflow-x: auto; gap: 6px; }
  .topbar-actions .btn { flex-shrink: 0; min-height: 36px; }

  .project-header { padding: 12px 16px; margin: 0 0 10px; border-radius: 0; border-left: none; border-right: none; }
  .project-status-bar { gap: 6px; }
  .project-meta-compact { flex-direction: column; gap: 4px; }
  .project-desc-inline { max-width: none; white-space: normal; }
  .meta-divider { display: none; }

  .project-grid { grid-template-columns: 1fr; gap: 10px; }

  .side-tab-bar { margin: 0 16px 10px; }
}
</style>
