# TASKS.md — Command Center Dashboard

## 📋 Planned

### Realtime UI Reactivity
Fix Start Implementation button not updating UI and new tasks/prompts not appearing without refresh.
- [ ] Emit refresh after requestImplementation fetch succeeds (TaskBoard.vue)
- [ ] Add file watchers for prompts/ and requirements/ directories (watcher.ts)
- [ ] Verify WebSocket channel mapping covers all project data endpoints
- [ ] npm test + client build passes

### Implementation Log Redesign
Make implementation log a permanent sidebar tab with live output and clear design.
- [ ] Create ImplementationLogPanel.vue component with terminal-style output
- [ ] Add Log tab to ProjectDetailView sidebar tabs
- [ ] Remove inline log from TaskBoard.vue
- [ ] Auto-poll while agent running, show last run when idle
- [ ] npm test + client build passes

### Agent Status Accuracy
Fix agent panel to auto-update, show live duration, and handle state transitions properly.
- [ ] Add live duration counter with 1-second tick for running agents
- [ ] Add supplemental 10-second polling while agents are running
- [ ] Verify WebSocket agents channel subscription works end-to-end
- [ ] Add completing status for agents in test/deploy phase
- [ ] npm test + client build passes

### Cron Schedule Display Fix
Fix incorrect cron times by moving relative time calculation to client side.
- [ ] Send raw UTC timestamps from server instead of pre-formatted strings
- [ ] Add client-side relative time formatting with 60-second tick
- [ ] Add watcher on jobs.json for WebSocket cron channel updates
- [ ] npm test + client build passes

### Sidebar Project Navigation
Replace static sidebar with dynamic project list for one-click project switching.
- [ ] Fetch projects and render as clickable nav items in Sidebar.vue
- [ ] Wire up Vue Router navigation with active state highlighting
- [ ] Pass project data from parent component
- [ ] Remove unused static nav items
- [ ] npm test + client build passes

## 🟢 Approved

## 🟡 In Progress

---

## ✅ Done

_See [TASKS-DONE.md](TASKS-DONE.md) for completed work._


## 🔴 Blocked

_Nothing blocked._
