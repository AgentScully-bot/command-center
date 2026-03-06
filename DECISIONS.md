# DECISIONS.md — Command Center Dashboard

## 2026-03-05: Requirements-Driven Testing & Deploy Gate
**Decision:** Every feature gets a requirements file (`requirements/<feature>.md`). Tests are written against requirements. `deploy.sh` runs all tests before building — blocks on failure, adds `[waiting:owner]` to Blocked section.
**Rationale:** Coder agents have been breaking things (e.g., WebSocket agent moved unrelated features into Done). Requirements give tests a clear target, and the deploy gate catches regressions before they ship.
**Framework:** Vitest for both server and client. Test results saved to `tests/last-run.json`.

## 2026-03-05: TASKS.md Protection Rule
**Decision:** All coding prompts include a mandatory rule: coder may ONLY modify task lines under its own assigned feature heading. Must not move/delete/reorder other feature blocks.
**Rationale:** WebSocket coder agent accidentally moved Idea Detail Enhancements (unchecked tasks) into the Done section. This rule prevents future cross-contamination.

## 2026-03-05: One Agent Per Feature (Sequential Execution)
**Decision:** Only one coding agent runs at a time, processing one feature per heartbeat cycle.
**Rationale:** Parallel agents editing the same codebase causes conflicts. Sequential is clean — each agent has full ownership of the codebase while it works. `run-approved.sh` enforces this with a `break` after spawning.
**Rule:** Do not change this without the owner's explicit approval.

## 2026-03-05: Auto-Deploy on Feature Completion
**Decision:** Command center auto-deploys after every successful feature completion. All other projects require manual deploy on the owner's request.
**Rationale:** Command center is an internal tool — no external users, low risk. Fast feedback loop: feature done → deployed → testable immediately. Other projects may have external users and need more careful release control.
**Implementation:** Coding prompts for command-center include `bash deploy.sh` in the Task Management section. Other projects do not.

## 2026-03-03: Tech Stack
**Decision:** Vue 3 + Vite + TypeScript (frontend), Node + Express + TypeScript (backend)
**Rationale:** Vue for reactive UI with clean component model. Node backend because OpenClaw is Node-based — easy to read its JSON state files and call its CLI. TypeScript for type safety on both ends.
**Alternatives considered:** React (heavier), Grafana (too generic, less control), plain HTML (not maintainable at scale).

## 2026-03-03: Auth Approach
**Decision:** LAN + Tailscale only, no passwords
**Rationale:** Dashboard runs on bot-linux, accessed from home network or Tailscale. No public exposure, no need for auth complexity in MVP.

## 2026-03-03: "Waiting on" Convention
**Decision:** `[waiting:name]` inline tags in TASKS.md
**Rationale:** Needs to support multiple people (owner, team members, agent, etc.) from day one. Inline tags are greppable, parseable, and don't require a separate file. Dashboard aggregates them.

## 2026-03-03: Polling vs WebSocket
**Decision:** Polling (30s) for MVP, WebSocket in Phase 2
**Rationale:** Simpler to build, good enough for a dashboard that doesn't need sub-second updates. WebSocket adds complexity for marginal benefit at this stage.

## 2026-03-03: Custom App vs Grafana
**Decision:** Custom web app
**Rationale:** Full control over UX, can build features Grafana can't (project parsing, idea pipeline, waiting-on aggregation, sub-agent controls). The owner approved mockup-v2.
