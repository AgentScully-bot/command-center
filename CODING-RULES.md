# CODING-RULES.md — Command Center Dashboard

Accumulated lessons and gotchas. Read this before starting work.

## Testing Philosophy

### Write tests from requirements, NOT from implementation
- Tests define what the system **should do**, not what it currently **does**.
- Mock data must match the **API contract** (spec), not the component's internal assumptions.
- Test inputs must match what the **real client sends** (e.g., `true` not `1`, arrays not JSON strings).
- A test that mirrors a bug will always pass — and never catch it.
- If implementation and test were written at the same time, review both when a bug is found.

### Every feature gets a requirements file
- `requirements/<feature>.md` defines what the feature should do.
- Tests are written against requirements, not implementation details.
- If something isn't in the requirements, it shouldn't be in the tests (and vice versa).

### Vitest Gotchas

#### `vi.hoisted()` is required for mock variables
When you need variables inside `vi.mock()` factory functions, you MUST use `vi.hoisted()`:
```typescript
// ✅ CORRECT
const { mockShellExec } = vi.hoisted(() => ({
  mockShellExec: vi.fn()
}));
vi.mock('../services/shell', () => ({
  exec: mockShellExec
}));

// ❌ WRONG — variable is undefined inside vi.mock factory
const mockShellExec = vi.fn();
vi.mock('../services/shell', () => ({
  exec: mockShellExec  // undefined! vi.mock is hoisted above const
}));
```

#### Environment separation
- Server tests (`server/tests/`): `node` environment — file system, CLI, Express.
- Client tests (`client/tests/`): `jsdom` environment — Vue components, DOM.
- These are separate packages with separate vitest configs. Don't mix.

## TASKS.md Protection

**Critical rule:** Only modify task lines under YOUR assigned feature heading.
- Do NOT move, delete, or reorder other feature blocks.
- Do NOT accidentally move unchecked tasks into Done.
- This has happened before — a coder moved another feature's incomplete tasks to Done.

## Deploy Gate

- `deploy.sh` runs the full test suite before building.
- If tests fail, the deploy is blocked.
- Failed tests are logged to `tests/last-run.json`.
- On deploy failure, add `[waiting:owner]` to the Blocked section of TASKS.md.

## Markdown Parsing

The server parses TASKS.md, PROJECT.md, DECISIONS.md, and IDEAS.md files. When modifying the markdown parser (`services/markdown.ts`):
- Section headers use emoji prefixes: `📋`, `🟢`, `🟡`, `✅`, `🔴`.
- `[waiting:name]` tags are inline — the parser extracts these.
- Task completion format: `- [x] Task description (YYYY-MM-DD)`.
- Be careful with regex changes — they affect all project parsing.

## File System Access

- **READ-ONLY** for OpenClaw state files (`~/.openclaw/`).
- **READ-ONLY** for project files (`~/projects/*/`).
- Never write to files outside the command-center project directory.
- Use `services/paths.ts` for all path constants — don't hardcode paths.

## Vue Component Patterns

- Use composables (`composables/`) for shared logic.
- API calls go through `composables/useApi.ts`.
- WebSocket connection managed by `composables/useWebSocket.ts`.
- Components should be self-contained — props in, events out.
- Follow existing component patterns — check `WaitingPanel.vue` or `TaskBoard.vue` as examples.

## Styling

- Custom CSS dark theme — NOT Tailwind.
- Reference: `~/projects/ideas/command-center-dashboard/mockup-v2.html` for design language.
- Consistent colors, spacing, and component styles across all panels.
- Check existing components before inventing new styles.

## Shell Commands

- CLI calls go through `services/shell.ts`.
- Always handle command failures gracefully — the dashboard should never crash because a CLI command fails.
- Timeout appropriately — some commands (like `openclaw status`) can hang.

## Common Mistakes to Avoid

1. **Don't move other features' tasks in TASKS.md** — only touch your own block.
2. **Don't forget `vi.hoisted()`** for mock variables in vitest.
3. **Don't write to OpenClaw state files** — read-only access.
4. **Don't hardcode file paths** — use `services/paths.ts`.
5. **Don't skip the deploy gate** — tests must pass before deploy.
6. **Don't use Tailwind** — this project uses custom CSS.
7. **Don't forget to run `bash deploy.sh`** at the end of your feature (this project auto-deploys).
8. **Don't leave your feature block in In Progress** — move the entire block to Done when complete.
