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
  gender: '',
  image: '' // 프로필 이미지 URL 추가
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
    userInfo.value.image = response.data.image || ''
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
      const minSize = Math.min(img.width, img.height);
      const sx = (img.width - minSize) / 2;
      const sy = (img.height - minSize) / 2;

      const canvas = document.createElement('canvas');
      canvas.width = minSize;
      canvas.height = minSize;
      const ctx = canvas.getContext('2d');
      ctx.beginPath();
      ctx.arc(minSize / 2, minSize / 2, minSize / 2, 0, Math.PI * 2, true);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, sx, sy, minSize, minSize, 0, 0, minSize, minSize);

      canvas.toBlob(async (blob) => {
        if (!blob) {
          alert("이미지 처리 실패");
          return;
        }

        const formData = new FormData();
        formData.append("image", blob, file.name);

        try {
          const response = await api.post('accounts/users/me/profile-image/', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
          });

          // ✅ [추가된 부분 시작] - 상대경로일 경우 절대경로로 바꿔서 저장
          if (response.data && response.data.image) {
            const imageUrl = response.data.image.startsWith('http')
              ? response.data.image
              : `${import.meta.env.VITE_API_BASE_URL}${response.data.image}`;
            userInfo.value.image = imageUrl;
          }
          // ✅ [추가된 부분 끝]

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


const showProfilePhotoModal = ref(false);
const openProfilePhotoModal = () => {
  // 일시적으로 모달 열기 기능 비활성화
  // showProfilePhotoModal.value = true;
};
const closeProfilePhotoModal = () => {
  showProfilePhotoModal.value = false;
};
const viewProfilePhoto = () => {
  if (userInfo.value.image) {
    const imageUrl = userInfo.value.image.startsWith('http')
      ? userInfo.value.image
      : `${import.meta.env.VITE_API_BASE_URL}${userInfo.value.image}`;
    window.open(imageUrl, '_blank');
  } else {
    alert('등록된 프로필 사진이 없습니다.');
  }
};

const registerOrUpdateProfilePhoto = () => {
  if (fileInput.value) {
    fileInput.value.click();
  }
  closeProfilePhotoModal();
};
const deleteProfilePhoto = () => {
  if (confirm('프로필 사진을 삭제하시겠습니까?')) {
    api.delete(`/accounts/users/me/profile-image/${userInfo.value.photoId}/`)
      .then(() => {
        userInfo.value.image = null; // 또는 ''
        alert('프로필 사진이 삭제되었습니다.');
      })
      .catch(() => {
        alert('프로필 사진 삭제 실패');
      });
  }
};


</script>

<template>
  <div class="min-h-screen bg-ivory">
    <!-- 헤더 -->
    <div class="bg-white p-4 shadow-md flex items-center justify-between">
      <button
        class="text-dark-gray"
        @click="goBack"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="h-6 w-6"
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
      <h1 class="text-xl font-bold text-center text-dark-gray flex-1">
        내 정보 관리
      </h1>
      <div class="w-6" /> <!-- 균형을 위한 빈 공간 -->
    </div>

    <!-- 로딩 표시 -->
    <div
      v-if="isLoading"
      class="p-4 text-center"
    >
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-point-yellow" />
      <p class="mt-2 text-dark-gray">
        정보를 불러오는 중...
      </p>
    </div>

    <!-- 일반 에러 메시지 표시 -->
    <div
      v-if="errors.form"
      class="p-4 mb-4 text-center text-red-700 bg-red-100"
    >
      {{ errors.form }}
    </div>

    <!-- 사용자 정보 폼 -->
    <div
      v-if="!isLoading"
      class="p-4"
    >
      <div class="bg-white rounded-lg shadow-md p-6 mb-4">
        <!-- 프로필 이미지 섹션 -->
<div class="flex flex-col items-center mb-6">
  <div class="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center mb-2 relative overflow-hidden">
    
    <!-- ✅ 프로필 이미지가 있을 경우 표시 + 클릭 시 모달 -->
    <img
      v-if="userInfo.image"
      :src="`${userInfo.image}?t=${Date.now()}`"
      alt="프로필 사진"
      class="absolute inset-0 w-full h-full object-cover rounded-full z-10 cursor-pointer"
      @click="openProfilePhotoModal"
    />

    <!-- ✅ 기본 아이콘일 때도 클릭 시 모달 -->
    <svg
      v-else
      @click="openProfilePhotoModal"
      xmlns="http://www.w3.org/2000/svg"
      class="h-12 w-12 text-gray-500 cursor-pointer"
      viewBox="0 0 20 20"
      fill="currentColor"
    >
      <path
        fill-rule="evenodd"
        d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
        clip-rule="evenodd"
      />
    </svg>

    <!-- 숨겨진 파일 입력 필드 -->
    <input type="file" ref="fileInput" style="display: none" @change="handleProfilePicChange" accept="image/*" />
  </div>

  <!-- 설명 텍스트 (선택사항) -->
  <p v-if="false" class="text-sm text-gray-500">
    프로필 사진을 클릭하여 수정하세요
  </p>
</div>

<!-- 프로필 이미지 수정 모달 -->
<transition name="fade">
  <div v-if="showProfilePhotoModal" class="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
    <div class="bg-white rounded-xl shadow-lg p-5 w-64 space-y-3">
      <button @click="viewProfilePhoto" class="w-full bg-gray-100 py-2 rounded-md hover:bg-gray-200">
        프로필 사진 조회
      </button>
      <button @click="registerOrUpdateProfilePhoto" class="w-full bg-gray-100 py-2 rounded-md hover:bg-gray-200">
        프로필 사진 수정
      </button>
      <button @click="deleteProfilePhoto" class="w-full bg-red-100 text-red-600 py-2 rounded-md hover:bg-red-200">
        프로필 사진 삭제
      </button>
      <button @click="closeProfilePhotoModal" class="text-sm text-gray-400 hover:text-gray-600 w-full py-1">
        닫기
      </button>
    </div>
  </div>
</transition>




        <!-- 사용자명 입력 -->
        <div class="mb-4">
          <label
            for="username"
            class="block mb-2 text-sm font-medium text-dark-gray"
          >아이디</label>
          <input
            id="username"
            v-model="userInfo.username"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            @input="clearFieldError('username')"
          >
          <p
            v-if="errors.username"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.username }}
          </p>
        </div>

        <!-- 이름 입력 -->
        <div class="mb-4">
          <label
            for="name"
            class="block mb-2 text-sm font-medium text-dark-gray"
          >닉네임</label>
          <input
            id="name"
            v-model="userInfo.name"
            type="text"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
            @input="clearFieldError('name')"
          >
          <p
            v-if="errors.name"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.name }}
          </p>
        </div>

        <!-- 이메일 입력 -->
        <div class="mb-4">
          <label
            for="email"
            class="block mb-2 text-sm font-medium text-dark-gray"
          >이메일</label>
          <input
            id="email"
            v-model="userInfo.email"
            type="email"
            class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow bg-gray-100"
            disabled
          >
          <p class="mt-1 text-xs text-gray-500">
            이메일은 변경할 수 없습니다
          </p>
          <p
            v-if="errors.email"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.email }}
          </p>
        </div>

        <!-- 전화번호 입력 -->
        <div class="mb-4">
          <label
            for="phone_number"
            class="block mb-2 text-sm font-medium text-dark-gray"
          >전화번호</label>
          <div class="relative">
            <input
              id="phone_number"
              v-model="userInfo.phone_number"
              type="tel"
              maxlength="13"
              placeholder="010-0000-0000"
              class="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-point-yellow"
              @input="handlePhoneInput"
            >
          </div>
          <p
            v-if="errors.phone_number"
            class="mt-1 text-sm text-red-600"
          >
            {{ errors.phone_number }}
          </p>
          <p class="mt-1 text-xs text-gray-500">
            휴대폰 번호는 '-'없이 숫자만 입력하셔도 됩니다
          </p>
        </div>
        
        <!-- 수정 버튼 -->
        <div class="flex justify-center mt-6">
          <button
            class="w-full px-4 py-3 text-dark-gray bg-base-yellow rounded-md hover:bg-point-yellow focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 font-bold"
            :disabled="isSubmitting"
            @click="saveUserInfo"
          >
            <span v-if="isSubmitting">처리 중...</span>
            <span v-else>수정하기</span>
          </button>
        </div>
      </div>
    </div>

    <!-- 프로필 사진 모달 팝업 -->
    <div v-if="showProfilePhotoModal" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div class="bg-white p-6 rounded-lg shadow-lg w-96">
        <h2 class="text-lg font-bold mb-4 text-center">프로필 편집</h2>
        <div class="flex flex-col space-y-2">
          <button @click="viewProfilePhoto" class="p-2 bg-blue-200 text-white rounded-[10px]">프로필 사진 보기</button>
          <button v-if="false" @click="registerOrUpdateProfilePhoto" class="p-2 bg-yellow-300 text-white rounded-[10px]">
            {{ userInfo.image ? '프로필 사진 수정' : '프로필 사진 등록' }}
          </button>
          <button v-if="false" @click="deleteProfilePhoto" class="p-2 bg-red-200 text-white rounded-[10px]">프로필 사진 삭제</button>
        </div>
        <button @click="closeProfilePhotoModal" class="mt-4 text-gray-500 hover:text-gray-700 block mx-auto rounded-[10px] font-bold">닫기</button>
      </div>
    </div>

    <!-- 하단 네비게이션 바 -->
    <BottomNavBar active-tab="profile" />
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
</style>
