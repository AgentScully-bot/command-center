<script setup lang="ts">
import Sidebar from './components/Sidebar.vue'
import TopBar from './components/TopBar.vue'
import BottomNav from './components/BottomNav.vue'
import { useApi } from './composables/useApi'

const { data: system } = useApi<Record<string, unknown>>('/api/system')
const { data: waiting } = useApi<unknown[]>('/api/waiting')
const { data: projects } = useApi<unknown[]>('/api/projects')
const { data: agents } = useApi<unknown[]>('/api/agents')

function refreshAll() {
  window.location.reload()
}
</script>

<template>
  <div class="layout">
    <Sidebar :projects="projects || []" :agents="agents || []" />
    <div class="main">
      <TopBar :system="system" @refresh="refreshAll" />
      <router-view :key="$route.fullPath" />
    </div>
    <BottomNav :waiting-count="(waiting as any[] || []).reduce((sum: number, g: any) => sum + (g.items?.length || 0), 0)" />
  </div>
</template>

<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

:root {
  --bg-primary: #0d0d12;
  --bg-secondary: #141419;
  --bg-tertiary: #1a1a22;
  --bg-hover: #1f1f2a;
  --border: #252530;
  --border-light: #2a2a38;
  --text-primary: #e8e8ed;
  --text-secondary: #9494a8;
  --text-muted: #5c5c72;
  --accent: #6c8cff;
  --accent-dim: rgba(108, 140, 255, 0.12);
  --green: #34d399;
  --green-dim: rgba(52, 211, 153, 0.12);
  --yellow: #fbbf24;
  --yellow-dim: rgba(251, 191, 36, 0.12);
  --red: #f87171;
  --red-dim: rgba(248, 113, 113, 0.12);
  --orange: #fb923c;
  --orange-dim: rgba(251, 146, 60, 0.12);
  --purple: #a78bfa;
  --purple-dim: rgba(167, 139, 250, 0.12);
  --sidebar-w: 220px;
  --radius: 8px;
  --radius-sm: 6px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }
html, body { overflow-x: hidden; max-width: 100vw; }
body { font-family: 'Inter', system-ui, sans-serif; background: var(--bg-primary); color: var(--text-primary); min-height: 100vh; font-size: 13px; }

.layout { display: flex; min-height: 100vh; max-width: 100vw; overflow-x: hidden; }
.main { flex: 1; margin-left: var(--sidebar-w); max-width: 100%; overflow-x: hidden; }
.content { padding: 20px 24px; }

.stats-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 20px; }
.grid-2-1 { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; margin-bottom: 16px; }
.grid-1-1 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
.grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; margin-bottom: 16px; }

.panel {
  background: var(--bg-secondary); border: 1px solid var(--border); border-radius: var(--radius);
  overflow: hidden; max-width: 100%;
}
.panel-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; border-bottom: 1px solid var(--border);
}
.panel-title { font-size: 13px; font-weight: 600; color: var(--text-primary); }
.panel-count { font-size: 11px; color: var(--text-muted); margin-left: 8px; }
.panel-action { font-size: 11px; color: var(--accent); cursor: pointer; text-decoration: none; }
.panel-action:hover { text-decoration: underline; }
.panel-body { padding: 0; }

.panel.urgent { border-color: var(--severity-color, var(--orange)); }
.panel.urgent .panel-header { background: var(--severity-dim, var(--orange-dim)); border-bottom-color: rgba(251, 146, 60, 0.2); }
.panel.urgent .panel-title { color: var(--severity-color, var(--orange)); }

.empty-state { padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 12px; }

.btn {
  padding: 5px 12px; border-radius: var(--radius-sm); border: 1px solid var(--border);
  background: transparent; color: var(--text-secondary); font-size: 11px; cursor: pointer;
  font-family: inherit; transition: all 0.12s;
}
.btn:hover { border-color: var(--accent); color: var(--accent); }

/* Mobile responsive */
@media (max-width: 768px) {
  .main { margin-left: 0; padding-bottom: 70px; max-width: 100vw; }
  .content { padding: 12px 0; max-width: 100vw; overflow-x: hidden; }
  .stats-row { grid-template-columns: 1fr; display: flex; overflow-x: auto; gap: 8px; padding: 0 16px 12px; margin-bottom: 12px; max-width: 100vw; }
  .grid-2-1, .grid-1-1, .grid-3 { grid-template-columns: 1fr; gap: 10px; margin-bottom: 10px; }
}
@media (min-width: 769px) {
  .mobile-only { display: none; }
}
</style>
