import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createTestApp } from './helpers/setup.js'

const app = createTestApp()

describe('GET /api/logs', () => {
  it('REQ-1: returns array of log entries', async () => {
    const res = await request(app).get('/api/logs')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('REQ-2: supports level filter', async () => {
    const res = await request(app).get('/api/logs?level=error')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('REQ-3: supports limit param', async () => {
    const res = await request(app).get('/api/logs?limit=5')
    expect(res.status).toBe(200)
    expect(res.body.length).toBeLessThanOrEqual(5)
  })
})
