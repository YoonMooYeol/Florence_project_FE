import { createRouter, createWebHistory } from 'vue-router'
import NaverCallback from '../views/NaverCallback.vue'
import GoogleCallback from '../views/GoogleCallback.vue'

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
    path: '/llm-chat',
    name: 'LlmChat',
    component: () => import('../views/LlmChat.vue')
  },
  {
    path: '/chat-socket',
    name: 'ChatSocket',
    component: () => import('../views/ChatSocketView.vue')
  },
  {
    path: '/feedback/:conversationId',
    name: 'Feedback',
    component: () => import('../views/Feedback.vue')
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
  },
  {
    path: '/user-search',
    name: 'UserSearch',
    component: () => import('../views/UserSearch.vue')
  },
  // {
  //   path: '/daily-diary',
  //   name: 'DailyDiary',
  //   component: () => import('../views/DailyDiary.vue'),
  //   meta: { requiresAuth: true }
  // },
  // {
  //   path: '/baby-diary',
  //   name: 'BabyDiary',
  //   component: () => import('../views/BabyDiary.vue'),
  //   meta: { requiresAuth: true }
  // },
  {
    path: '/kakao/callback',
    name: 'KakaoCallback',
    component: () => import('../views/KakaoCallback.vue')
  },
  {
    path: '/naver/callback',
    name: 'naver-callback',
    component: NaverCallback
  },
  {
    path: '/google/callback',
    name: 'google-callback',
    component: GoogleCallback
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 네비게이션 가드 설정
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
  
  if (to.meta.requiresAuth && !token) {
    next('/login')
  } else {
    next()
  }
})

export default router
