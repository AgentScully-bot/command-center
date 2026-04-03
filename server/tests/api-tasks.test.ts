import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createTestApp } from './helpers/setup.js'

const app = createTestApp()

describe('GET /api/tasks/planned', () => {
  it('REQ-1: returns array of planned tasks', async () => {
    const res = await request(app).get('/api/tasks/planned')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('REQ-4: each task has project, section, task fields', async () => {
    const res = await request(app).get('/api/tasks/planned')
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('project')
      expect(res.body[0]).toHaveProperty('task')
    }
  })
})

describe('POST /api/tasks/approve', () => {
  it('REQ-3: rejects project names with ..', async () => {
    const res = await request(app)
      .post('/api/tasks/approve')
      .send({ project: '../etc', task: 'test' })
    expect(res.status).toBe(400)
  })

  it('REQ-3: rejects project names with /', async () => {
    const res = await request(app)
      .post('/api/tasks/approve')
      .send({ project: 'foo/bar', task: 'test' })
    expect(res.status).toBe(400)
  })
})

// --- Parser resilience tests ---

import fs from 'fs/promises'
import os from 'os'
import path from 'path'

async function writeTempTasksFile(content: string): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'tasks-test-'))
  await fs.writeFile(path.join(dir, 'TASKS.md'), content, 'utf-8')
  return dir
}

// Import the parser directly for unit tests
import { parseTasksFile } from '../src/services/markdown.js'

describe('parseTasksFile — orphaned text resilience', () => {
  it('REQ-P1: orphaned text between ## and ### does not count as tasks', async () => {
    const dir = await writeTempTasksFile(`## 📋 Planned
Some orphaned description here
### My Feature
- [ ] Real task
`)
    const result = await parseTasksFile(path.join(dir, 'TASKS.md'))
    // Only the actual task should be counted
    expect(result.planned).toBe(1)
    await fs.rm(dir, { recursive: true })
  })

  it('REQ-P2: activeTotal excludes Done tasks', async () => {
    const dir = await writeTempTasksFile(`## 📋 Planned
### Feature A
- [ ] Planned task

## 🟡 In Progress
### Feature B
- [ ] In progress task

## ✅ Done
### Old Feature
- [x] Done task (2026-01-01)
`)
    const result = await parseTasksFile(path.join(dir, 'TASKS.md'))
    expect(result.done).toBe(1)
    expect(result.activeTotal).toBe(2) // planned + inProgress, not done
    expect(result.total).toBe(3)
    await fs.rm(dir, { recursive: true })
  })

  it('REQ-P3: activeTotal is 0 when all tasks are done', async () => {
    const dir = await writeTempTasksFile(`## ✅ Done
### Feature A
- [x] Done task (2026-01-01)
`)
    const result = await parseTasksFile(path.join(dir, 'TASKS.md'))
    expect(result.activeTotal).toBe(0)
    expect(result.done).toBe(1)
    await fs.rm(dir, { recursive: true })
  })
})

// --- Project detail parser resilience ---

import { parseTasksDetailed } from '../src/routes/projectDetail.js'

describe('parseTasksDetailed — feature descriptions', () => {
  it('REQ-P4: captures description between ### heading and first task', async () => {
    const dir = await writeTempTasksFile(`## 🟢 Approved
### Parser Fix
Fix orphaned description lines.
- [ ] Task one
- [ ] Task two
`)
    const result = await parseTasksDetailed(path.join(dir, 'TASKS.md'))
    expect(result.approved).toHaveLength(1)
    expect(result.approved[0].feature).toBe('Parser Fix')
    expect(result.approved[0].description).toBe('Fix orphaned description lines.')
    expect(result.approved[0].tasks).toHaveLength(2)
    await fs.rm(dir, { recursive: true })
  })

  it('REQ-P5: orphaned text between ## and ### is skipped (not added to General)', async () => {
    const dir = await writeTempTasksFile(`## 📋 Planned
Orphaned text before any feature
### Real Feature
- [ ] Task one
`)
    const result = await parseTasksDetailed(path.join(dir, 'TASKS.md'))
    // Should only have "Real Feature" group, no "General" with orphaned text
    expect(result.planned).toHaveLength(1)
    expect(result.planned[0].feature).toBe('Real Feature')
    await fs.rm(dir, { recursive: true })
  })
})
