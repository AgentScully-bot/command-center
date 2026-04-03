# TASKS.md — Command Center Dashboard

## 📋 Planned

## 🟢 Approved

## 🟡 In Progress

---

## ✅ Done

### Task Section Parser Resilience
Fix orphaned description lines inflating counts and breaking section transitions.
- [x] Parser skips orphaned text between ## section header and first ### feature heading (2026-04-02)
- [x] Capture feature descriptions (text between ### heading and first task line) (2026-04-02)
- [x] Approve endpoint moves full feature block (heading + description + tasks together) (2026-04-02)
- [x] Add tests for orphaned description handling (2026-04-02)
- [x] npm test + client build passes (2026-04-02)

### Active Task Count Fix
Show active task count instead of inflated total that includes Done tasks.
- [x] Add activeTotal field to counts (excludes Done) (2026-04-02)
- [x] Client displays activeTotal as primary ("X remaining") with done as secondary (2026-04-02)
- [x] npm test + client build passes (2026-04-02)

_See [TASKS-DONE.md](TASKS-DONE.md) for completed work._


## 🔴 Blocked

_Nothing blocked._
