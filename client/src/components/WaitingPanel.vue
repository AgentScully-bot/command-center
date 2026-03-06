<script setup lang="ts">
import { ref, computed } from 'vue'

interface WaitingItem {
  text: string
  waitingOn: string
  section: string
  age: number
  impact: number
}

interface WaitingGroup {
  project: string
  items: WaitingItem[]
}

const props = defineProps<{
  groups: WaitingGroup[]
}>()

const emit = defineEmits<{
  (e: 'refresh'): void
}>()

// Filter state
const filterProject = ref('')
const filterAssignee = ref('')
const filterUrgency = ref('all')

// Collapsed project groups
const collapsed = ref<Set<string>>(new Set())

// Action UI state
const activeAction = ref<{ type: string; project: string; task: string } | null>(null)
const delegateInput = ref('')
const noteInput = ref('')
const actionLoading = ref(false)

const allProjects = computed(() => {
  return props.groups.map(g => g.project)
})

const allAssignees = computed(() => {
  const set = new Set<string>()
  for (const g of props.groups) {
    for (const item of g.items) {
      set.add(item.waitingOn)
    }
  }
  return Array.from(set).sort()
})

const filteredGroups = computed(() => {
  return props.groups
    .filter(g => !filterProject.value || g.project === filterProject.value)
    .map(g => ({
      ...g,
      items: g.items.filter(item => {
        if (filterAssignee.value && item.waitingOn !== filterAssignee.value) return false
        if (filterUrgency.value === 'overdue' && item.age <= 7) return false
        return true
      })
    }))
    .filter(g => g.items.length > 0)
})

const totalCount = computed(() => {
  return filteredGroups.value.reduce((sum, g) => sum + g.items.length, 0)
})

function toggleCollapse(project: string) {
  if (collapsed.value.has(project)) {
    collapsed.value.delete(project)
  } else {
    collapsed.value.add(project)
  }
}

function ageLabel(days: number): string {
  if (days < 1) return 'new'
  return `${days}d`
}

function ageClass(days: number): string {
  if (days < 2) return 'age-new'
  if (days <= 7) return 'age-mid'
  return 'age-old'
}

function assigneeColor(name: string): string {
  if (name === (import.meta.env.VITE_OWNER_NAME || 'owner')) return 'badge-orange'
  if (name === 'carmen') return 'badge-purple'
  if (name === 'agent') return 'badge-blue'
  return 'badge-grey'
}

function openAction(type: string, project: string, task: string) {
  activeAction.value = { type, project, task }
  delegateInput.value = ''
  noteInput.value = ''
}

function closeAction() {
  activeAction.value = null
}

function isAction(type: string, project: string, task: string): boolean {
  return activeAction.value?.type === type &&
    activeAction.value?.project === project &&
    activeAction.value?.task === task
}

async function postAction(url: string, body: Record<string, unknown>) {
  actionLoading.value = true
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    if (!res.ok) throw new Error(`${res.status}`)
    closeAction()
    emit('refresh')
  } catch { /* silent */ }
  actionLoading.value = false
}

function resolve(project: string, task: string, action: string) {
  postAction('/api/waiting/resolve', { project, task, action })
}

function snooze(project: string, task: string, days: number) {
  postAction('/api/waiting/snooze', { project, task, days })
}

function delegate(project: string, task: string, from: string) {
  const to = delegateInput.value.trim()
  if (!to) return
  postAction('/api/waiting/delegate', { project, task, from, to })
}

function addNote(project: string, task: string) {
  const note = noteInput.value.trim()
  if (!note) return
  postAction('/api/waiting/note', { project, task, note })
}

const panelSeverity = computed(() => {
  const allItems = filteredGroups.value.flatMap(g => g.items)
  if (allItems.length === 0) return 'green'
  if (allItems.some(item => item.section === 'blocked' || item.age > 7)) return 'red'
  if (allItems.some(item => item.age >= 2)) return 'orange'
  return 'green'
})

