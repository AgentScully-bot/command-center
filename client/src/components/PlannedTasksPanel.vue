<script setup lang="ts">
import { ref } from 'vue'

interface PlannedTask {
  project: string
  section: string
  task: string
  line: string
}

defineProps<{
  items: PlannedTask[]
}>()

const emit = defineEmits<{
  approved: []
}>()

const loading = ref<string | null>(null)

async function approve(item: PlannedTask) {
  loading.value = item.task
  try {
    const res = await globalThis.fetch('/api/tasks/approve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: item.project, task: item.task }),
    })
    if (!res.ok) throw new Error('Failed')
    emit('approved')
  } catch {
    // silent
  } finally {
    loading.value = null
  }
}

// Group by project
function grouped(items: PlannedTask[]): Record<string, PlannedTask[]> {
  const groups: Record<string, PlannedTask[]> = {}
  for (const item of items) {
    if (!groups[item.project]) groups[item.project] = []
    groups[item.project]!.push(item)
  }
  return groups
}
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div>
        <span class="panel-title">Planned Tasks</span>
        <span class="panel-count">{{ items.length }} awaiting approval</span>
      </div>
    </div>
    <div class="panel-body">
      <div v-if="items.length === 0" class="empty-state">No planned tasks awaiting approval</div>
      <template v-for="(tasks, project) in grouped(items)" :key="project">
        <div class="project-group-header">{{ project }}</div>
        <div v-for="t in tasks" :key="t.task" class="planned-row">
          <div class="planned-info">
            <span class="planned-task">{{ t.task }}</span>
            <span v-if="t.section" class="planned-section">{{ t.section }}</span>
          </div>
          <button
            class="btn btn-approve"
            :disabled="loading === t.task"
            @click="approve(t)"
          >
            {{ loading === t.task ? '...' : 'Approve' }}
          </button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.project-group-header {
  font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
  color: var(--text-muted); padding: 8px 16px 4px; background: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
}
.planned-row {
  display: flex; align-items: center; justify-content: space-between;
  padding: 9px 16px; border-bottom: 1px solid var(--border); gap: 12px;
}
.planned-row:last-child { border-bottom: none; }
.planned-info { flex: 1; min-width: 0; display: flex; align-items: center; gap: 8px; }
.planned-task { font-size: 12px; color: var(--text-secondary); word-break: break-word; overflow-wrap: break-word; }
.planned-section {
  font-size: 9px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
  padding: 1px 5px; border-radius: 3px;
  background: rgba(100, 100, 120, 0.15); color: var(--text-muted);
}
.btn-approve {
  border-color: var(--green); color: var(--green); font-size: 10px; padding: 3px 10px;
  white-space: nowrap; flex-shrink: 0;
}
.btn-approve:hover { background: var(--green-dim); }
.btn-approve:disabled { opacity: 0.5; cursor: default; }
</style>
