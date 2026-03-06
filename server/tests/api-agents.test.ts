import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createTestApp } from './helpers/setup.js'

const app = createTestApp()

describe('GET /api/agents', () => {
  it('REQ-1: returns array of agents', async () => {
    const res = await request(app).get('/api/agents')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('REQ-3: each agent has status field', async () => {
    const res = await request(app).get('/api/agents')
    for (const agent of res.body) {
      expect(['running', 'completed', 'errored', 'crashed']).toContain(agent.status)
    }
  })
})
