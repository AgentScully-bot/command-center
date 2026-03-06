import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createTestApp } from './helpers/setup.js'

const app = createTestApp()

describe('GET /api/activity', () => {
  it('REQ-7: returns array of activities', async () => {
    const res = await request(app).get('/api/activity')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('REQ-7: each activity has required fields', async () => {
    const res = await request(app).get('/api/activity')
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('type')
      expect(res.body[0]).toHaveProperty('title')
      expect(res.body[0]).toHaveProperty('time')
    }
  })
})
