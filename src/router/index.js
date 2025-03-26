/* eslint-disable no-trailing-spaces */
import { createRouter, createWebHistory } from 'vue-router'
import KakaoCallback from '../views/auth/callback/KakaoCallback.vue'
import NaverCallback from '../views/auth/callback/NaverCallback.vue'
import GoogleCallback from '../views/auth/callback/GoogleCallback.vue'
import SocialCallback from '../views/auth/callback/SocialCallback.vue'
import ChatAgent from '../views/chat/Chat.vue'
import PasswordChange from '../views/user/PasswordChange.vue'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('../views/home/Home.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('../views/auth/Register.vue')
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('../views/auth/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/find-id',
    name: 'FindId',
    component: () => import('../views/FindId.vue')
  },
  {
    path: '/find-password',
    name: 'FindPassword',
    component: () => import('../views/FindPassword.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/calendar',
    name: 'Calendar',
    component: () => import('../views/calendar/Calendar.vue')
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('../views/user/Profile.vue'),
    meta: { requiresAuth: true }
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
  },
  {
    path: '/agent',
    name: 'Agent',
    component: ChatAgent
  },
  {
    path: '/mypage',
    redirect: '/profile'
  },
  {
    path: '/password-change',
    name: 'PasswordChange',
    component: PasswordChange
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('../views/ResetPassword.vue'),
    meta: { requiresAuth: false }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 네비게이션 가드 설정
router.beforeEach((to, from, next) => {
  // 소셜 로그인 콜백 관련 경로는 무조건 통과시킴
  if (to.path.includes('/callback') || to.path.includes('/kakao/') || 
      to.path.includes('/naver/') || to.path.includes('/google/')) {
    console.log('소셜 로그인 콜백 페이지 접근 - 인증 체크 건너뜀')
    next()
    return
  }

  // 토큰 확인 (다양한 저장소에서 확인)
  let token = localStorage.getItem('accessToken')
  if (!token) {
    token = sessionStorage.getItem('accessToken')
    if (token) {
      console.log('세션 스토리지에서 토큰 발견, 로컬 스토리지에 복사')
      // localStorage.setItem('accessToken', token)
    }
  }
  
  console.log('라우터 가드 - 현재 경로:', to.path)
  console.log('라우터 가드 - 토큰 존재:', !!token)
  
  // 로그인 후 리다이렉션 확인
  const redirectPath = sessionStorage.getItem('redirectAfterLogin')
  if (redirectPath && token) {
    console.log(`로그인 후 리다이렉션 경로 발견: ${redirectPath}`)
    sessionStorage.removeItem('redirectAfterLogin')
    if (to.path !== redirectPath) {
      next(redirectPath)
      return
    }
  }
  
  // 인증이 필요하지 않은 경로 목록
  const publicPages = [
    '/', // 홈 페이지는 인증 없이 접근 가능
    '/login',
    '/register',
    '/find-password',
    '/find-id',
    '/reset-password',
    '/pregnancy-info-register'
  ]
  
  // 현재 경로가 인증이 필요한지 확인
  const authRequired = !publicPages.includes(to.path)
  
  // 인증이 필요하고 토큰이 없는 경우 로그인 페이지로 리디렉션
  if (authRequired && !token) {
    console.log('인증이 필요한 페이지입니다. 로그인 페이지로 이동합니다.')
    // 로그인 후 원래 가려던 경로로 돌아갈 수 있도록 저장
    sessionStorage.setItem('redirectAfterLogin', to.fullPath)
    next('/login')
    return
  }

  // 이미 로그인된 상태에서 로그인 페이지로 가려고 하면 홈으로 리다이렉트
  if (token && to.path === '/login') {
    next('/')
    return
  }

  next()
})

export default router
