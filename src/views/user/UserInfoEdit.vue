<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import api from '@/utils/axios'
import BottomNavBar from '@/components/common/BottomNavBar.vue'

const router = useRouter()

// 사용자 정보
const userInfo = ref({
  username: '',
  name: '',
  email: '',
  phone_number: '',
  gender: ''
})

// 오류 메시지 객체
const errors = reactive({
  username: '',
  name: '',
  email: '',
  phone_number: '',
  form: '' // 일반적인 오류 메시지
})

// 로딩 상태 관리
const isLoading = ref(false)
const isSubmitting = ref(false)

// 전화번호 자동 형식화 함수
const formatPhoneNumber = (value) => {
  if (!value) return ''
  
  // 숫자만 추출
  const numericValue = value.replace(/\D/g, '')
  
  // 길이에 따라 포맷팅
  if (numericValue.length <= 3) {
    return numericValue
  } else if (numericValue.length <= 7) {
    return `${numericValue.slice(0, 3)}-${numericValue.slice(3)}`
  } else {
    return `${numericValue.slice(0, 3)}-${numericValue.slice(3, 7)}-${numericValue.slice(7, 11)}`
  }
}

// 전화번호 입력 처리
const handlePhoneInput = (event) => {
  // 기존 에러 메시지 초기화
  clearFieldError('phone_number')
  
  // 현재 입력값 저장
  const input = event.target
  
  // 입력 값 형식화
  userInfo.value.phone_number = formatPhoneNumber(input.value)
  
  // 커서를 항상 맨 끝으로 이동
  setTimeout(() => {
    const len = userInfo.value.phone_number.length
    input.setSelectionRange(len, len)
  }, 0)
}

// 오류 필드 초기화
const clearErrors = () => {
  errors.username = ''
  errors.name = ''
  errors.email = ''
  errors.phone_number = ''
  errors.form = ''
}

// 각 필드 입력 시 해당 필드의 오류 메시지 초기화
const clearFieldError = (field) => {
  if (errors[field]) {
    errors[field] = ''
  }
}

// 사용자 정보 불러오기
const fetchUserInfo = async () => {
  isLoading.value = true
  clearErrors()

  try {
    // API를 통해 본인 정보 조회
    const response = await api.get('/accounts/users/me/')

    // 사용자 기본 정보 설정
    userInfo.value.username = response.data.username || ''
    userInfo.value.name = response.data.name || ''
    userInfo.value.email = response.data.email || ''
    userInfo.value.phone_number = response.data.phone_number || ''
    userInfo.value.gender = response.data.gender || ''
  } catch (error) {
    errors.form = error.response?.data?.detail || '사용자 정보를 불러오는 중 오류가 발생했습니다.'

    // API 호출 실패 시 로컬 스토리지에서 정보 가져오기
    userInfo.value.name = localStorage.getItem('userName') || sessionStorage.getItem('userName') || ''
    userInfo.value.email = localStorage.getItem('userEmail') || sessionStorage.getItem('userEmail') || ''
  } finally {
    isLoading.value = false
  }
}

// 유효성 검사 함수
const validateForm = () => {
  let isValid = true

  // 사용자명 검증
  if (!userInfo.value.username.trim()) {
    errors.username = '아이디를 입력해주세요'
    isValid = false
  } else {
    errors.username = ''
  }

  // 이름 검증
  if (!userInfo.value.name.trim()) {
    errors.name = '닉네임을 입력해주세요'
    isValid = false
  } else {
    errors.name = ''
  }

  return isValid
}

// 수정된 정보를 저장하는 함수
const saveUserInfo = async () => {
  clearErrors()

  // 폼 유효성 검사
  if (!validateForm()) {
    return
  }

  isSubmitting.value = true

  try {
    // API 요청 데이터 준비
    const requestData = {
      username: userInfo.value.username,
      name: userInfo.value.name,
      email: userInfo.value.email,
      phone_number: userInfo.value.phone_number || null
    }

    // 사용자 정보 업데이트 API 호출
    const response = await api.put('/accounts/users/me/', requestData)

    // 로컬 스토리지 및 세션 스토리지 업데이트
    localStorage.setItem('userName', userInfo.value.name)
    sessionStorage.setItem('userName', userInfo.value.name)
    localStorage.setItem('userEmail', userInfo.value.email)
    sessionStorage.setItem('userEmail', userInfo.value.email)

    // 저장 성공 메시지
    let errorMessage = response.data.message || "사용자 정보 저장에 성공했습니다."
    if (errorMessage === "이 필드는 null일 수 없습니다.") {
      errorMessage = "전화번호를 입력해주세요"
    }
    alert(errorMessage)

    // 프로필 페이지로 이동
    router.push('/profile')
  } catch (error) {
    // 서버에서 오는 에러 메시지 처리
    if (error.response && error.response.data) {
      if (typeof error.response.data === 'string') {
        errors.form = error.response.data
      } else if (error.response.data.detail) {
        errors.form = error.response.data.detail
      } else {
        // 필드별 에러 메시지 처리
        const fieldErrors = error.response.data

        Object.keys(fieldErrors).forEach(field => {
          if (errors[field] !== undefined) {
            errors[field] = Array.isArray(fieldErrors[field])
              ? fieldErrors[field][0]
              : fieldErrors[field]
          } else {
            // 알 수 없는 필드의 경우 일반 오류로 추가
            errors.form = `${field}: ${fieldErrors[field]}`
          }
        })

        if (Object.keys(fieldErrors).length === 0) {
          errors.form = '사용자 정보 저장 중 오류가 발생했습니다.'
        }
      }
    } else {
      errors.form = error.message || '사용자 정보 저장 중 오류가 발생했습니다.'
    }

    // 전화번호 에러 메시지 매핑: 오류 메시지에 'null'이라는 단어가 포함된 경우로 처리
    if (errors.phone_number && errors.phone_number.includes("null")) {
      errors.phone_number = "전화번호를 입력해주세요"
    }

    // 최종 에러 메시지: 필드별 에러 우선, 없으면 폼 에러
    let errorMessage = errors.phone_number || errors.form || "사용자 정보 저장에 실패했습니다."
    alert(errorMessage)
  } finally {
    isSubmitting.value = false
  }
}

