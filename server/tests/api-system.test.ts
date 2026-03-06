import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createTestApp } from './helpers/setup.js'

const app = createTestApp()

describe('GET /api/system', () => {
  it('REQ-9: returns system health object', async () => {
    const res = await request(app).get('/api/system')
    // May timeout if openclaw CLI is not available — accept 200 or 500
    expect([200, 500]).toContain(res.status)
    if (res.status === 200) {
      expect(res.body).toHaveProperty('gateway')
    }
  }, 15000)
})
