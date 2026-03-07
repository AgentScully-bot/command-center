<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  stats: Record<string, unknown> | null
  modelStatus?: Record<string, unknown> | null
}>()

const errorCount = computed(() => {
  const base = Number(props.stats?.activeErrors ?? 0)
  const fallbackExtra = props.modelStatus?.isFallback === true ? 1 : 0
  return base + fallbackExtra
})

function formatTokens(n: number): string {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return Math.round(n / 1000) + 'k'
  return String(n)
}
</script>

<template>
  <!-- Desktop stat cards -->
  <div class="stats-row desktop-stats">
    <div class="stat-card">
      <div class="label">Uptime</div>
      <div class="value">{{ stats?.uptime || '—' }}</div>
      <div class="sub">System gateway</div>
    </div>
    <div class="stat-card">
      <div class="label">Sessions Today</div>
      <div class="value">{{ stats?.sessionsToday ?? '—' }}</div>
      <div class="sub">All channels</div>
    </div>
    <div class="stat-card">
      <div class="label">Cost Today</div>
      <div class="value">${{ stats?.costToday ?? '—' }}</div>
      <div class="sub">${{ stats?.costMonth ?? '—' }} this month</div>
    </div>
    <div class="stat-card">
      <div class="label">Tokens (In/Out)</div>
      <div class="value tokens">{{ formatTokens(Number(stats?.tokensIn) || 0) }} / {{ formatTokens(Number(stats?.tokensOut) || 0) }}</div>
      <div class="sub">Today, all sessions</div>
    </div>
    <div class="stat-card">
      <div class="label">Active Errors</div>
      <div class="value" :style="{ color: errorCount === 0 ? 'var(--green)' : 'var(--red)' }">{{ errorCount }}</div>
      <div class="sub">System health</div>
    </div>
  </div>

  <!-- Mobile stat pills -->
  <div class="stats-strip mobile-stats">
    <div class="stat-pill">
      <span class="dot" :style="{ background: stats?.gatewayService === 'running' ? 'var(--green)' : 'var(--red)' }"></span>
      <span class="pill-label">Gateway</span>
      <span class="pill-value">{{ stats?.gatewayService === 'running' ? 'OK' : 'Down' }}</span>
    </div>
    <div class="stat-pill">
      <span class="dot" style="background: var(--yellow)"></span>
      <span class="pill-label">Sessions</span>
      <span class="pill-value">{{ stats?.sessionsToday ?? '—' }}</span>
    </div>
    <div class="stat-pill">
      <span class="dot" style="background: var(--green)"></span>
      <span class="pill-label">Cost</span>
      <span class="pill-value">${{ stats?.costToday ?? '—' }}</span>
    </div>
    <div class="stat-pill">
      <span class="dot" :style="{ background: errorCount === 0 ? 'var(--green)' : 'var(--red)' }"></span>
      <span class="pill-label">Errors</span>
      <span class="pill-value">{{ errorCount }}</span>
    </div>
  </div>
</template>

<style scoped>
.stat-card {
  background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius);
  padding: 14px 16px;
}
.stat-card .label { font-size: 10px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; color: var(--text-muted); }
.stat-card .value { font-size: 24px; font-weight: 700; color: #fff; margin: 4px 0 2px; }
.stat-card .value.tokens { font-size: 20px; }
.stat-card .sub { font-size: 11px; color: var(--text-secondary); }

/* Mobile stat pills */
.mobile-stats { display: none; }

.stats-strip {
  display: flex;
  gap: 8px;
  padding: 0 16px 12px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}
.stats-strip::-webkit-scrollbar { display: none; }

.stat-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border);
  white-space: nowrap;
  flex-shrink: 0;
}
.stat-pill .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.stat-pill .pill-label { font-size: 11px; color: var(--text-muted); }
.stat-pill .pill-value { font-size: 12px; font-weight: 600; }

@media (max-width: 768px) {
  .desktop-stats { display: none; }
  .mobile-stats { display: flex; }
}
</style>
