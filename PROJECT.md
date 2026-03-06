# Command Center Dashboard

## Overview
A web dashboard that gives the owner a single-pane-of-glass view into the OpenClaw system, all projects, ideas, and anything that needs his attention. Built as a custom Vue app, dark-themed, designed for desktop with future mobile support.

## Goals
- See system health at a glance (gateway, channels, errors)
- Monitor all projects: progress, tasks, blockers, agents working
- View idea pipeline with lifecycle stages
- Surface "waiting on" items across all projects in one place
- Track token usage and costs
- Monitor cron jobs and sub-agents
- See recent activity timeline

## Tech Stack
- **Frontend:** Vue 3 + Vite + TypeScript
- **Backend:** Node.js + Express + TypeScript
- **Styling:** CSS (custom, dark theme — see mockup-v2.html for design language)
- **Data:** Reads OpenClaw state files, parses project markdown files, calls OpenClaw CLI
- **Real-time:** Polling for MVP, WebSocket planned for Phase 2

## Infrastructure
- Runs on bot-linux (same machine as OpenClaw)
- Port 3000
- Auth: LAN + Tailscale only, no passwords (trust the network)
- No external dependencies beyond what's on the machine

## Data Sources
1. **OpenClaw state files** — JSON files under ~/.openclaw/ (sessions, cron, devices, etc.)
2. **OpenClaw CLI** — `openclaw status`, `openclaw cron list`, etc.
3. **Project files** — ~/projects/*/PROJECT.md, TASKS.md, DECISIONS.md, memory/
4. **Ideas files** — ~/projects/ideas/*/README.md
5. **Ideas index** — ~/projects/ideas/IDEAS.md
6. **PROJECTS.md** — ~/projects/PROJECTS.md (master project index)
7. **Config** — ~/.openclaw/workspace/openclaw.json

## Key Conventions

### "Waiting on" Tags
Tasks in TASKS.md can be tagged with `[waiting:name]` where name is any person or entity:
- `[waiting:owner]` — needs the owner's input/action
- `[waiting:carmen]` — needs Carmen's input
- `[waiting:agent]` — waiting on a sub-agent to finish
- Dashboard aggregates all `[waiting:owner]` items into the "Waiting on You" panel

### Task Parsing
TASKS.md files use this format:
```
## 🟢 Todo
- [ ] Task description [waiting:owner]
- [ ] Another task

## 🟡 In Progress
- [ ] Active task

## ✅ Done
- [x] Completed task (2026-03-01)

## 🔴 Blocked
- [ ] Blocked task — reason [waiting:owner]
```

## Design Reference
- Mockup: ~/projects/ideas/command-center-dashboard/mockup-v2.html
- Color scheme, layout, component styles are all defined there
- Sidebar navigation, stat cards, panels, tables — follow the mockup closely

## Constraints
- Must not interfere with OpenClaw operation (read-only access to state files)
- Keep dependencies minimal
- Must start cleanly and survive restarts (systemd service eventually)
- Desktop-first layout; mobile-responsive is Phase 2
- No external API calls needed for MVP
