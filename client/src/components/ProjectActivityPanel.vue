<script setup lang="ts">
import { computed } from 'vue'

const ACTIVITY_LIMIT = 5

const props = defineProps<{ activity: { date: string; items: string[] }[] }>()

const limitedItems = computed(() => {
  const flat: { text: string; date: string }[] = []
  for (const day of props.activity) {
    for (const item of day.items) {
      flat.push({ text: item, date: day.date })
    }
  }
  return flat.slice(0, ACTIVITY_LIMIT)
})

const totalCount = computed(() => {
  return props.activity.reduce((sum, day) => sum + day.items.length, 0)
})

const hiddenCount = computed(() => Math.max(0, totalCount.value - ACTIVITY_LIMIT))
</script>

<template>
  <div class="panel">
    <div class="panel-header"><span class="panel-title">Recent Activity</span></div>
    <div class="panel-body">
      <div v-if="limitedItems.length === 0" class="empty-state">No recent activity</div>
      <div v-for="(item, i) in limitedItems" :key="i" class="activity-item">
        <div class="activity-dot">&#10003;</div>
        <div>
          <div class="activity-text">{{ item.text }}</div>
          <div class="activity-time">{{ item.date }}</div>
        </div>
      </div>
      <div v-if="hiddenCount > 0" class="more-count">{{ hiddenCount }} more activities</div>
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
.more-count {
  font-size: 10px;
  color: var(--text-muted);
  text-align: center;
  padding: 6px 16px;
  font-style: italic;
}
</style>
