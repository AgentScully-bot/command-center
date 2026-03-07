import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import request from 'supertest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { createTestApp } from './helpers/setup.js'
import { clearStatsCache } from '../src/routes/stats.js'

const app = createTestApp()

// Create mock session JSONL data in a temp dir
const tmpHome = path.join(os.tmpdir(), `stats-test-${Date.now()}`)
const agentSessionsDir = path.join(tmpHome, 'agents', 'agent-scully', 'sessions')
const authProfilePath = path.join(tmpHome, 'agents', 'agent-scully', 'agent', 'auth-profiles.json')
const todayStr = new Date().toISOString().slice(0, 10)

const mockJsonlContent = [
  JSON.stringify({ type: 'session', version: 3, id: 'test-session', timestamp: `${todayStr}T10:00:00Z` }),
  JSON.stringify({
    type: 'message', id: 'msg1', timestamp: `${todayStr}T10:01:00Z`,
    message: {
      role: 'assistant', model: 'claude-sonnet-4-6',
      usage: { input: 100, output: 200, cacheRead: 0, cacheWrite: 0, totalTokens: 300, cost: { input: 0.001, output: 0.003, cacheRead: 0, cacheWrite: 0, total: 0.004 } }
    }
  }),
  JSON.stringify({
    type: 'message', id: 'msg2', timestamp: `${todayStr}T10:05:00Z`,
    message: {
      role: 'assistant', model: 'claude-sonnet-4-6',
      usage: { input: 50, output: 80, cacheRead: 0, cacheWrite: 0, totalTokens: 130, cost: { input: 0.0005, output: 0.0012, cacheRead: 0, cacheWrite: 0, total: 0.0017 } }
    }
  }),
].join('\n') + '\n'

const mockAuthProfiles = {
  version: 1,
  profiles: {},
  usageStats: {
    'anthropic:manual': { lastUsed: Date.now(), errorCount: 0 }
  }
}

beforeAll(async () => {
  // Set up mock filesystem
  await fs.mkdir(agentSessionsDir, { recursive: true })
  await fs.mkdir(path.dirname(authProfilePath), { recursive: true })
  await fs.writeFile(path.join(agentSessionsDir, 'test-session.jsonl'), mockJsonlContent)
  await fs.writeFile(authProfilePath, JSON.stringify(mockAuthProfiles))

  // Point stats route at temp dir
  process.env.OPENCLAW_HOME = tmpHome
  clearStatsCache()
})

afterAll(async () => {
  delete process.env.OPENCLAW_HOME
  await fs.rm(tmpHome, { recursive: true, force: true })
})

describe('GET /api/stats', () => {
  it('returns stats object with all required fields', async () => {
    const res = await request(app).get('/api/stats')
    expect(res.status).toBe(200)
    expect(res.body).toHaveProperty('uptime')
    expect(res.body).toHaveProperty('sessionsToday')
    expect(res.body).toHaveProperty('costToday')
    expect(res.body).toHaveProperty('costMonth')
    expect(res.body).toHaveProperty('tokensIn')
    expect(res.body).toHaveProperty('tokensOut')
    expect(res.body).toHaveProperty('activeErrors')
    expect(res.body).toHaveProperty('dailyCosts')
  })

  it('dailyCosts is a 14-element array', async () => {
    const res = await request(app).get('/api/stats')
    expect(Array.isArray(res.body.dailyCosts)).toBe(true)
    expect(res.body.dailyCosts).toHaveLength(14)
    for (const entry of res.body.dailyCosts) {
      expect(entry).toHaveProperty('date')
      expect(entry).toHaveProperty('cost')
    }
  })

  it('parses token and cost data from session JSONL', async () => {
    const res = await request(app).get('/api/stats')
    // 100 + 50 = 150 input tokens
    expect(res.body.tokensIn).toBe(150)
    // 200 + 80 = 280 output tokens
    expect(res.body.tokensOut).toBe(280)
    // 0.004 + 0.0017 = 0.0057
    expect(res.body.costToday).toBeCloseTo(0.01, 1)
    expect(res.body.costMonth).toBeGreaterThan(0)
  })

  it('counts sessions with today timestamps', async () => {
    const res = await request(app).get('/api/stats')
    expect(res.body.sessionsToday).toBe(1)
  })

  it('returns cached data on second call within 30s', async () => {
    const res1 = await request(app).get('/api/stats')
    const res2 = await request(app).get('/api/stats')
    expect(res1.body).toEqual(res2.body)
  })
})
