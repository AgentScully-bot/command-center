<script setup lang="ts">
defineProps<{
  items: unknown[]
  stats: Record<string, unknown> | null
}>()

function item(i: unknown) {
  return i as { title: string; date: string; daysLeft: number; icon: string; type: string }
}
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <span class="panel-title">Upcoming</span>
    </div>
    <div class="panel-body">
      <div v-if="items.length === 0" class="empty-state">Nothing upcoming</div>
      <div v-for="(i, idx) in items" :key="idx" class="upcoming-item">
        <span class="upcoming-icon" :style="{ color: item(i).daysLeft < 7 ? 'var(--yellow)' : 'var(--text-secondary)' }">{{ item(i).icon }}</span>
        <div class="upcoming-info">
          <div class="upcoming-text">{{ item(i).title }}</div>
          <div class="upcoming-date">{{ item(i).date }}</div>
        </div>
        <span class="upcoming-countdown" :class="item(i).daysLeft < 7 ? 'countdown-soon' : 'countdown-normal'">
          {{ item(i).daysLeft }}d
        </span>
      </div>
    </div>

    <!-- Mini cost chart -->
    <div v-if="stats?.dailyCosts" class="cost-section">
      <div class="cost-label">Daily Cost (last 14 days)</div>
      <div class="cost-chart">
        <div
          v-for="(d, idx) in (stats.dailyCosts as { date: string; cost: number }[])"
          :key="idx"
          class="cost-bar"
          :class="{ today: idx === (stats.dailyCosts as unknown[]).length - 1 }"
          :style="{ height: Math.max(3, (d.cost / Math.max(...(stats.dailyCosts as { cost: number }[]).map(x => x.cost), 1)) * 100) + '%' }"
          :title="d.date + ': $' + d.cost.toFixed(2)"
        ></div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.upcoming-item {
  display: flex; align-items: center; padding: 9px 16px; border-bottom: 1px solid var(--border); gap: 10px;
}
.upcoming-item:last-child { border-bottom: none; }
.upcoming-icon { font-size: 14px; width: 20px; text-align: center; }
.upcoming-info { flex: 1; }
.upcoming-text { font-size: 12px; font-weight: 500; }
.upcoming-date { font-size: 10px; color: var(--text-muted); }
.upcoming-countdown { font-size: 11px; font-weight: 600; white-space: nowrap; }
.countdown-soon { color: var(--red); }
.countdown-normal { color: var(--text-secondary); }

.cost-section { border-top: 1px solid var(--border); padding-top: 12px; margin-top: 4px; }
.cost-label { padding: 0 16px; font-size: 11px; font-weight: 600; color: var(--text-secondary); margin-bottom: 8px; }
.cost-chart { display: flex; align-items: flex-end; gap: 3px; height: 48px; padding: 0 16px 12px; }
.cost-bar {
  flex: 1; background: var(--accent); border-radius: 2px 2px 0 0; min-height: 3px;
  opacity: 0.6; transition: opacity 0.15s;
}
.cost-bar:hover { opacity: 1; }
.cost-bar.today { opacity: 1; background: #fff; }
</style>
