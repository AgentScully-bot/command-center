<script setup lang="ts">
defineProps<{ decisions: { title: string; date: string; summary: string }[] }>()
</script>

<template>
  <div class="panel">
    <div class="panel-header"><span class="panel-title">Recent Decisions</span></div>
    <div class="panel-body">
      <div v-if="decisions.length === 0" class="empty-state">No decisions recorded</div>
      <div v-for="d in decisions" :key="d.title" class="decision-item">
        <div class="decision-title">{{ d.title }}</div>
        <div class="decision-date">{{ d.date }}</div>
        <div class="decision-summary" v-if="d.summary">{{ d.summary }}</div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.decision-item { padding: 10px 16px; border-bottom: 1px solid var(--border); }
.decision-item:last-child { border-bottom: none; }
.decision-title { font-size: 12px; font-weight: 500; }
.decision-date { font-size: 10px; color: var(--text-muted); margin-top: 1px; }
.decision-summary { font-size: 11px; color: var(--text-secondary); margin-top: 4px; }
.empty-state { padding: 12px 16px; text-align: center; color: var(--text-muted); font-size: 11px; }
</style>
