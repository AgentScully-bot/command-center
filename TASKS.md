# TASKS.md — Command Center Dashboard

## 📋 Planned

### Project Agents Panel Fix
Fix "Agents on This Project" showing empty on project pages for ACP-spawned agents.
- [ ] Infer project field for OpenClaw session agents (match label against known project dirs)
- [ ] Raise HISTORY_LIMIT from 2 to 5 in ProjectAgentsPanel.vue
- [ ] npm test + client build passes

### Active Task Count Fix
Show active task count instead of inflated total that includes Done tasks.
- [ ] Add activeTotal field to counts (excludes Done)
- [ ] Client displays activeTotal as primary ("X remaining") with done as secondary
- [ ] npm test + client build passes

### Task Section Parser Resilience
Fix orphaned description lines inflating counts and breaking section transitions.
- [ ] Parser skips orphaned text between ## section header and first ### feature heading
- [ ] Capture feature descriptions (text between ### heading and first task line)
- [ ] Approve endpoint moves full feature block (heading + description + tasks together)
- [ ] Add tests for orphaned description handling
- [ ] npm test + client build passes

## 🟢 Approved
Ready for implementation — coder agent can pick these up.






## ✅ Done

### Replicate Build Pipeline
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

### Heartbeat Status Display Fix
- [x] Fix config path: read `config?.agents?.defaults?.heartbeat?.activeHours` with fallback to `config?.heartbeat?.activeHours` (2026-03-21)
- [x] Fix overdue display: show "~Xm overdue" / "~Xh overdue" for extended overdue states instead of perpetual "any moment" (2026-03-21)

### Coder Agent Knowledge Base
- [x] Create `CLAUDE.md` in project root — architecture overview, tech stack, file conventions, import patterns, TASKS.md management rules (2026-03-20)
- [x] Create `CODING-RULES.md` in project root — accumulated gotchas, testing philosophy, known pitfalls (2026-03-20)
- [x] Add "Read CODING-RULES.md before starting" instruction to CLAUDE.md (2026-03-20)
- [x] Backfill lessons from past features into CODING-RULES.md (2026-03-20)

_See [TASKS-DONE.md](TASKS-DONE.md) for completed work._


## 🔴 Blocked

_Nothing blocked._
