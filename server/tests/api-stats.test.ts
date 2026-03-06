import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createTestApp } from './helpers/setup.js'

const app = createTestApp()

describe('GET /api/stats', () => {
  it('REQ-1: returns stats object', async () => {
    const res = await request(app).get('/api/stats')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('uptime')
    expect(res.body).toHaveProperty('sessionsToday')
    expect(res.body).toHaveProperty('costToday')
    expect(res.body).toHaveProperty('tokensIn')
    expect(res.body).toHaveProperty('tokensOut')
    expect(res.body).toHaveProperty('activeErrors')
  })

  it('REQ-1: dailyCosts is an array', async () => {
    const res = await request(app).get('/api/stats')
    expect(Array.isArray(res.body.dailyCosts)).toBe(true)
  })
})
