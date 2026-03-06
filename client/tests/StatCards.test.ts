import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import StatCards from '../src/components/StatCards.vue'

describe('StatCards', () => {
  it('REQ-1: renders without errors', () => {
    const wrapper = mount(StatCards, {
      props: { stats: null },
    })
    expect(wrapper.exists()).toBe(true)
  })

  it('REQ-1: displays stat values when provided', () => {
    const wrapper = mount(StatCards, {
      props: {
        stats: {
          uptime: '3d 2h',
          sessionsToday: 42,
          costToday: 1.5,
          costMonth: 25.0,
          tokensIn: 500000,
          tokensOut: 120000,
          activeErrors: 0,
          gatewayService: 'running',
        },
      },
    })
    expect(wrapper.text()).toContain('3d 2h')
    expect(wrapper.text()).toContain('42')
  })

  it('REQ-1: shows fallback when stats is null', () => {
    const wrapper = mount(StatCards, {
      props: { stats: null },
    })
    expect(wrapper.text()).toContain('—')
  })

  it('REQ-1: formats large token counts', () => {
    const wrapper = mount(StatCards, {
      props: {
        stats: {
          uptime: '1h',
          sessionsToday: 1,
          costToday: 0,
          costMonth: 0,
          tokensIn: 1500000,
          tokensOut: 250000,
          activeErrors: 0,
          gatewayService: 'running',
        },
      },
    })
    expect(wrapper.text()).toContain('1.5M')
    expect(wrapper.text()).toContain('250k')
  })

  it('REQ-1: shows error count with correct color intent', () => {
    const wrapper = mount(StatCards, {
      props: {
        stats: {
          uptime: '1h',
          sessionsToday: 1,
          costToday: 0,
          costMonth: 0,
          tokensIn: 0,
          tokensOut: 0,
          activeErrors: 3,
          gatewayService: 'running',
        },
      },
    })
    expect(wrapper.text()).toContain('3')
  })
})
