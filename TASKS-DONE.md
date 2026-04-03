# TASKS-DONE.md — Command Center Dashboard
# Completed work, moved here to keep TASKS.md lean.

## ✅ Done

### Active Task Count Fix
Show active task count instead of inflated total that includes Done tasks.
- [x] Add activeTotal field to counts (excludes Done) (2026-04-02)
- [x] Client displays activeTotal as primary ("X remaining") with done as secondary (2026-04-02)
- [x] npm test + client build passes (2026-04-02)

### Task Section Parser Resilience
Fix orphaned description lines inflating counts and breaking section transitions.
- [x] Parser skips orphaned text between ## section header and first ### feature heading (2026-04-02)
- [x] Capture feature descriptions (text between ### heading and first task line) (2026-04-02)
- [x] Approve endpoint moves full feature block (heading + description + tasks together) (2026-04-02)
- [x] Add tests for orphaned description handling (2026-04-02)
- [x] npm test + client build passes (2026-04-02)

### Project Agents Panel Fix (2026-03-22)
Fix "Agents on This Project" showing empty on project pages for ACP-spawned agents.
- [x] Infer project field for OpenClaw session agents (match label against known project dirs) (2026-03-22)
- [x] Raise HISTORY_LIMIT from 2 to 5 in ProjectAgentsPanel.vue (2026-03-22)
- [x] npm test + client build passes (2026-03-22)

### Replicate Build Pipeline (2026-03-21)
- [x] Create `_template/scripts/` with all 6 pipeline scripts (verify, health-check, run-approved, check-approved, track-agent, to-kebab) (2026-03-21)
- [x] Create `trade-relay/scripts/verify.sh` — Node.js/SvelteKit test runner (2026-03-21)
- [x] Replace `trade-relay/scripts/health-check.sh` — trade-relay-web service + HTTP endpoint check (2026-03-21)
- [x] Update `trade-relay/scripts/run-approved.sh` — verify→deploy→health pipeline (2026-03-21)
- [x] Create `trade-relay/prompts/fix-test-failures.md` (2026-03-21)
- [x] Create `learner-log/scripts/verify.sh` — flutter analyze + flutter test (2026-03-21)
- [x] Create `learner-log/scripts/health-check.sh` — flutter build apk --debug (2026-03-21)
- [x] Create `learner-log/prompts/fix-test-failures.md` (2026-03-21)
- [x] Create `etrade-agent/scripts/verify.sh` — uv run pytest (2026-03-21)
- [x] Create `etrade-agent/scripts/health-check.sh` — Python module smoke test (2026-03-21)
- [x] Create `etrade-agent/scripts/` run-approved, check-approved, track-agent, to-kebab (2026-03-21)
- [x] Create `etrade-agent/prompts/fix-test-failures.md` (2026-03-21)

### Heartbeat Status Display Fix (2026-03-21)
- [x] Fix config path: read `config?.agents?.defaults?.heartbeat?.activeHours` with fallback to `config?.heartbeat?.activeHours` (2026-03-21)
- [x] Fix overdue display: show "~Xm overdue" / "~Xh overdue" for extended overdue states instead of perpetual "any moment" (2026-03-21)

### Coder Agent Knowledge Base (2026-03-20)
- [x] Create `CLAUDE.md` in project root — architecture overview, tech stack, file conventions, import patterns, TASKS.md management rules (2026-03-20)
- [x] Create `CODING-RULES.md` in project root — accumulated gotchas, testing philosophy, known pitfalls (2026-03-20)
- [x] Add "Read CODING-RULES.md before starting" instruction to CLAUDE.md (2026-03-20)
- [x] Backfill lessons from past features into CODING-RULES.md (2026-03-20)

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