// 뒤로 가기
const goBack = () => {
  router.go(-1)
}

// 컴포넌트 마운트 시 사용자 정보 불러오기
onMounted(fetchUserInfo)

const fileInput = ref(null);
const triggerFileInput = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
};

const handleProfilePicChange = async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  
  const reader = new FileReader();
  reader.readAsDataURL(file);
  reader.onload = () => {
    const imageDataUrl = reader.result;
    const img = new Image();
    img.src = imageDataUrl;
    img.onload = () => {
      // 이미지의 가장 작은 크기를 기준으로 중앙 정사각형을 계산
      const minSize = Math.min(img.width, img.height);
      const sx = (img.width - minSize) / 2;
      const sy = (img.height - minSize) / 2;
      
      // 캔버스를 생성하여 원형 클리핑 적용
      const canvas = document.createElement('canvas');
      canvas.width = minSize;
      canvas.height = minSize;
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.arc(minSize / 2, minSize / 2, minSize / 2, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      
      // 중앙 정사각형 영역을 캔버스에 그리기
      ctx.drawImage(img, sx, sy, minSize, minSize, 0, 0, minSize, minSize);
      
      // 캔버스의 내용을 Blob으로 변환하여 업로드
      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert("이미지 처리 실패");
          return;
        }
        const formData = new FormData();
        formData.append("profile_image", blob, file.name);
        try {
          const response = await api.post('accounts/users/me/profile-image/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });
          alert("프로필 사진이 업데이트되었습니다.");
        } catch (error) {
          alert("프로필 사진 업데이트 실패");
        }
      }, 'image/png');
    };
    img.onerror = () => {
      alert("이미지 로드 실패");
    };
  };
  reader.onerror = () => {
    alert("파일 읽기 실패");
  };
};

const showProfilePhotoModal = ref(false)
const openProfilePhotoModal = () => {
  showProfilePhotoModal.value = true
}
const closeProfilePhotoModal = () => {
  showProfilePhotoModal.value = false
}
const viewProfilePhoto = () => {
  if (userInfo.value.profile_image) {
    window.open(userInfo.value.profile_image, '_blank')
  } else {
    alert('등록된 프로필 사진이 없습니다.')
  }
}
const registerOrUpdateProfilePhoto = () => {
  if (fileInput.value) {
    fileInput.value.click()
  }
  closeProfilePhotoModal()
}
const deleteProfilePhoto = () => {
  if (confirm('프로필 사진을 삭제하시겠습니까?')) {
    api.delete('/accounts/users/me/profile-image/')
      .then(response => {
        alert('프로필 사진이 삭제되었습니다.')
        userInfo.value.profile_image = null
      })
      .catch(error => {
        alert('프로필 사진 삭제에 실패했습니다.')
      })
  }
  closeProfilePhotoModal()
}

</script>

