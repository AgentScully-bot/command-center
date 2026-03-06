<script setup lang="ts">
defineProps<{ git: { branch: string; clean: boolean; commits: { hash: string; message: string; ago: string }[]; uncommitted: string[] } | null }>()
</script>

<template>
  <div class="panel" v-if="git">
    <div class="panel-header"><span class="panel-title">Git</span></div>
    <div class="git-info">
      <div class="git-row"><span class="git-label">Branch</span><span class="git-value">{{ git.branch }}</span></div>
      <div class="git-row"><span class="git-label">Working tree</span><span class="git-value" :class="{ clean: git.clean }">{{ git.clean ? 'Clean' : 'Dirty' }}</span></div>
    </div>
    <div v-for="c in (git.commits || []).slice(0, 5)" :key="c.hash" class="git-commit">
      <div class="git-commit-msg">{{ c.message }}</div>
      <div class="git-commit-meta">{{ c.hash }} &middot; {{ c.ago }}</div>
    </div>
  </div>
</template>

<style scoped>
.git-info { padding: 10px 16px; }
.git-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.git-row:last-child { margin-bottom: 0; }
.git-label { font-size: 11px; color: var(--text-muted); }
.git-value { font-size: 11px; font-family: 'SF Mono', Consolas, monospace; color: var(--text-secondary); }
.git-value.clean { color: var(--green); }
.git-commit { padding: 7px 16px; border-bottom: 1px solid var(--border); }
.git-commit:last-child { border-bottom: none; }
.git-commit-msg { font-size: 11px; font-weight: 500; }
.git-commit-meta { font-size: 10px; color: var(--text-muted); margin-top: 1px; }
</style>
