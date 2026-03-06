import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createTestApp } from './helpers/setup.js'

const app = createTestApp()

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