<template>
  <div class="min-h-screen bg-ivory">
    <!-- 헤더 -->
    <div class="bg-white p-3 sm:p-4 shadow-md flex items-center justify-between">
      <button
        class="text-dark-gray p-2 -m-2"
        @click="goBack"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-5 w-5 sm:h-6 sm:w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M15 19l-7-7 7-7"
          />
        </svg>
      </button>
      <h1 class="text-lg sm:text-xl font-bold text-center text-dark-gray flex-1">
        사용자 정보 수정
      </h1>
      <div class="w-5 sm:w-6"></div>
    </div>

    <!-- 로딩 표시 -->
    <div
      v-if="isLoading"
      class="p-3 sm:p-4 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-t-2 border-b-2 border-point-yellow" />
      <p class="mt-2 text-sm sm:text-base text-dark-gray">
        정보를 불러오는 중...
      </p>
    </div>

    <!-- 에러 메시지 표시 -->
    <div
      v-if="errors.form"
      class="p-3 sm:p-4 mb-3 sm:mb-4 text-center text-sm sm:text-base text-red-700 bg-red-100"
    >
      {{ errors.form }}
    </div>

    <!-- 사용자 정보 폼 -->
    <div
      v-if="!isLoading"
      class="p-3 sm:p-4"
    >
      <div class="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-3 sm:mb-4">
        <!-- 프로필 이미지 -->
        <div class="flex flex-col items-center mb-4 sm:mb-6">
          <div class="relative">
            <div class="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-base-yellow flex items-center justify-center overflow-hidden">
              <img
                v-if="userInfo.profile_image"
                :src="userInfo.profile_image"
                alt="프로필 이미지"
                class="w-full h-full object-cover"
              >
              <svg-icon
                v-else
                type="mdi"
                :path="mdiAccount"
                :size="40"
                class="text-dark-gray sm:text-[52px]"
              ></svg-icon>
            </div>
            <button
              @click="triggerFileInput"
              class="absolute bottom-0 right-0 bg-point-yellow p-1.5 sm:p-2 rounded-full shadow-md hover:bg-yellow-400"
            >
              <svg-icon
                type="mdi"
                :path="mdiCamera"
                :size="16"
                class="text-dark-gray sm:text-[20px]"
              ></svg-icon>
            </button>
            <input
              ref="fileInput"
              type="file"
              accept="image/*"
              class="hidden"
              @change="handleProfilePicChange"
            >
          </div>
          <p class="mt-2 text-xs sm:text-sm text-gray-500">
            프로필 이미지를 변경하려면 클릭하세요
          </p>
        </div>

        <!-- 사용자 정보 입력 폼 -->
        <div class="space-y-3 sm:space-y-4">
          <!-- 아이디 -->
          <div>
            <label
              for="username"
              class="block mb-1.5 sm:mb-2 text-sm font-medium text-dark-gray"
            >아이디</label>
            <input
              id="username"
              v-model="userInfo.username"
              type="text"
              class="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
              :class="{ 'border-red-500': errors.username }"
            >
            <p
              v-if="errors.username"
              class="mt-1 text-xs text-red-500"
            >
              {{ errors.username }}
            </p>
          </div>

          <!-- 닉네임 -->
          <div>
            <label
              for="name"
              class="block mb-1.5 sm:mb-2 text-sm font-medium text-dark-gray"
            >닉네임</label>
            <input
              id="name"
              v-model="userInfo.name"
              type="text"
              class="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
              :class="{ 'border-red-500': errors.name }"
            >
            <p
              v-if="errors.name"
              class="mt-1 text-xs text-red-500"
            >
              {{ errors.name }}
            </p>
          </div>

          <!-- 이메일 -->
          <div>
            <label
              for="email"
              class="block mb-1.5 sm:mb-2 text-sm font-medium text-dark-gray"
            >이메일</label>
            <input
              id="email"
              v-model="userInfo.email"
              type="email"
              class="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
              :class="{ 'border-red-500': errors.email }"
            >
            <p
              v-if="errors.email"
              class="mt-1 text-xs text-red-500"
            >
              {{ errors.email }}
            </p>
          </div>

          <!-- 전화번호 -->
          <div>
            <label
              for="phone_number"
              class="block mb-1.5 sm:mb-2 text-sm font-medium text-dark-gray"
            >전화번호</label>
            <input
              id="phone_number"
              v-model="userInfo.phone_number"
              type="tel"
              class="w-full px-3 py-2.5 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
              :class="{ 'border-red-500': errors.phone_number }"
              @input="handlePhoneInput"
              placeholder="010-0000-0000"
            >
            <p
              v-if="errors.phone_number"
              class="mt-1 text-xs text-red-500"
            >
              {{ errors.phone_number }}
            </p>
          </div>
        </div>
      </div>

      <!-- 저장 버튼 -->
      <button
        class="w-full px-4 py-2.5 sm:py-3 text-sm sm:text-base text-dark-gray bg-base-yellow rounded-md hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 disabled:bg-gray-300 disabled:cursor-not-allowed font-bold"
        :disabled="isSubmitting"
        @click="saveUserInfo"
      >
        <span v-if="isSubmitting">처리 중...</span>
        <span v-else>저장하기</span>
      </button>
    </div>

    <!-- 하단 네비게이션 바 -->
    <BottomNavBar />
  </div>
</template>

<style scoped>
.bg-ivory {
  background-color: #FFFAE0;
}
.bg-base-yellow {
  background-color: #FFED90;
}
.bg-point-yellow {
  background-color: #FFD600;
}
.text-dark-gray {
  color: #353535;
}

/* iOS에서 자동 확대 방지 */
@media screen and (-webkit-min-device-pixel-ratio: 0) {
  input {
    font-size: 16px;
  }
}
</style>
