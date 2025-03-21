<script setup>
import { ref } from 'vue'

const todos = ref([]);
const newTodo = ref('');

const addTodo = () => {
  const trimmedTodo = newTodo.value.trim();
  if (trimmedTodo !== '') {
    todos.value.push(trimmedTodo);
    newTodo.value = '';
  }
}
</script>

<template>
  <div class="p-4 border-t border-gray-300">
    <h2 class="text-lg sm:text-xl font-bold mb-4 text-dark-gray">
      Todo List
    </h2>
    <div class="space-y-3">
      <input
        v-model="newTodo"
        @keyup.enter="addTodo"
        type="text"
        placeholder="새 할 일 입력"
        class="w-full px-4 py-2 text-base border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-point-yellow focus:border-transparent"
      />
      <button 
        @click="addTodo" 
        class="w-full sm:w-auto px-6 py-2 bg-point-yellow text-dark-gray rounded-xl hover:bg-yellow-400 focus:outline-none focus:ring-2 focus:ring-point-yellow focus:ring-opacity-50 transition-colors duration-200 font-medium text-base"
      >
        추가
      </button>
    </div>
    <ul class="mt-6 space-y-2">
      <li 
        v-for="(todo, index) in todos" 
        :key="index" 
        class="p-3 bg-white rounded-lg shadow-sm border border-gray-200 text-dark-gray text-base break-words"
      >
        {{ todo }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
@media (max-width: 640px) {
  input[type="text"] {
    font-size: 16px; /* iOS에서 자동 확대 방지 */
  }
}
</style> 