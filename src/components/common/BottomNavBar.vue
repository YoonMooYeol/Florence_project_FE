<script setup>
import { defineProps } from 'vue'
import { useRouter } from 'vue-router'

defineProps({
  activeTab: {
    type: String,
    default: 'calendar'
  }
})

const router = useRouter()

const navigateTo = (route) => {
  router.push({ name: route })
}
</script>

<template>
  <div class="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around shadow-md">
    <button
      class="p-2 flex flex-col items-center justify-center"
      @click="navigateTo('Home')"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        :class="['h-6 w-6', activeTab === 'home' ? 'text-point' : 'text-dark-gray']"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
      <span :class="['text-xs mt-1', activeTab === 'home' ? 'text-point font-bold' : 'text-dark-gray']">홈</span>
    </button>

    <button
      class="p-2 flex flex-col items-center justify-center"
      @click="navigateTo('Profile')"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        :class="['h-6 w-6', activeTab === 'profile' ? 'text-point' : 'text-dark-gray']"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle
          cx="12"
          cy="7"
          r="4"
        />
      </svg>
      <span :class="['text-xs mt-1', activeTab === 'profile' ? 'text-point font-bold' : 'text-dark-gray']">마이페이지</span>
    </button>

    <button
      class="p-2 flex flex-col items-center justify-center relative"
      @click="navigateTo('Calendar')"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        :class="['h-6 w-6', activeTab === 'calendar' ? 'text-point' : 'text-dark-gray']"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <rect
          x="3"
          y="4"
          width="18"
          height="18"
          rx="2"
          ry="2"
        />
        <line
          x1="16"
          y1="2"
          x2="16"
          y2="6"
        />
        <line
          x1="8"
          y1="2"
          x2="8"
          y2="6"
        />
        <line
          x1="3"
          y1="10"
          x2="21"
          y2="10"
        />
      </svg>
      <span :class="['text-xs mt-1', activeTab === 'calendar' ? 'text-point font-bold' : 'text-dark-gray']">캘린더</span>
    </button>

    <button
      class="p-2 flex flex-col items-center justify-center"
      @click="navigateTo('Chat')"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        :class="['h-6 w-6', activeTab === 'chat' ? 'text-point' : 'text-dark-gray']"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
      <span :class="['text-xs mt-1', activeTab === 'chat' ? 'text-point font-bold' : 'text-dark-gray']">채팅</span>
    </button>
  </div>
</template>

<style scoped>
.text-point {
  color: #FFD600;
}
.text-dark-gray {
  color: #353535;
}
</style>
