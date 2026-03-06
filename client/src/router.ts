import { createRouter, createWebHistory } from 'vue-router'
import DashboardView from './views/DashboardView.vue'
import ProjectDetailView from './views/ProjectDetailView.vue'
import IdeaDetailView from './views/IdeaDetailView.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: DashboardView },
    { path: '/project/:id', component: ProjectDetailView, props: true },
    { path: '/idea/:id', component: IdeaDetailView },
  ],
})

export default router
