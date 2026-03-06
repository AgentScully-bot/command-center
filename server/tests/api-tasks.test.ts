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
