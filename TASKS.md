# TASKS.md — Command Center Dashboard

## 📋 Planned

## 🟢 Approved

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

## 🟡 In Progress

---

## ✅ Done

_See [TASKS-DONE.md](TASKS-DONE.md) for completed work._


## 🔴 Blocked

_Nothing blocked._
