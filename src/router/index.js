/* eslint-disable no-trailing-spaces */
import { createRouter, createWebHistory } from 'vue-router'
import KakaoCallback from '../views/auth/callback/KakaoCallback.vue'
import NaverCallback from '../views/auth/callback/NaverCallback.vue'
import GoogleCallback from '../views/auth/callback/GoogleCallback.vue'
import SocialCallback from '../views/auth/callback/SocialCallback.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/home/Home.vue')
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/auth/Register.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/auth/Login.vue')
  },
  {
    path: '/find-password',
    name: 'FindPassword',
    component: () => import('../views/FindPassword.vue')
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('../views/calendar/Calendar.vue')
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/user/Profile.vue')
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('../views/chat/Chat.vue')
  },
  {
    path: '/llm-chat',
    name: 'LlmChat',
    component: () => import('../views/chat/LlmChat.vue')
  },
  {
    path: '/chat-socket',
    name: 'ChatSocket',
    component: () => import('../views/chat/ChatSocketView.vue')
  },
  {
    path: '/feedback/:conversationId',
    name: 'Feedback',
    component: () => import('../views/chat/Feedback.vue')
  },
  {
    path: '/user-info-edit',
    name: 'UserInfoEdit',
    component: () => import('../views/user/UserInfoEdit.vue')
  },
  {
    path: '/pregnancy-info-register',
    name: 'PregnancyInfoRegister',
    component: () => import('../views/user/pregnancy/PregnancyInfoRegister.vue')
  },
  {
    path: '/pregnancy-info-edit',
    name: 'PregnancyInfoEdit',
    component: () => import('../views/user/pregnancy/PregnancyInfoEdit.vue')
  },
  {
    path: '/user-search',
    name: 'UserSearch',
    component: () => import('../views/user/UserSearch.vue')
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
    component: KakaoCallback
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
  },
  {
    path: '/auth/callback/:provider',
    name: 'SocialCallback',
    component: SocialCallback
  }
  
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 네비게이션 가드 설정
router.beforeEach((to, from, next) => {
  // 토큰 확인
  const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken')
  
  // 인증이 필요하지 않은 경로 목록
  const publicPages = [
    '/', // 홈 페이지는 인증 없이 접근 가능
    '/login',
    '/register',
    '/pregnancy-info-register',
    '/kakao/callback',
    '/naver/callback',
    '/google/callback',
    '/auth/callback/google',
    '/auth/callback/naver',
    '/auth/callback/kakao'
  ]
  
  // 현재 경로가 인증이 필요한지 확인
  const authRequired = !publicPages.includes(to.path)
  
  // 인증이 필요하고 토큰이 없는 경우 로그인 페이지로 리디렉션
  if (authRequired && !token) {
    console.log('인증이 필요한 페이지입니다. 로그인 페이지로 이동합니다.')
    next('/login')
  } else {
    next()
  }
})

export default router
