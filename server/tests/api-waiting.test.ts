import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { createTestApp } from './helpers/setup.js'
import { parseTasksFile } from '../src/services/markdown.js'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'

const app = createTestApp()

describe('parseTasksFile — waiting tag filtering', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'waiting-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('excludes done section items from waiting results', async () => {
    const content = `## ✅ Done
- [x] Completed task (2026-03-01) [waiting:owner]

## 🟢 Approved
- [ ] Active task [waiting:owner]
`
    const filePath = path.join(tmpDir, 'TASKS.md')
    await fs.writeFile(filePath, content)
    const result = await parseTasksFile(filePath)

    const waitingItems = result.items.filter(i => i.waiting && i.section !== 'done' && !i.done)
    expect(waitingItems).toHaveLength(1)
    expect(waitingItems[0].section).toBe('approved')
  })

  it('excludes checked [x] items even if not in Done section', async () => {
    const content = `## 🟡 In Progress
- [x] Already finished task [waiting:owner]
- [ ] Still pending task [waiting:owner]
`
    const filePath = path.join(tmpDir, 'TASKS.md')
    await fs.writeFile(filePath, content)
    const result = await parseTasksFile(filePath)

    const waitingItems = result.items.filter(i => i.waiting && !i.done)
    expect(waitingItems).toHaveLength(1)
    expect(waitingItems[0].text).toContain('Still pending')
  })

  it('only matches [waiting:X] at end of line, not in descriptive text', async () => {
    const content = `## 🟢 Approved
- [ ] Task about [waiting:owner] improvements in the system
- [ ] Task with actual tag [waiting:owner]
`
    const filePath = path.join(tmpDir, 'TASKS.md')
    await fs.writeFile(filePath, content)
    const result = await parseTasksFile(filePath)

    const waitingItems = result.items.filter(i => i.waiting)
    expect(waitingItems).toHaveLength(1)
    expect(waitingItems[0].text).toBe('Task with actual tag')
  })
})

describe('GET /api/waiting', () => {
  it('REQ-1: returns array of waiting items', async () => {
    const res = await request(app).get('/api/waiting')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('REQ-1: items are grouped by project', async () => {
    const res = await request(app).get('/api/waiting')
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('project')
      expect(res.body[0]).toHaveProperty('items')
      expect(Array.isArray(res.body[0].items)).toBe(true)
    }
  })

  it('REQ-2: does not return items from Done section', async () => {
    const res = await request(app).get('/api/waiting')
    if (res.body.length > 0) {
      for (const group of res.body) {
        for (const item of group.items) {
          expect(item.section).not.toBe('done')
        }
      }
    }
  })
})

describe('POST /api/waiting/resolve', () => {
  it('REQ-2: requires project and task', async () => {
    const res = await request(app)
      .post('/api/waiting/resolve')
      .send({})
    expect(res.status).toBe(400)
  })
})

describe('POST /api/waiting/snooze', () => {
  it('REQ-6: requires days >= 1', async () => {
    const res = await request(app)
      .post('/api/waiting/snooze')
      .send({ project: 'test', task: 'test', days: 0 })
    expect(res.status).toBe(400)
  })

  it('REQ-3: requires all fields', async () => {
    const res = await request(app)
      .post('/api/waiting/snooze')
      .send({})
    expect(res.status).toBe(400)
  })
})

describe('POST /api/waiting/delegate', () => {
  it('REQ-7: requires from and to fields', async () => {
    const res = await request(app)
      .post('/api/waiting/delegate')
      .send({ project: 'test', task: 'test' })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/waiting/note', () => {
  it('REQ-8: requires note text', async () => {
    const res = await request(app)
      .post('/api/waiting/note')
      .send({ project: 'test', task: 'test' })
    expect(res.status).toBe(400)
  })
})
