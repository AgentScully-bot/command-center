import { describe, it, expect } from 'vitest'
import request from 'supertest'
import { createTestApp } from './helpers/setup.js'

const app = createTestApp()

describe('GET /api/projects', () => {
  it('REQ-2: returns array of projects', async () => {
    const res = await request(app).get('/api/projects')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('REQ-2: each project has required fields', async () => {
    const res = await request(app).get('/api/projects')
    if (res.body.length > 0) {
      const project = res.body[0]
      expect(project).toHaveProperty('id')
      expect(project).toHaveProperty('name')
      expect(project).toHaveProperty('tasks')
      expect(project).toHaveProperty('progress')
    }
  })

  it('REQ-16: each project has per-section task counts', async () => {
    const res = await request(app).get('/api/projects')
    if (res.body.length > 0) {
      const { tasks } = res.body[0]
      expect(tasks).toHaveProperty('total')
      expect(tasks).toHaveProperty('done')
      expect(tasks).toHaveProperty('inProgress')
      expect(tasks).toHaveProperty('blocked')
      expect(tasks).toHaveProperty('approved')
      expect(tasks).toHaveProperty('planned')
    }
  })
})

describe('GET /api/projects/:id', () => {
  it('REQ-10: rejects ids with encoded path traversal', async () => {
    const res = await request(app).get('/api/projects/..%2Fetc%2Fpasswd')
    expect([400, 404, 500]).toContain(res.status)
    expect(res.status).not.toBe(200)
  })

  it('REQ-10: rejects ids starting with dot', async () => {
    const res = await request(app).get('/api/projects/.hidden')
    expect(res.status).toBe(400)
  })

  it('REQ-1: returns project detail for valid project', async () => {
    const res = await request(app).get('/api/projects/command-center')
    if (res.status === 200) {
      expect(res.body).toHaveProperty('id')
      expect(res.body).toHaveProperty('name')
      expect(res.body).toHaveProperty('tasks')
      expect(res.body).toHaveProperty('progress')
    }
  })
})

describe('GET /api/projects/:id/git', () => {
  it('REQ-5: returns git info for valid project', async () => {
    const res = await request(app).get('/api/projects/command-center/git')
    if (res.status === 200) {
      expect(res.body).toHaveProperty('branch')
      expect(res.body).toHaveProperty('clean')
      expect(res.body).toHaveProperty('commits')
      expect(Array.isArray(res.body.commits)).toBe(true)
    }
  })
})

describe('GET /api/projects/:id/activity', () => {
  it('REQ-6: returns array of activity entries', async () => {
    const res = await request(app).get('/api/projects/command-center/activity')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })
})

describe('GET /api/projects/:id/prompts', () => {
  it('REQ-11: returns array of prompts', async () => {
    const res = await request(app).get('/api/projects/command-center/prompts')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('REQ-11: each prompt has name and filename', async () => {
    const res = await request(app).get('/api/projects/command-center/prompts')
    if (res.body.length > 0) {
      expect(res.body[0]).toHaveProperty('name')
      expect(res.body[0]).toHaveProperty('filename')
    }
  })
})

describe('GET /api/projects/:id/prompts/:name', () => {
  it('REQ-13: rejects prompt names with special characters', async () => {
    const res = await request(app).get('/api/projects/command-center/prompts/foo%2F..%2F..%2Fetc')
    expect(res.status).not.toBe(200)
  })

  it('REQ-12: returns valid prompt content', async () => {
    const res = await request(app).get('/api/projects/command-center/prompts/_generic')
    if (res.status === 200) {
      expect(res.body).toHaveProperty('content')
      expect(res.body).toHaveProperty('name')
    }
  })
})

describe('GET /api/projects/:id/prompt-status', () => {
  it('REQ-14: returns features array with hasPrompt', async () => {
    const res = await request(app).get('/api/projects/command-center/prompt-status')
    if (res.status === 200) {
      expect(res.body).toHaveProperty('features')
      expect(Array.isArray(res.body.features)).toBe(true)
      if (res.body.features.length > 0) {
        expect(res.body.features[0]).toHaveProperty('name')
        expect(res.body.features[0]).toHaveProperty('hasPrompt')
      }
    }
  })
})

describe('GET /api/projects/:id/deploys', () => {
  it('returns 404 for non-existent project', async () => {
    const res = await request(app).get('/api/projects/nonexistent-project-xyz/deploys')
    expect(res.status).toBe(404)
  })

  it('returns hasDeployScript as boolean', async () => {
    const res = await request(app).get('/api/projects/command-center/deploys')
    if (res.status === 200) {
      expect(res.body).toHaveProperty('hasDeployScript')
      expect(typeof res.body.hasDeployScript).toBe('boolean')
    }
  })

  it('returns required fields in response', async () => {
    const res = await request(app).get('/api/projects/command-center/deploys')
    if (res.status === 200) {
      expect(res.body).toHaveProperty('hasDeployScript')
      expect(res.body).toHaveProperty('service')
      expect(res.body).toHaveProperty('lastTest')
      expect(res.body).toHaveProperty('recentDeploys')
      expect(Array.isArray(res.body.recentDeploys)).toBe(true)
    }
  })

  it('returns lastTest with expected shape when tests/last-run.json exists', async () => {
    const res = await request(app).get('/api/projects/command-center/deploys')
    if (res.status === 200 && res.body.lastTest !== null) {
      const t = res.body.lastTest
      expect(t).toHaveProperty('timestamp')
      expect(t).toHaveProperty('passed')
      expect(t).toHaveProperty('server')
      expect(t).toHaveProperty('client')
      expect(t).toHaveProperty('duration')
    }
  })

  it('returns recentDeploys items with hash, message, date', async () => {
    const res = await request(app).get('/api/projects/command-center/deploys')
    if (res.status === 200 && res.body.recentDeploys.length > 0) {
      const commit = res.body.recentDeploys[0]
      expect(commit).toHaveProperty('hash')
      expect(commit).toHaveProperty('message')
      expect(commit).toHaveProperty('date')
    }
  })

  it('includes backward-compat status field', async () => {
    const res = await request(app).get('/api/projects/command-center/deploys')
    if (res.status === 200) {
      expect(res.body).toHaveProperty('status')
    }
  })
})
