<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{
  projects: unknown[]
}>()

const router = useRouter()

function proj(p: unknown) {
  return p as { id: string; name: string; description: string; status: string; tasks: { total: number; done: number; blocked: number; inProgress: number; approved: number; planned: number; activeTotal: number }; progress: number }
}
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div><span class="panel-title">Projects</span><span class="panel-count">{{ projects.length }} active</span></div>
    </div>
    <div class="panel-body">
      <div v-if="projects.length === 0" class="empty-state">No projects found</div>
      <div v-for="p in projects" :key="proj(p).id" class="project-row" :class="'status-' + proj(p).status" @click="router.push(`/project/${proj(p).id}`)">
        <div class="project-indicator" :class="proj(p).status"></div>
        <div class="project-info">
          <div class="project-name">{{ proj(p).name }}</div>
          <div class="project-desc">{{ proj(p).description }}</div>
        </div>
        <div class="task-badges desktop-only">
          <span v-if="proj(p).tasks.blocked" class="task-badge badge-blocked">{{ proj(p).tasks.blocked }} blocked</span>
          <span v-if="proj(p).tasks.inProgress" class="task-badge badge-in-progress">{{ proj(p).tasks.inProgress }} in prog</span>
          <span v-if="proj(p).tasks.approved" class="task-badge badge-approved">{{ proj(p).tasks.approved }} approved</span>
          <span v-if="proj(p).tasks.planned" class="task-badge badge-planned">{{ proj(p).tasks.planned }} planned</span>
          <span v-if="proj(p).tasks.done" class="task-badge badge-done">{{ proj(p).tasks.done }} done</span>
        </div>
        <div class="task-counts mobile-only">
          <span v-if="proj(p).tasks.inProgress" class="count-item">
            <span class="count-dot dot-progress"></span>
            <span class="count-num">{{ proj(p).tasks.inProgress }}</span>
            <span class="count-label">prog</span>
          </span>
          <span v-if="proj(p).tasks.approved" class="count-item">
            <span class="count-dot dot-approved"></span>
            <span class="count-num">{{ proj(p).tasks.approved }}</span>
            <span class="count-label">ready</span>
          </span>
          <span v-if="proj(p).tasks.planned" class="count-item">
            <span class="count-dot dot-planned"></span>
            <span class="count-num">{{ proj(p).tasks.planned }}</span>
            <span class="count-label">planned</span>
          </span>
          <span v-if="proj(p).tasks.done" class="count-item">
            <span class="count-dot dot-done"></span>
            <span class="count-num">{{ proj(p).tasks.done }}</span>
            <span class="count-label">done</span>
          </span>
        </div>
        <span class="project-summary mobile-only">
          <template v-if="proj(p).status === 'paused'">paused</template>
          <template v-else-if="proj(p).tasks.activeTotal > 0">{{ proj(p).tasks.activeTotal }} remaining</template>
          <template v-else>{{ proj(p).tasks.done }} done</template>
        </span>
        <span v-if="proj(p).tasks.blocked" class="blocked-alert mobile-only">
          ⚠ {{ proj(p).tasks.blocked }} blocked
        </span>
        <span class="tap-chevron mobile-only">›</span>
        <div class="progress-wrap">
          <div class="progress-bar-wrap">
            <div class="progress-fill green" :style="{ width: proj(p).progress + '%' }"></div>
          </div>
          <div class="progress-label">{{ proj(p).progress }}%</div>
        </div>
        <span class="status-badge" :class="'badge-' + proj(p).status">{{ proj(p).status }}</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.project-row {
  display: flex; align-items: center; padding: 12px 16px; border-bottom: 1px solid var(--border);
  gap: 14px; cursor: pointer; transition: background 0.1s;
}
.project-row:last-child { border-bottom: none; }
.project-row:hover { background: var(--bg-hover); }
.project-indicator { width: 3px; height: 36px; border-radius: 2px; flex-shrink: 0; }
.project-indicator.active { background: var(--green); }
.project-indicator.done { background: var(--text-muted); }
.project-indicator.paused { background: var(--yellow); }
.project-info { flex: 1; min-width: 0; }
.project-name { font-size: 13px; font-weight: 500; }
.project-desc { font-size: 11px; color: var(--text-muted); margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.task-badges { display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.task-badge { font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 4px; white-space: nowrap; }
.badge-blocked { background: rgba(239, 68, 68, 0.15); color: #ef4444; }
.badge-in-progress { background: rgba(234, 179, 8, 0.15); color: #eab308; }
.badge-approved { background: rgba(34, 197, 94, 0.15); color: #22c55e; }
.badge-planned { background: rgba(59, 130, 246, 0.15); color: #3b82f6; }
.badge-done { background: rgba(100, 100, 120, 0.12); color: var(--text-muted); }
.progress-wrap { margin-left: 12px; }
.progress-bar-wrap { width: 100px; height: 4px; background: var(--bg-primary); border-radius: 2px; overflow: hidden; }
.progress-fill { height: 100%; border-radius: 2px; }
.progress-fill.green { background: var(--green); }
.progress-label { font-size: 10px; color: var(--text-muted); text-align: right; margin-top: 2px; }
.status-badge { font-size: 10px; font-weight: 600; padding: 3px 8px; border-radius: 4px; white-space: nowrap; margin-left: 12px; }
.badge-active { background: var(--green-dim); color: var(--green); }
.badge-done { background: rgba(100,100,120,0.15); color: var(--text-muted); }
.badge-paused { background: var(--yellow-dim); color: var(--yellow); }

/* Mobile/desktop visibility toggles */
.mobile-only { display: none; }
.desktop-only { display: flex; }

/* Mobile compact dot counts */
.task-counts {
  gap: 12px;
  align-items: center;
  margin-top: 6px;
}
.count-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}
.count-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.dot-progress { background: var(--yellow); }
.dot-approved { background: var(--green); }
.dot-planned { background: var(--blue); }
.dot-done { background: var(--text-muted); }
.count-num { font-weight: 600; }
.count-label { color: var(--text-muted); }

/* Mobile blocked alert */
.blocked-alert {
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 600;
  color: var(--red);
  background: rgba(239, 68, 68, 0.1);
  padding: 2px 8px;
  border-radius: 4px;
}

/* Mobile summary */
.project-summary {
  font-size: 11px;
  color: var(--text-muted);
  margin-left: auto;
}

/* Mobile tap chevron */
.tap-chevron {
  color: var(--text-muted);
  font-size: 18px;
  padding-left: 8px;
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .mobile-only { display: inline-flex; }
  .desktop-only { display: none; }

  .project-indicator { display: none; }
  .project-row {
    border-left: 3px solid var(--green);
    flex-wrap: wrap;
    padding: 12px 14px;
    gap: 4px;
    border-radius: var(--radius-sm);
    margin-bottom: 4px;
    background: var(--bg-secondary);
    border-bottom: none;
  }
  .project-row.status-blocked { border-left-color: var(--red); }
  .project-row.status-paused { border-left-color: var(--yellow); }
  .project-row.status-done { border-left-color: var(--text-muted); }

  .project-info {
    flex: 1;
    min-width: 0;
    order: 1;
  }
  .project-name { font-size: 15px; font-weight: 600; }
  .project-desc { display: none; }
  .progress-wrap { display: none; }
  .status-badge { display: none; }

  .project-summary { order: 2; }
  .blocked-alert { order: 3; }
  .tap-chevron { order: 4; }
  .task-counts {
    order: 5;
    width: 100%;
    display: flex;
  }
}
</style>
