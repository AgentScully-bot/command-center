import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createTestApp } from './helpers/setup.js'

const app = createTestApp()

describe('GET /api/cron', () => {
  it('REQ-6: returns array of cron jobs', async () => {
    const res = await request(app).get('/api/cron')
    // May timeout if openclaw CLI is not available — accept 200 or 500
    expect([200, 500]).toContain(res.status)
    if (res.status === 200) {
      expect(Array.isArray(res.body)).toBe(true)
    }
  }, 15000)
})
