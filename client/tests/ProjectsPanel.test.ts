import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import ProjectsPanel from '../src/components/ProjectsPanel.vue'

const mockRouter = {
  push: () => {},
}

describe('ProjectsPanel', () => {
  it('REQ-2: renders without errors', () => {
    const wrapper = mount(ProjectsPanel, {
      props: { projects: [] },
      global: {
        mocks: { $router: mockRouter },
        stubs: { RouterLink: true },
      },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('REQ-2: shows empty state when no projects', () => {
    const wrapper = mount(ProjectsPanel, {
      props: { projects: [] },
      global: {
        mocks: { $router: mockRouter },
        stubs: { RouterLink: true },
      },
    })
    expect(wrapper.text()).toContain('No projects found')
  })

  it('REQ-2: displays project names', () => {
    const projects = [
      {
        id: 'test-project',
        name: 'Test Project',
        description: 'A test',
        status: 'active',
        tasks: { total: 10, done: 5, todo: 2, inProgress: 1, blocked: 0, approved: 1, planned: 1 },
        progress: 50,
      },
    ]
    const wrapper = mount(ProjectsPanel, {
      props: { projects },
      global: {
        mocks: { $router: mockRouter },
        stubs: { RouterLink: true },
      },
    })
    expect(wrapper.text()).toContain('Test Project')
  })

  it('REQ-16: shows task count badges', () => {
    const projects = [
      {
        id: 'test',
        name: 'Test',
        description: '',
        status: 'active',
        tasks: { total: 10, done: 5, todo: 2, inProgress: 2, blocked: 1, approved: 1, planned: 1 },
        progress: 50,
      },
    ]
    const wrapper = mount(ProjectsPanel, {
      props: { projects },
      global: {
        mocks: { $router: mockRouter },
        stubs: { RouterLink: true },
      },
    })
    expect(wrapper.text()).toContain('blocked')
    expect(wrapper.text()).toContain('in prog')
  })
})
