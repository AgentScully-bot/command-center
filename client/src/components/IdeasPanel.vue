<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{
  ideas: unknown[]
}>()

const router = useRouter()

function idea(i: unknown) {
  return i as { id: string; name: string; status: string; description: string; meta: string }
}

function stageClass(status: string): string {
  if (status === 'brewing') return 'stage-brewing'
  if (status === 'ready') return 'stage-ready'
  return 'stage-seed'
}
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div><span class="panel-title">Ideas</span><span class="panel-count">{{ ideas.length }} ideas</span></div>
    </div>
    <div class="panel-body">
      <div v-if="ideas.length === 0" class="empty-state">No ideas yet</div>
      <div v-for="i in ideas" :key="idea(i).id" class="idea-row" @click="router.push(`/idea/${idea(i).id}`)">
        <span class="idea-stage" :class="stageClass(idea(i).status)">{{ idea(i).status }}</span>
        <div class="idea-info">
          <div class="idea-name">{{ idea(i).name }}</div>
          <div class="idea-desc">{{ idea(i).description }}</div>
        </div>
        <div class="idea-meta">{{ idea(i).meta }}</div>
        <span class="idea-chevron">&rsaquo;</span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.idea-row {
  display: flex; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--border);
  gap: 12px; cursor: pointer; transition: background 0.1s;
}
.idea-row:last-child { border-bottom: none; }
.idea-row:hover { background: var(--bg-hover); }
.idea-stage {
  font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;
  padding: 3px 8px; border-radius: 4px; white-space: nowrap; width: 64px; text-align: center;
}
.stage-seed { background: rgba(100,100,120,0.15); color: var(--text-muted); }
.stage-brewing { background: var(--purple-dim); color: var(--purple); }
.stage-ready { background: var(--green-dim); color: var(--green); }
.idea-info { flex: 1; min-width: 0; }
.idea-name { font-size: 13px; font-weight: 500; }
.idea-desc { font-size: 11px; color: var(--text-muted); margin-top: 1px; }
.idea-meta { font-size: 10px; color: var(--text-muted); flex-shrink: 0; }
.idea-chevron { font-size: 18px; color: var(--text-muted); flex-shrink: 0; }
</style>
