<script setup lang="ts">
defineProps<{ activity: { date: string; items: string[] }[] }>()
</script>

<template>
  <div class="panel">
    <div class="panel-header"><span class="panel-title">Recent Activity</span></div>
    <div class="panel-body">
      <div v-if="activity.length === 0" class="empty-state">No recent activity</div>
      <template v-for="day in activity" :key="day.date">
        <div v-for="(item, i) in day.items" :key="day.date + i" class="activity-item">
          <div class="activity-dot">&#10003;</div>
          <div>
            <div class="activity-text">{{ item }}</div>
            <div class="activity-time">{{ day.date }}</div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.activity-item { display: flex; gap: 8px; padding: 8px 16px; border-bottom: 1px solid var(--border); }
.activity-item:last-child { border-bottom: none; }
.activity-dot { width: 20px; height: 20px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 10px; flex-shrink: 0; margin-top: 1px; background: var(--green-dim); color: var(--green); }
.activity-text { font-size: 11px; color: var(--text-secondary); }
.activity-time { font-size: 10px; color: var(--text-muted); margin-top: 1px; }
.empty-state { padding: 12px 16px; text-align: center; color: var(--text-muted); font-size: 11px; }
</style>
