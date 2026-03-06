<script setup lang="ts">
import StatCards from '../components/StatCards.vue'
import ProjectsPanel from '../components/ProjectsPanel.vue'
import WaitingPanel from '../components/WaitingPanel.vue'
import IdeasPanel from '../components/IdeasPanel.vue'
import SubAgentsPanel from '../components/SubAgentsPanel.vue'
import CronPanel from '../components/CronPanel.vue'
import ActivityFeed from '../components/ActivityFeed.vue'
import UpcomingPanel from '../components/UpcomingPanel.vue'
import EventLogPanel from '../components/EventLogPanel.vue'
import { useApi } from '../composables/useApi'

const { data: stats } = useApi<Record<string, unknown>>('/api/stats')
const { data: projects } = useApi<unknown[]>('/api/projects')
const { data: ideas } = useApi<unknown[]>('/api/ideas')
const { data: waiting, refresh: refreshWaiting } = useApi<unknown[]>('/api/waiting')
const { data: cron } = useApi<unknown[]>('/api/cron')
const { data: agents } = useApi<unknown[]>('/api/agents')
const { data: activity } = useApi<unknown[]>('/api/activity')
const { data: upcoming } = useApi<unknown[]>('/api/upcoming')
const { data: logs } = useApi<unknown[]>('/api/logs')
</script>

<template>
  <div class="content">
    <StatCards :stats="stats" />
    <div class="grid-2-1">
      <ProjectsPanel :projects="projects || []" />
      <WaitingPanel :groups="(waiting as any[]) || []" @refresh="refreshWaiting" />
    </div>
    <div class="grid-1-1">
      <IdeasPanel :ideas="ideas || []" />
      <SubAgentsPanel :agents="agents || []" />
    </div>
    <div class="grid-3">
      <CronPanel :jobs="cron || []" />
      <ActivityFeed :items="activity || []" />
      <UpcomingPanel :items="upcoming || []" :stats="stats" />
    </div>
    <EventLogPanel :items="logs || []" />
  </div>
</template>
