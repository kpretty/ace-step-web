import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'generator',
      component: () => import('@/views/GeneratorView.vue'),
    },
    {
      path: '/describe',
      name: 'describe',
      component: () => import('@/views/DescribeView.vue'),
    },
  ],
})

export default router
