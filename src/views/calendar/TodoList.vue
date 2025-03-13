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
    <h2 class="text-xl font-bold mb-2">Todo List</h2>
    <div class="mb-4">
      <input
        v-model="newTodo"
        @keyup.enter="addTodo"
        type="text"
        placeholder="새 할 일 입력"
        class="border p-2 w-full"
      />
      <button @click="addTodo" class="mt-2 bg-blue-500 text-white px-4 py-2 rounded">
        추가
      </button>
    </div>
    <ul>
      <li v-for="(todo, index) in todos" :key="index" class="mb-2">
        {{ todo }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* 추가적인 CSS 필요 시 여기에 작성 */
</style> 