import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createTestApp } from './helpers/setup.js'

const app = createTestApp()

describe('POST /api/actions/run-cron', () => {
  it('REQ-4: rejects invalid UUID format', async () => {
    const res = await request(app)
      .post('/api/actions/run-cron')
      .send({ id: 'invalid;rm -rf /' })
    expect(res.status).toBe(400)
  })
})

describe('POST /api/actions/kill-agent', () => {
  it('REQ-5: rejects invalid session ID format', async () => {
    const res = await request(app)
      .post('/api/actions/kill-agent')
      .send({ sessionId: 'invalid;rm -rf /' })
    expect(res.status).toBe(400)
  })
})
