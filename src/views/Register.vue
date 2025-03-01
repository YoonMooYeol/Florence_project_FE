<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../store/user'
import axios from 'axios'

const router = useRouter()
const userStore = useUserStore()

const formData = reactive({
  username: '',
  name: '',
  email: '',
  phone_number: '',
  phone_part1: '',
  phone_part2: '',
  phone_part3: '',
  password: '',
  password_confirm: '',
  gender: '',
  is_pregnant: false,
  address: ''
})

const errors = reactive({
  username: '',
  name: '',
  email: '',
  phone_number: '',
  password: '',
  password_confirm: '',
  gender: '',
  address: '',
  form: ''
})

const isSubmitting = ref(false)
const showSuccessMessage = ref(false)
const registeredUser = ref(null)

// 전화번호 부분이 변경될 때 전체 전화번호 업데이트
const updatePhoneNumber = () => {
  // 숫자만 남기기
  formData.phone_part1 = formData.phone_part1.replace(/\D/g, '')
  formData.phone_part2 = formData.phone_part2.replace(/\D/g, '')
  formData.phone_part3 = formData.phone_part3.replace(/\D/g, '')
  
  if (formData.phone_part1 && formData.phone_part2 && formData.phone_part3) {
    formData.phone_number = `${formData.phone_part1}-${formData.phone_part2}-${formData.phone_part3}`
  } else {
    formData.phone_number = ''
  }
}

// 기존 전화번호가 있을 경우 각 부분으로 나누기
const initPhoneParts = () => {
  if (formData.phone_number && formData.phone_number.includes('-')) {
    const parts = formData.phone_number.split('-')
    if (parts.length === 3) {
      formData.phone_part1 = parts[0]
      formData.phone_part2 = parts[1]
      formData.phone_part3 = parts[2]
    }
  }
}

// 컴포넌트 마운트 시 초기화
initPhoneParts()

const validateForm = () => {
  let isValid = true
  
  // 사용자명 검증
  if (!formData.username.trim()) {
    errors.username = '사용자명을 입력해주세요'
    isValid = false
  } else {
    errors.username = ''
  }
  
  // 이름 검증
  if (!formData.name.trim()) {
    errors.name = '이름을 입력해주세요'
    isValid = false
  } else {
    errors.name = ''
  }
  
  // 이메일 검증
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!formData.email.trim()) {
    errors.email = '이메일을 입력해주세요'
    isValid = false
  } else if (!emailRegex.test(formData.email)) {
    errors.email = '유효한 이메일 주소를 입력해주세요'
    isValid = false
  } else {
    errors.email = ''
  }
  
  // 전화번호 검증
  const phoneRegex = /^\d{3}-\d{3,4}-\d{4}$/
  if (!formData.phone_number.trim()) {
    errors.phone_number = '전화번호를 입력해주세요'
    isValid = false
  } else if (!phoneRegex.test(formData.phone_number)) {
    errors.phone_number = '올바른 전화번호 형식(000-0000-0000)으로 입력해주세요'
    isValid = false
  } else {
    errors.phone_number = ''
  }
  
  // 비밀번호 검증
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/
  if (!formData.password) {
    errors.password = '비밀번호를 입력해주세요'
    isValid = false
  } else if (!passwordRegex.test(formData.password)) {
    errors.password = '비밀번호는 8자 이상, 영문, 숫자, 특수문자를 포함해야 합니다'
    isValid = false
  } else {
    errors.password = ''
  }
  
  // 비밀번호 확인 검증
  if (!formData.password_confirm) {
    errors.password_confirm = '비밀번호 확인을 입력해주세요'
    isValid = false
  } else if (formData.password !== formData.password_confirm) {
    errors.password_confirm = '비밀번호가 일치하지 않습니다'
    isValid = false
  } else {
    errors.password_confirm = ''
  }
  
  // 성별 검증
  if (!formData.gender) {
    errors.gender = '성별을 선택해주세요'
    isValid = false
  } else {
    errors.gender = ''
  }
  
  // 주소 검증
  if (!formData.address.trim()) {
    errors.address = '주소를 입력해주세요'
    isValid = false
  } else {
    errors.address = ''
  }
  
  return isValid
}

// 회원가입 API 호출 함수
const registerApi = async (userData) => {
  try {
    const response = await axios.post('http://127.0.0.1:8000/v1/accounts/register/', userData)
    return response.data
  } catch (error) {
    console.error('API 호출 오류:', error)
    throw error
  }
}

// 각 필드 입력 시 해당 필드의 오류 메시지 초기화
const clearFieldError = (field) => {
  if (errors[field]) {
    errors[field] = ''
  }
}

