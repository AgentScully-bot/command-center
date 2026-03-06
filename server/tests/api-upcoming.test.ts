import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createTestApp } from './helpers/setup.js'

const app = createTestApp()

describe('GET /api/upcoming', () => {
  it('REQ-8: returns array of upcoming items', async () => {
    const res = await request(app).get('/api/upcoming')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})
