<script setup>
const emit = defineEmits(['click'])

const handleClick = () => {
  emit('click')
}
</script>

<template>
  <button
    class="fixed right-6 bottom-20 w-14 h-14 rounded-full bg-point flex items-center justify-center shadow-lg hover:bg-yellow-500 transition-colors"
    @click="handleClick"
  >
    <svg
      xmlns="http://www.w3.org/2000/svg"
      class="h-7 w-7 text-dark-gray"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M12 4v16m8-8H4"
      />
    </svg>
  </button>
</template>

<style scoped>
.bg-point {
  background-color: #FFD600;
}
.text-dark-gray {
  color: #353535;
}
</style>