const handleSubmit = async () => {
  errors.form = ''
  
  if (!validateForm()) {
    return
  }
  
  isSubmitting.value = true
  
  try {
    // 비밀번호 확인 필드도 API에 포함하여 전송
    // const { password_confirm, ...userData } = formData
    const userData = { ...formData }
    
    // phone_part 필드들은 API에 보내지 않음
    const { phone_part1, phone_part2, phone_part3, ...dataToSend } = userData
    
    // API 호출
    const response = await registerApi(dataToSend)
    
    // 응답 데이터 저장
    registeredUser.value = response
    
    // 성공 메시지 표시
    showSuccessMessage.value = true
    
    console.log('회원가입 성공:', response)
    
    // 자동 리다이렉트 제거
    // setTimeout(() => {
    //   router.push('/login')
    // }, 3000)
  } catch (error) {
    console.error('회원가입 오류:', error)
    
    // 서버에서 오는 에러 메시지 처리
    if (error.response && error.response.data) {
      if (typeof error.response.data === 'string') {
        errors.form = error.response.data
      } else if (error.response.data.detail) {
        errors.form = error.response.data.detail
      } else {
        // 필드별 에러 메시지 처리
        const fieldErrors = error.response.data
        let hasFieldErrors = false
        
        Object.keys(fieldErrors).forEach(field => {
          if (errors[field] !== undefined) {
            errors[field] = Array.isArray(fieldErrors[field]) 
              ? fieldErrors[field][0] 
              : fieldErrors[field]
            hasFieldErrors = true
          }
        })
        
        if (hasFieldErrors) {
          errors.form = '입력 정보를 확인해주세요.'
        } else {
          errors.form = '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.'
        }
      }
    } else {
      errors.form = '회원가입 중 오류가 발생했습니다. 다시 시도해주세요.'
    }
  } finally {
    isSubmitting.value = false
  }
}

