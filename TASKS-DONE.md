# TASKS-DONE.md — Command Center Dashboard
# Completed work, moved here to keep TASKS.md lean.

## ✅ Done

### Agent Status Reliability (2026-03-16)
- [x] Fix `isProcessRunning(0)` — treat pid=0/null as "no PID known"; skip signal check entirely for these entries (2026-03-16)
- [x] Apply age-based timeout for no-PID entries: status=running + age > 4h → downgrade to `stale` in both response and file (2026-03-16)
- [x] Apply max-age safety net for all running entries: age > 8h → auto-downgrade to `completed` in response AND write correction back to tracker file (2026-03-16)
- [x] Fix dead-PID entries: when signal-0 check fails, write `status=completed` correction back to `agent-tracker.json` atomically (2026-03-16)
- [x] Fix `ps aux` fallback: removed entirely since tracker covers all legitimate cases (2026-03-16)
- [x] Fix sessions watcher path: `watcher.ts` now watches `~/.openclaw/agents/main/sessions/sessions.json` (2026-03-16)
- [x] Add `reset` subcommand to `track-agent.sh`: marks all `running` entries as `stale` (2026-03-16)
- [x] Handle `stale` status in `ProjectAgentsPanel.vue`: orange dot in history, labeled "stale" (2026-03-16)


### Sidebar Agent Indicator Live Wiring (2026-03-11)
- [x] Poll `/api/model-status` every 60s in `Sidebar.vue` (2026-03-11)
- [x] Show "Agent Scully" as name (static), `active.alias` as model label (2026-03-11)
- [x] Status dot: green = primary, yellow = fallback, gray = loading/error (2026-03-11)
- [x] Tooltip on hover: `{model} · primary/fallback` (2026-03-11)


### Task-Level Delete Button (2026-03-07)
- [x] Backend: Add `DELETE /api/projects/:id/task` route — removes matching undone task from Planned section; cleans up orphaned `### Feature` headings; broadcasts `tasks` + `projects`
- [x] Backend: Add tests for the delete endpoint (valid delete, 404, missing body, orphan cleanup, done tasks untouched)
- [x] Frontend: In `TaskBoard.vue`, replace per-task "Approve" button with "Delete" (red style, emits `deleteTask`); remove `approveTask` emit
- [x] Frontend: In `ProjectDetailView.vue`, replace `approveTask` handler with `deleteTask` calling `DELETE /api/projects/:id/task`


### Heartbeat Timer in Task Board (2026-03-07)
- [x] Server route `GET /api/heartbeat-status` — parse OpenClaw log for last heartbeat timestamp + interval (2026-03-07)
- [x] Vue composable `useHeartbeatStatus()` — polls endpoint every 30s, computes next expected (2026-03-07)
- [x] `TaskBoard.vue` header — live countdown badge (ticks client-side every second) (2026-03-07)
- [x] States: counting down, overdue, outside active hours (2026-03-07)
