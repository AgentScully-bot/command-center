<script setup lang="ts">
defineProps<{
  items: unknown[]
}>()

function item(i: unknown) {
  return i as { type: string; title: string; detail: string; time: string; icon: string; color: string }
}

function colorStyle(color: string) {
  const map: Record<string, { bg: string; fg: string }> = {
    green: { bg: 'var(--green-dim)', fg: 'var(--green)' },
    red: { bg: 'var(--red-dim)', fg: 'var(--red)' },
    blue: { bg: 'var(--accent-dim)', fg: 'var(--accent)' },
    purple: { bg: 'var(--purple-dim)', fg: 'var(--purple)' },
    yellow: { bg: 'var(--yellow-dim)', fg: 'var(--yellow)' },
  }
  return map[color] || map['blue']!
}
</script>

<template>
  <div class="panel">
    <div class="panel-header">
      <div><span class="panel-title">Recent Activity</span></div>
    </div>
    <div class="panel-body">
      <div v-if="items.length === 0" class="empty-state">No recent activity</div>
      <div v-for="(i, idx) in items" :key="idx" class="feed-item">
        <div class="feed-icon" :style="{ background: colorStyle(item(i).color).bg, color: colorStyle(item(i).color).fg }">
          {{ item(i).icon }}
        </div>
        <div class="feed-body">
          <div class="feed-text"><strong>{{ item(i).title }}</strong> — {{ item(i).detail }}</div>
          <div class="feed-time">{{ item(i).time }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.feed-item {
  display: flex; gap: 10px; padding: 9px 16px; border-bottom: 1px solid var(--border);
  align-items: flex-start;
}
.feed-item:last-child { border-bottom: none; }
.feed-icon {
  width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; font-size: 11px; flex-shrink: 0;
}
.feed-body { flex: 1; }
.feed-text { font-size: 12px; color: var(--text-secondary); word-break: break-word; overflow-wrap: break-word; }
.feed-text strong { color: var(--text-primary); font-weight: 500; }
.feed-time { font-size: 10px; color: var(--text-muted); margin-top: 1px; }
</style>