const severityVars = computed(() => {
  const colorMap = {
    red: { main: 'var(--red)', dim: 'var(--red-dim)' },
    orange: { main: 'var(--orange)', dim: 'var(--orange-dim)' },
    green: { main: 'var(--green)', dim: 'var(--green-dim)' },
  }
  const c = colorMap[panelSeverity.value]
  return {
    '--severity-color': c.main,
    '--severity-dim': c.dim,
  }
})
</script>

<template>
  <div class="panel urgent" :style="severityVars">
    <div class="panel-header" :class="`severity-${panelSeverity}-header`">
      <span class="panel-title" :class="`severity-${panelSeverity}-title`">Waiting on You</span>
      <span class="panel-count" v-if="totalCount > 0">{{ totalCount }}</span>
    </div>

    <!-- Filter bar -->
    <div class="filter-bar" v-if="groups.length > 0">
      <select v-model="filterProject" class="filter-select">
        <option value="">All projects</option>
        <option v-for="p in allProjects" :key="p" :value="p">{{ p }}</option>
      </select>
      <select v-model="filterAssignee" class="filter-select">
        <option value="">All people</option>
        <option v-for="a in allAssignees" :key="a" :value="a">{{ a }}</option>
      </select>
      <select v-model="filterUrgency" class="filter-select">
        <option value="all">All</option>
        <option value="overdue">Overdue (&gt;7d)</option>
      </select>
    </div>

    <div class="panel-body">
      <!-- Empty state -->
      <div v-if="filteredGroups.length === 0" class="empty-state">
        <span class="empty-check">&#10003;</span>
        Nothing waiting — you're all caught up
      </div>

      <!-- Grouped items -->
      <div v-for="group in filteredGroups" :key="group.project" class="waiting-group">
        <div class="group-header" @click="toggleCollapse(group.project)">
          <span class="collapse-icon">{{ collapsed.has(group.project) ? '&#9654;' : '&#9660;' }}</span>
          <router-link :to="`/project/${group.project}`" class="group-name" @click.stop>{{ group.project }}</router-link>
          <span class="group-count" :class="`severity-${panelSeverity}-badge`">{{ group.items.length }}</span>
        </div>

        <template v-if="!collapsed.has(group.project)">
          <div v-for="item in group.items" :key="item.text" class="waiting-item">
            <div class="waiting-dot" :class="item.section === 'blocked' ? 'urgent' : 'normal'"></div>
            <div class="waiting-content">
              <div class="waiting-text">{{ item.text }}</div>
              <div class="waiting-meta">
                <span class="waiting-badge" :class="assigneeColor(item.waitingOn)">waiting:{{ item.waitingOn }}</span>
                <span v-if="item.impact > 0" class="impact-line">blocks {{ item.impact }} tasks</span>
                <span class="waiting-section">{{ item.section }}</span>
              </div>

              <!-- Action buttons -->
              <div class="waiting-actions">
                <button class="task-btn" @click.stop="openAction('resolve', group.project, item.text)">Resolve</button>
                <button class="task-btn" @click.stop="openAction('snooze', group.project, item.text)">Snooze</button>
                <button class="task-btn" @click.stop="openAction('delegate', group.project, item.text)">Delegate</button>
                <button class="task-btn" @click.stop="openAction('note', group.project, item.text)">Note</button>
              </div>

              <!-- Resolve dropdown -->
              <div v-if="isAction('resolve', group.project, item.text)" class="action-dropdown">
                <button class="dropdown-btn" @click="resolve(group.project, item.text, 'approve')" :disabled="actionLoading">Approve</button>
                <button class="dropdown-btn" @click="resolve(group.project, item.text, 'unblock')" :disabled="actionLoading">Unblock</button>
                <button class="dropdown-btn" @click="resolve(group.project, item.text, 'remove-tag')" :disabled="actionLoading">Remove Tag</button>
                <button class="dropdown-btn cancel" @click="closeAction()">Cancel</button>
              </div>

              <!-- Snooze picker -->
              <div v-if="isAction('snooze', group.project, item.text)" class="action-dropdown">
                <button class="dropdown-btn" @click="snooze(group.project, item.text, 1)" :disabled="actionLoading">1 day</button>
                <button class="dropdown-btn" @click="snooze(group.project, item.text, 3)" :disabled="actionLoading">3 days</button>
                <button class="dropdown-btn" @click="snooze(group.project, item.text, 7)" :disabled="actionLoading">7 days</button>
                <button class="dropdown-btn cancel" @click="closeAction()">Cancel</button>
              </div>

              <!-- Delegate input -->
              <div v-if="isAction('delegate', group.project, item.text)" class="action-dropdown">
                <input
                  v-model="delegateInput"
                  class="action-input"
                  placeholder="Delegate to..."
                  @keyup.enter="delegate(group.project, item.text, item.waitingOn)"
                />
                <button class="dropdown-btn" @click="delegate(group.project, item.text, item.waitingOn)" :disabled="actionLoading || !delegateInput.trim()">Assign</button>
                <button class="dropdown-btn cancel" @click="closeAction()">Cancel</button>
              </div>

              <!-- Note input -->
              <div v-if="isAction('note', group.project, item.text)" class="action-dropdown">
                <input
                  v-model="noteInput"
                  class="action-input"
                  placeholder="Add a note..."
                  @keyup.enter="addNote(group.project, item.text)"
                />
                <button class="dropdown-btn" @click="addNote(group.project, item.text)" :disabled="actionLoading || !noteInput.trim()">Save</button>
                <button class="dropdown-btn cancel" @click="closeAction()">Cancel</button>
              </div>
            </div>
            <div class="waiting-age" :class="ageClass(item.age)">{{ ageLabel(item.age) }}</div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Severity: red */
