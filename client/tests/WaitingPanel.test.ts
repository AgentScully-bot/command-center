import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import WaitingPanel from '../src/components/WaitingPanel.vue'

describe('WaitingPanel', () => {
  it('REQ-1: renders without errors', () => {
    const wrapper = mount(WaitingPanel, {
      props: { groups: [] },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('REQ-1: shows empty state when no groups', () => {
    const wrapper = mount(WaitingPanel, {
      props: { groups: [] },
    })
    expect(wrapper.text()).toContain('caught up')
  })

  it('REQ-1: displays waiting items grouped by project', () => {
    const groups = [
      {
        project: 'my-project',
        items: [
          { text: 'Fix the bug', waitingOn: 'owner', section: 'In Progress', age: 2, impact: 1 },
        ],
      },
    ]
    const wrapper = mount(WaitingPanel, {
      props: { groups },
    })
    expect(wrapper.text()).toContain('my-project')
    expect(wrapper.text()).toContain('Fix the bug')
  })
})
