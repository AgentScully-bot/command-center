<script setup lang="ts">
defineProps<{ items: { text: string; waiting: string; section: string; feature: string }[] }>()
</script>

<template>
  <div class="panel" :class="{ urgent: items.length > 0 }">
    <div class="panel-header">
      <span class="panel-title">Waiting on You</span>
    </div>
    <div class="panel-body">
      <div v-if="items.length === 0" class="empty-state">Nothing waiting</div>
      <div v-for="item in items" :key="item.text" class="waiting-item">
        <span class="waiting-dot" :class="item.section === 'blocked' ? 'urgent' : 'normal'"></span>
        <div>
          <div class="waiting-text">{{ item.text }}</div>
          <div class="waiting-meta">{{ item.feature }} &middot; {{ item.section }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.panel.urgent { border-color: var(--orange); }
.panel.urgent .panel-header { background: var(--orange-dim); border-bottom-color: rgba(251,146,60,0.2); }
.panel.urgent .panel-title { color: var(--orange); }
.waiting-item { display: flex; align-items: flex-start; gap: 8px; padding: 8px 16px; border-bottom: 1px solid var(--border); }
.waiting-item:last-child { border-bottom: none; }
.waiting-dot { width: 6px; height: 6px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
.waiting-dot.urgent { background: var(--red); }
.waiting-dot.normal { background: var(--orange); }
.waiting-text { font-size: 11px; }
.waiting-meta { font-size: 10px; color: var(--text-muted); margin-top: 1px; }
.empty-state { padding: 12px 16px; text-align: center; color: var(--text-muted); font-size: 11px; }

@media (max-width: 768px) {
  .waiting-item { padding: 12px 14px; min-height: 44px; }
  .waiting-text { font-size: 13px; }
}
</style>
