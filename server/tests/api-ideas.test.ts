import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createTestApp } from './helpers/setup.js'

const app = createTestApp()

describe('GET /api/ideas', () => {
  it('REQ-3: returns array of ideas', async () => {
    const res = await request(app).get('/api/ideas')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('REQ-3: each idea has required fields', async () => {
    const res = await request(app).get('/api/ideas')
    if (res.body.length > 0) {
      const idea = res.body[0]
      expect(idea).toHaveProperty('id')
      expect(idea).toHaveProperty('name')
      expect(idea).toHaveProperty('status')
    }
  })
})

describe('GET /api/ideas/:id', () => {
  it('REQ-6: rejects ids with encoded path traversal', async () => {
    const res = await request(app).get('/api/ideas/..%2Fetc%2Fpasswd')
    expect(res.status).not.toBe(200)
  })

  it('REQ-6: rejects ids starting with dot', async () => {
    const res = await request(app).get('/api/ideas/.hidden')
    expect(res.status).toBe(400)
  })
})
