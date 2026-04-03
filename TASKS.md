# TASKS.md — Command Center Dashboard

## 📋 Planned






## 🟢 Approved

### Sidebar Project Navigation
Replace static sidebar with dynamic project list for one-click project switching.
- [ ] Fetch projects and render as clickable nav items in Sidebar.vue
- [ ] Wire up Vue Router navigation with active state highlighting
- [ ] Pass project data from parent component
- [ ] Remove unused static nav items
- [ ] npm test + client build passes
## 🟡 In Progress


---

## ✅ Done

### Cron Schedule Display Fix
Fix incorrect cron times by moving relative time calculation to client side.
- [x] Send raw UTC timestamps from server instead of pre-formatted strings [2026-04-02]
- [x] Add client-side relative time formatting with 60-second tick [2026-04-02]
- [x] Add watcher on jobs.json for WebSocket cron channel updates [2026-04-02]
- [x] npm test + client build passes [2026-04-02]

### Agent Status Accuracy
Fix agent panel to auto-update, show live duration, and handle state transitions properly.
- [x] Add live duration counter with 1-second tick for running agents [2026-04-02]
- [x] Add supplemental 10-second polling while agents are running [2026-04-02]
- [x] Verify WebSocket agents channel subscription works end-to-end [2026-04-02]
- [x] Add completing status for agents in test/deploy phase [2026-04-02]
- [x] npm test + client build passes [2026-04-02]

### Implementation Log Redesign
Make implementation log a permanent sidebar tab with live output and clear design.
- [x] Create ImplementationLogPanel.vue component with terminal-style output [2026-04-02]
- [x] Add Log tab to ProjectDetailView sidebar tabs [2026-04-02]
- [x] Remove inline log from TaskBoard.vue [2026-04-02]
- [x] Auto-poll while agent running, show last run when idle [2026-04-02]
- [x] npm test + client build passes [2026-04-02]


### Realtime UI Reactivity
Fix Start Implementation button not updating UI and new tasks/prompts not appearing without refresh.
- [x] Emit refresh after requestImplementation fetch succeeds (TaskBoard.vue) [2026-04-02]
- [x] Add file watchers for prompts/ and requirements/ directories (watcher.ts) [2026-04-02]
- [x] Verify WebSocket channel mapping covers all project data endpoints [2026-04-02]
- [x] npm test + client build passes [2026-04-02]

_See [TASKS-DONE.md](TASKS-DONE.md) for completed work._


## 🔴 Blocked

_Nothing blocked._
