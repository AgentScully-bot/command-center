# Coding Prompt: Generic Task Pickup
<!-- model: sonnet -->

## Context

You are working on a project. Read the following files first:

1. **PROJECT.md** — Project scope, goals, tech stack, constraints
2. **TASKS.md** — Current task board with lifecycle sections

## Your Job

Pick up items from the **In Progress** section in TASKS.md. If nothing is in progress, check **Approved** for tasks ready to implement.

## Workflow

1. Read PROJECT.md to understand the project
2. Read TASKS.md to find your assigned work
3. Study existing code patterns before writing new code
4. Implement the features following existing conventions
5. Update TASKS.md as you complete items — mark with `[x]` and add date: `(YYYY-MM-DD)`
6. Run builds to verify no TypeScript or compilation errors
7. Test your changes work correctly

## ⚠️ TASKS.md Rules
- ONLY modify task lines under YOUR assigned feature heading
- Do NOT move, delete, or reorder other feature blocks
- Do NOT touch tasks belonging to other features
- When moving your feature to Done: insert your block at the TOP of the Done section, above existing entries
- Verify after editing: all other features are still in their original sections

## Requirements
- If a `requirements/<feature>.md` file exists for your feature, read it
- For each REQ-N, write at least one test that verifies it
- Tests go in `tests/server/` or `tests/client/` as appropriate
- Run `npm test` in both server/ and client/ before marking tasks done

## Conventions

- Follow existing code patterns in the project
- Use the same styling, naming, and file organization as existing code
- Check for design mockups in `~/projects/ideas/` if the project has them
- Log significant decisions in DECISIONS.md

## When Done

1. Mark all tasks done in TASKS.md with date
2. Move the completed feature block to the Done section
3. Deploy:
```bash
bash deploy.sh
```
4. Notify:
```
openclaw system event --text "Done: [brief summary of what you built]" --mode now
```
