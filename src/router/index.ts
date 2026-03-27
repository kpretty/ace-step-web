import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/HomeView.vue'),
    },
    {
      path: '/describe',
      name: 'describe',
      component: () => import('@/views/DescribeView.vue'),
    },
    {
      path: '/generator',
      name: 'generator',
      component: () => import('@/views/GeneratorView.vue'),
    },
  ],
})

export default router
