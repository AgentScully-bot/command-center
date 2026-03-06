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
import { useApi } from '../composables/useApi'

const route = useRoute()
const router = useRouter()
const id = computed(() => route.params.id as string)

const { data: project, refresh } = useApi<Record<string, any>>(`/api/projects/${id.value}`)
const { data: agents } = useApi<any[]>('/api/agents')
const { data: git } = useApi<Record<string, any>>(`/api/projects/${id.value}/git`)
const { data: activity } = useApi<any[]>(`/api/projects/${id.value}/activity`)
const { data: prompts } = useApi<any[]>(`/api/projects/${id.value}/prompts`)

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

const activeSideTab = ref('agents')
const sideTabs = [
  { key: 'agents', label: 'Agents' },
  { key: 'waiting', label: 'Waiting' },
  { key: 'decisions', label: 'Decisions' },
  { key: 'activity', label: 'Activity' },
  { key: 'git', label: 'Git' },
]

async function deploy() {
  if (!confirm('Run deploy.sh?')) return
  const res = await fetch(`/api/projects/${id.value}/deploy`, { method: 'POST' })
  const data = await res.json()
  if (data.ok) alert('Deploy complete')
  else alert('Deploy failed: ' + (data.error || 'unknown'))
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
        <div class="project-desc">{{ project.description }}</div>
        <div class="project-meta-grid">
          <div class="meta-item" v-if="project.stack">
            <div class="meta-label">Stack</div>
            <div class="meta-value">{{ project.stack }}</div>
          </div>
          <div class="meta-item" v-if="project.started">
            <div class="meta-label">Started</div>
            <div class="meta-value">{{ project.started }}</div>
          </div>
          <div class="meta-item" v-if="project.git">
            <div class="meta-label">Last Commit</div>
            <div class="meta-value mono">{{ project.git.lastCommit }}</div>
          </div>
          <div class="meta-item" v-if="project.port">
            <div class="meta-label">Port</div>
            <div class="meta-value mono">{{ project.port }}</div>
          </div>
        </div>
        <div class="progress-row" v-if="project.tasks">
          <div class="progress-bar-lg">
            <div class="progress-fill-lg" :style="{ width: project.progress + '%' }"></div>
          </div>
          <span class="progress-label-lg">{{ project.progress }}%</span>
          <span class="progress-detail">{{ project.tasks.counts.done }} of {{ project.tasks.counts.total }} tasks done &middot; {{ project.tasks.counts.total - project.tasks.counts.done }} remaining</span>
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
          <ProjectAgentsPanel v-show="activeSideTab === 'agents'" class="side-panel" :agents="projectAgents" />
          <ProjectWaitingPanel v-show="activeSideTab === 'waiting'" class="side-panel" :items="waitingItems" />
          <DecisionsPanel v-show="activeSideTab === 'decisions'" class="side-panel" :decisions="project.decisions || []" />
          <ProjectActivityPanel v-show="activeSideTab === 'activity'" class="side-panel" :activity="activity || []" />
          <ProjectGitPanel v-show="activeSideTab === 'git'" class="side-panel" :git="git as any" />
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
  padding: 20px 24px; margin-bottom: 16px;
}
.project-desc { font-size: 13px; color: var(--text-secondary); max-width: 700px; word-break: break-word; overflow-wrap: break-word; }
.project-meta-grid { display: flex; gap: 32px; margin-top: 14px; }
.meta-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); margin-bottom: 2px; }
.meta-value { font-size: 13px; font-weight: 500; }
.meta-value.mono { font-family: 'SF Mono', Consolas, monospace; font-size: 12px; word-break: break-all; overflow-wrap: break-word; }
.progress-row { display: flex; align-items: center; gap: 12px; margin-top: 14px; }
.progress-bar-lg { flex: 1; height: 6px; background: var(--bg-primary); border-radius: 3px; overflow: hidden; max-width: 300px; }
.progress-fill-lg { height: 100%; border-radius: 3px; background: var(--green); }
.progress-label-lg { font-size: 13px; font-weight: 600; color: var(--green); }
.progress-detail { font-size: 11px; color: var(--text-muted); }

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

  .project-header { padding: 14px 16px; margin: 0 0 10px; border-radius: 0; border-left: none; border-right: none; }
  .project-meta-grid { flex-wrap: wrap; gap: 16px; }
  .progress-row { flex-wrap: wrap; }
  .progress-bar-lg { max-width: none; }

  .project-grid { grid-template-columns: 1fr; gap: 10px; }

  .side-tab-bar { margin: 0 16px 10px; }
}
</style>