.severity-red-header { background: var(--red-dim) !important; }
.severity-red-title { color: var(--red) !important; }
.severity-red-badge { background: var(--red-dim); color: var(--red); }
.severity-red-text { color: var(--red); }

/* Severity: orange */
.severity-orange-header { background: var(--orange-dim) !important; }
.severity-orange-title { color: var(--orange) !important; }
.severity-orange-badge { background: var(--orange-dim); color: var(--orange); }
.severity-orange-text { color: var(--orange); }

/* Severity: green */
.severity-green-header { background: var(--green-dim) !important; }
.severity-green-title { color: var(--green) !important; }
.severity-green-badge { background: var(--green-dim); color: var(--green); }
.severity-green-text { color: var(--green); }

.filter-bar {
  display: flex; gap: 6px; padding: 8px 12px; border-bottom: 1px solid var(--border);
  background: var(--bg-tertiary);
}
.filter-select {
  flex: 1; padding: 4px 6px; border-radius: var(--radius-sm); border: 1px solid var(--border);
  background: var(--bg-primary); color: var(--text-primary); font-size: 10px; font-family: inherit;
  outline: none; cursor: pointer;
}
.filter-select:focus { border-color: var(--severity-color); }

.empty-state {
  padding: 24px 16px; text-align: center; color: var(--text-muted); font-size: 12px;
}
.empty-check { color: var(--green); font-size: 16px; margin-right: 6px; }

.waiting-group { border-bottom: 1px solid var(--border); }
.waiting-group:last-child { border-bottom: none; }

.group-header {
  display: flex; align-items: center; gap: 8px; padding: 8px 12px;
  background: var(--bg-tertiary); cursor: pointer; transition: background 0.1s;
}
.group-header:hover { background: var(--bg-hover); }
.collapse-icon { font-size: 8px; color: var(--text-muted); width: 12px; }
.group-name {
  font-size: 11px; font-weight: 600; color: var(--severity-color); text-decoration: none; flex: 1;
}
.group-name:hover { text-decoration: underline; }
.group-count {
  font-size: 9px; font-weight: 600; padding: 1px 6px; border-radius: 10px;
  background: var(--severity-dim); color: var(--severity-color);
}

