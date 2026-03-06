import { describe, it, expect } from 'vitest'
import fs from 'fs/promises'
import path from 'path'

const PROJECTS_DIR = path.join(process.env.HOME || '', 'projects')

async function getProjectsWithTasks(): Promise<{ name: string; content: string }[]> {
  const results: { name: string; content: string }[] = []
  try {
    const entries = await fs.readdir(PROJECTS_DIR, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith('.') || entry.name === '_template' || entry.name === 'ideas' || entry.name === 'memory') continue
      const tasksPath = path.join(PROJECTS_DIR, entry.name, 'TASKS.md')
      try {
        const content = await fs.readFile(tasksPath, 'utf-8')
        results.push({ name: entry.name, content })
      } catch {
        // No TASKS.md — skip
      }
    }
  } catch {
    // Projects dir doesn't exist
  }
  return results
}

describe('TASKS.md integrity', () => {
  it('no unchecked tasks in Done section', async () => {
    const projects = await getProjectsWithTasks()
    const violations: string[] = []

    for (const { name, content } of projects) {
      const lines = content.split('\n')
      let inDone = false
      let inNextSection = false

      for (const line of lines) {
        if (/^##\s.*Done/.test(line)) {
          inDone = true
          inNextSection = false
          continue
        }
        if (inDone && /^##\s/.test(line)) {
          inNextSection = true
        }
        if (inDone && !inNextSection && /^- \[ \]/.test(line)) {
          violations.push(`${name}: unchecked task in Done: ${line.trim()}`)
        }
      }
    }

    expect(violations, `Found unchecked tasks in Done sections:\n${violations.join('\n')}`).toHaveLength(0)
  })

  it('no duplicate feature headings within a project', async () => {
    const projects = await getProjectsWithTasks()
    const violations: string[] = []

    for (const { name, content } of projects) {
      const headings = content.match(/^### .+$/gm) || []
      const seen = new Set<string>()
      for (const h of headings) {
        const normalized = h.trim().replace(/\s*\(.*\)$/, '')
        if (seen.has(normalized)) {
          violations.push(`${name}: duplicate heading: ${h.trim()}`)
        }
        seen.add(normalized)
      }
    }

    expect(violations, `Found duplicate headings:\n${violations.join('\n')}`).toHaveLength(0)
  })

  it('valid section structure for command-center', async () => {
    const projects = await getProjectsWithTasks()
    const cc = projects.find(p => p.name === 'command-center')
    if (!cc) return

    const expectedOrder = ['Planned', 'Approved', 'In Progress', 'Done', 'Blocked']
    const sectionMatches = cc.content.match(/^## .+$/gm) || []
    const foundSections: string[] = []

    for (const s of sectionMatches) {
      for (const expected of expectedOrder) {
        if (s.includes(expected)) {
          foundSections.push(expected)
        }
      }
    }

    // Verify order is preserved
    for (let i = 0; i < foundSections.length - 1; i++) {
      const currentIdx = expectedOrder.indexOf(foundSections[i])
      const nextIdx = expectedOrder.indexOf(foundSections[i + 1])
      expect(currentIdx, `${foundSections[i]} should come before ${foundSections[i + 1]}`).toBeLessThan(nextIdx)
    }
  })
})
