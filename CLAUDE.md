# CLAUDE.md — Command Center Dashboard

Read this file and `CODING-RULES.md` before starting any work.

## Project Overview

A web dashboard giving a single-pane-of-glass view into the OpenClaw system, all projects, ideas, and anything that needs attention. Internal tool — auto-deploys after successful feature completion.

## Architecture

```
Browser ←→ Vue 3 SPA ←→ Express API ←→ { OpenClaw state files, project markdown, CLI }
```

The server reads OpenClaw's state files, parses project markdown files, and calls OpenClaw CLI commands. The client renders everything in a dark-themed dashboard.

## Tech Stack

| Layer    | Technology                        |
|----------|-----------------------------------|
| Frontend | Vue 3 + Vite + TypeScript         |
| Backend  | Node.js + Express + TypeScript    |
| Styling  | Custom CSS (dark theme)           |
| Data     | File system reads + OpenClaw CLI  |
| Real-time| Polling (30s) + WebSocket         |
| Tests    | Vitest (server: node, client: jsdom) |

## Directory Structure

```
server/
├── src/
│   ├── index.ts                # Express server entry
│   ├── watcher.ts              # File system watcher
│   ├── ws.ts                   # WebSocket handler
│   ├── routes/                 # Express route handlers
│   │   ├── actions.ts          # Task approval/management actions
│   │   ├── activity.ts         # Recent activity feed
│   │   ├── agents.ts           # Sub-agent status
│   │   ├── cron.ts             # Cron job management
│   │   ├── heartbeat.ts        # Heartbeat status
│   │   ├── ideas.ts            # Ideas pipeline
│   │   ├── ideaDetail.ts       # Idea drill-down
│   │   ├── logs.ts             # Event log viewer
│   │   ├── modelStatus.ts      # LLM model status
│   │   ├── projectDetail.ts    # Project drill-down
│   │   ├── projects.ts         # Project list
│   │   ├── stats.ts            # Dashboard stat cards
│   │   ├── system.ts           # System health
│   │   ├── tasks.ts            # Task board
│   │   ├── upcoming.ts         # Upcoming events
│   │   └── waiting.ts          # "Waiting on you" items
│   └── services/               # Shared utilities
│       ├── markdown.ts         # Markdown file parser
│       ├── paths.ts            # File path constants
│       └── shell.ts            # CLI command runner
├── tests/                      # Server-side tests (node environment)
├── vitest.config.ts
└── package.json

client/
├── src/
│   ├── App.vue                 # Root component
│   ├── main.ts                 # Vue app entry
│   ├── router.ts               # Vue Router config
│   ├── views/                  # Page-level views
│   │   ├── DashboardView.vue   # Main dashboard
│   │   ├── ProjectDetailView.vue
│   │   └── IdeaDetailView.vue
│   ├── components/             # Reusable UI components
│   │   ├── TopBar.vue
│   │   ├── Sidebar.vue
│   │   ├── BottomNav.vue
│   │   ├── TaskBoard.vue
│   │   ├── WaitingPanel.vue
│   │   ├── ProjectsPanel.vue
│   │   ├── IdeasPanel.vue
│   │   ├── SubAgentsPanel.vue
│   │   ├── CronPanel.vue
│   │   ├── ActivityFeed.vue
│   │   ├── EventLogPanel.vue
│   │   └── ...
│   └── composables/            # Vue composables
│       ├── useApi.ts
│       ├── useWebSocket.ts
│       └── useHeartbeatStatus.ts
├── tests/                      # Client-side tests (jsdom environment)
├── vitest.config.ts
└── package.json

scripts/
├── check-approved.sh           # Heartbeat: check for approved tasks
├── run-approved.sh             # Spawn coder agent for approved feature
├── track-agent.sh              # Track running coding agent
└── to-kebab.sh                 # Feature name → kebab-case filename

prompts/                        # Coding agent prompt files
requirements/                   # Feature requirement specs
tests/                          # Deploy test results (last-run.json)
```

## Key Conventions

### Data Sources
The server reads these external sources (READ-ONLY — never write to OpenClaw state):
1. **OpenClaw state files:** `~/.openclaw/` (sessions, cron, devices)
2. **OpenClaw CLI:** `openclaw status`, `openclaw cron list`, etc.
3. **Project files:** `~/projects/*/PROJECT.md`, `TASKS.md`, `DECISIONS.md`, `memory/`
4. **Ideas files:** `~/projects/ideas/*/README.md`, `~/projects/ideas/IDEAS.md`
5. **Config:** `~/.openclaw/workspace/openclaw.json`

### TASKS.md Parsing
The server parses TASKS.md files across all projects. Format:
```markdown
## 📋 Planned
## 🟢 Approved
## 🟡 In Progress
## ✅ Done
## 🔴 Blocked
```
Tasks can have inline tags: `[waiting:owner]`, `[waiting:agent]`, etc.

### "Waiting on" Tags
`[waiting:name]` inline in TASKS.md. The dashboard aggregates all `[waiting:owner]` items into the "Waiting on You" panel.

### Styling
- Custom CSS dark theme (no Tailwind).
- Follow the design language in `~/projects/ideas/command-center-dashboard/mockup-v2.html`.
- Consistent with existing component styles — check similar components before creating new ones.

### Deployment
- **Auto-deploys on feature completion** (unique to this project — all others are manual).
- Source: `~/projects/command-center/` (clean, git-tracked).
- Runtime: `~/deployments/command-center/`.
- `deploy.sh` runs full test suite before building — failures block deploy.
- Systemd user service: `command-center.service` on port 3000.
- Tests save results to `tests/last-run.json`.

## Test Configuration

### Server tests
- Directory: `server/tests/`
- Environment: `node`
- Run: `cd server && npm test`

### Client tests
- Directory: `client/tests/`
- Environment: `jsdom`
- Run: `cd client && npm test`

### Deploy gate
- `deploy.sh` runs both server and client tests.
- On failure: blocks deploy, writes failure details to `tests/last-run.json`.

## TASKS.md Management

When you complete a feature:
1. Mark all tasks under your `### Feature Name` heading as `[x]` with today's date.
2. Move the ENTIRE feature block (heading + all tasks) to the top of the `✅ Done` section.
3. Only modify YOUR OWN feature block — do NOT touch other feature blocks or sections.
4. Run `bash deploy.sh` to build and deploy (this project auto-deploys).

## Commands

```bash
# Development
cd ~/projects/command-center && bash start.sh       # Start both server + client dev

# Server
cd ~/projects/command-center/server && npm run dev  # Dev server with hot reload
cd ~/projects/command-center/server && npm test      # Run server tests

# Client
cd ~/projects/command-center/client && npm run dev  # Vite dev server
cd ~/projects/command-center/client && npm test      # Run client tests

# Deploy
cd ~/projects/command-center && bash deploy.sh       # Test + build + deploy
```