.waiting-item {
  display: flex; align-items: flex-start; padding: 10px 12px 10px 16px;
  border-bottom: 1px solid rgba(37,37,48,0.5); gap: 10px; transition: background 0.1s;
}
.waiting-item:last-child { border-bottom: none; }
.waiting-item:hover { background: var(--bg-hover); }

.waiting-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; margin-top: 5px;
}
.waiting-dot.urgent { background: var(--red); }
.waiting-dot.normal { background: var(--orange); }

.waiting-content { flex: 1; min-width: 0; }
.waiting-text { font-size: 12px; font-weight: 500; color: var(--text-primary); line-height: 1.4; word-break: break-word; overflow-wrap: break-word; }

.waiting-meta {
  display: flex; align-items: center; gap: 6px; margin-top: 4px; flex-wrap: wrap;
}

.waiting-badge {
  font-size: 9px; font-weight: 600; padding: 1px 6px; border-radius: 3px;
  text-transform: uppercase; letter-spacing: 0.3px;
}
.badge-orange { background: var(--orange-dim); color: var(--orange); }
.badge-purple { background: rgba(168,85,247,0.12); color: #a855f7; }
.badge-blue { background: var(--accent-dim); color: var(--accent); }
.badge-grey { background: rgba(100,100,120,0.1); color: var(--text-muted); }

.impact-line { font-size: 10px; color: var(--red); font-style: italic; }
.waiting-section { font-size: 10px; color: var(--text-muted); }

.waiting-age {
  font-size: 10px; font-weight: 600; flex-shrink: 0; padding: 2px 6px;
  border-radius: 3px; margin-top: 2px;
}
.age-new { color: var(--green); background: var(--green-dim); }
.age-mid { color: var(--orange); background: var(--orange-dim); }
.age-old { color: var(--red); background: var(--red-dim); }

.waiting-actions {
  display: flex; gap: 4px; margin-top: 6px; opacity: 0; transition: opacity 0.15s;
}
.waiting-item:hover .waiting-actions { opacity: 1; }

.task-btn {
  padding: 2px 8px; border-radius: 4px; border: 1px solid var(--border); background: transparent;
  font-size: 9px; color: var(--text-muted); cursor: pointer; font-family: inherit;
  transition: all 0.12s;
}
.task-btn:hover { border-color: var(--severity-color); color: var(--severity-color); }

.action-dropdown {
  display: flex; gap: 4px; margin-top: 6px; flex-wrap: wrap; align-items: center;
}
.dropdown-btn {
  padding: 3px 10px; border-radius: 4px; border: 1px solid var(--border); background: transparent;
  font-size: 10px; color: var(--text-primary); cursor: pointer; font-family: inherit;
  transition: all 0.12s;
}
.dropdown-btn:hover { border-color: var(--severity-color); color: var(--severity-color); background: var(--severity-dim); }
.dropdown-btn:disabled { opacity: 0.4; cursor: default; }
.dropdown-btn.cancel { color: var(--text-muted); }
.dropdown-btn.cancel:hover { border-color: var(--text-muted); background: transparent; }

.action-input {
  padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border);
  background: var(--bg-primary); color: var(--text-primary); font-size: 10px;
  font-family: inherit; outline: none; width: 120px;
}
.action-input:focus { border-color: var(--severity-color); }
.action-input::placeholder { color: var(--text-muted); }

.panel-count {
  font-size: 10px; font-weight: 600; padding: 2px 7px; border-radius: 10px;
  background: var(--severity-dim); color: var(--severity-color);
}

@media (max-width: 768px) {
  .waiting-item { padding: 12px 14px 12px 16px; min-height: 44px; }
  .waiting-actions { opacity: 1; }
  .task-btn { padding: 5px 12px; font-size: 10px; min-height: 32px; }
  .filter-bar { flex-wrap: wrap; }
  .filter-select { font-size: 12px; padding: 6px 8px; }
}
</style>
