import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/Home.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/Register.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/Login.vue')
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('../views/Calendar.vue')
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/Profile.vue')
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('../views/Chat.vue')
  },
  {
    path: '/user-info-edit',
    name: 'UserInfoEdit',
    component: () => import('../views/UserInfoEdit.vue')
  },
  {
    path: '/pregnancy-info-register',
    name: 'PregnancyInfoRegister',
    component: () => import('../views/PregnancyInfoRegister.vue')
  },
  {
    path: '/pregnancy-info-edit',
    name: 'PregnancyInfoEdit',
    component: () => import('../views/PregnancyInfoEdit.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