const goToLogin = () => {
  router.push('/login')
}
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-screen p-4 bg-ivory">
    <div class="w-full max-w-md">

      
      <!-- 성공 메시지 모달 -->
      <div v-if="showSuccessMessage" class="fixed inset-0 flex items-center justify-center z-50">
        <!-- 배경 오버레이 -->
        <div class="absolute inset-0 bg-black bg-opacity-50"></div>
        
        <!-- 모달 컨텐츠 -->
        <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 z-10 relative">
          <div class="flex justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 class="text-2xl font-bold text-center text-gray-800 mb-2">회원가입이 완료되었습니다!</h2>
          <p class="text-center text-gray-600 mb-6">아래 버튼을 클릭하여 로그인 페이지로 이동하세요.</p>
          
          <div v-if="registeredUser" class="bg-gray-50 p-4 rounded-md mb-6">
            <p class="mb-2"><strong>이름:</strong> {{ registeredUser.name }}</p>
            <p class="mb-2"><strong>이메일:</strong> {{ registeredUser.email }}</p>
            <p><strong>전화번호:</strong> {{ registeredUser.phone_number }}</p>
          </div>
          
          <div class="text-center">
            <button 
              @click="goToLogin" 
              class="px-6 py-2 bg-point-yellow text-dark-gray font-medium rounded-md hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50 transition-colors"
            >
              로그인 페이지로 이동
            </button>
          </div>
        </div>
      </div>
      
      <!-- 폼 에러 메시지 -->
      <div v-if="errors.form" class="p-4 mb-6 text-center text-red-700 bg-red-100 rounded-md">
        {{ errors.form }}
      </div>
      
      <!-- 회원가입 폼 -->
      <form @submit.prevent="handleSubmit" class="p-6 bg-white rounded-lg shadow-md">
        <!-- 사용자명 -->
        <div class="mb-4">
          <label for="username" class="block mb-2 text-sm font-medium text-dark-gray">아이디</label>
          <input
            id="username"
            v-model="formData.username"
            @input="clearFieldError('username')"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="사용자명을 입력하세요"
          />
          <p v-if="errors.username" class="mt-1 text-sm text-red-600">{{ errors.username }}</p>
        </div>
        
        <!-- 이름 -->
        <div class="mb-4">
          <label for="name" class="block mb-2 text-sm font-medium text-dark-gray">이름</label>
          <input
            id="name"
            v-model="formData.name"
            @input="clearFieldError('name')"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="이름을 입력하세요"
          />
          <p v-if="errors.name" class="mt-1 text-sm text-red-600">{{ errors.name }}</p>
        </div>
        
        <!-- 이메일 -->
        <div class="mb-4">
          <label for="email" class="block mb-2 text-sm font-medium text-dark-gray">이메일</label>
          <input
            id="email"
            v-model="formData.email"
            @input="clearFieldError('email')"
            type="email"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="이메일을 입력하세요"
          />
          <p v-if="errors.email" class="mt-1 text-sm text-red-600">{{ errors.email }}</p>
        </div>
        
        <!-- 전화번호 -->
        <div class="mb-4">
          <label class="block mb-2 text-sm font-medium text-dark-gray">전화번호</label>
          <div class="flex space-x-2">
            <input
              id="phone_part1"
              v-model="formData.phone_part1"
              @input="updatePhoneNumber(); clearFieldError('phone_number')"
              type="text"
              maxlength="3"
              class="w-1/4 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
              placeholder="010"
            />
            <span class="flex items-center">-</span>
            <input
              id="phone_part2"
              v-model="formData.phone_part2"
              @input="updatePhoneNumber(); clearFieldError('phone_number')"
              type="text"
              maxlength="4"
              class="w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
              placeholder="0000"
            />
            <span class="flex items-center">-</span>
            <input
              id="phone_part3"
              v-model="formData.phone_part3"
              @input="updatePhoneNumber(); clearFieldError('phone_number')"
              type="text"
              maxlength="4"
              class="w-1/3 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
              placeholder="0000"
            />
          </div>
          <p v-if="errors.phone_number" class="mt-1 text-sm text-red-600">{{ errors.phone_number }}</p>
        </div>
        
        <!-- 비밀번호 -->
        <div class="mb-4">
          <label for="password" class="block mb-2 text-sm font-medium text-dark-gray">비밀번호</label>
          <input
            id="password"
            v-model="formData.password"
            @input="clearFieldError('password'); formData.password_confirm && clearFieldError('password_confirm')"
            type="password"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="비밀번호를 입력하세요"
          />
          <p v-if="errors.password" class="mt-1 text-sm text-red-600">{{ errors.password }}</p>
        </div>
        
        <!-- 비밀번호 확인 -->
        <div class="mb-4">
          <label for="password_confirm" class="block mb-2 text-sm font-medium text-dark-gray">비밀번호 확인</label>
          <input
            id="password_confirm"
            v-model="formData.password_confirm"
            @input="clearFieldError('password_confirm')"
            type="password"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="비밀번호를 다시 입력하세요"
          />
          <p v-if="errors.password_confirm" class="mt-1 text-sm text-red-600">{{ errors.password_confirm }}</p>
        </div>
        
        <!-- 성별 -->
        <div class="mb-4">
          <label class="block mb-2 text-sm font-medium text-dark-gray">성별</label>
          <div class="flex space-x-4">
            <label class="flex items-center">
              <input
                type="radio"
                v-model="formData.gender"
                @change="clearFieldError('gender')"
                value="male"
                class="w-4 h-4 text-point-yellow border-gray-300 focus:ring-point-yellow"
              />
              <span class="ml-2 text-dark-gray">남성</span>
            </label>
            <label class="flex items-center">
              <input
                type="radio"
                v-model="formData.gender"
                @change="clearFieldError('gender')"
                value="female"
                class="w-4 h-4 text-point-yellow border-gray-300 focus:ring-point-yellow"
              />
              <span class="ml-2 text-dark-gray">여성</span>
            </label>
          </div>
          <p v-if="errors.gender" class="mt-1 text-sm text-red-600">{{ errors.gender }}</p>
        </div>
        
        <!-- 임신 여부 (여성인 경우만 표시) -->
        <div v-if="formData.gender === 'female'" class="mb-4">
          <label class="flex items-center">
            <input
              type="checkbox"
              v-model="formData.is_pregnant"
              class="w-4 h-4 text-point-yellow border-gray-300 rounded focus:ring-point-yellow"
            />
            <span class="ml-2 text-dark-gray">임신 중</span>
          </label>
        </div>
        
        <!-- 주소 -->
        <div class="mb-6">
          <label for="address" class="block mb-2 text-sm font-medium text-dark-gray">주소</label>
          <input
            id="address"
            v-model="formData.address"
            @input="clearFieldError('address')"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            placeholder="주소를 입력하세요"
          />
          <p v-if="errors.address" class="mt-1 text-sm text-red-600">{{ errors.address }}</p>
        </div>
        
        <!-- 버튼 -->
        <div class="flex flex-col space-y-3">
          <button
            type="submit"
            class="w-full px-4 py-3 text-dark-gray bg-base-yellow rounded-md hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold"
            :disabled="isSubmitting"
          >
            <span v-if="isSubmitting">처리 중...</span>
            <span v-else>회원가입</span>
          </button>
          
          <div class="text-center mt-4">
            <a 
              href="#" 
              @click.prevent="goToLogin" 
              class="font-medium"
            >
              <span class="text-dark-gray">이미 계정이 있으신가요?</span> <span class="text-point-yellow hover:underline">로그인하기</span>
            </a>
          </div>
        </div>
      </form>
    </div>
  </div>
</template> 