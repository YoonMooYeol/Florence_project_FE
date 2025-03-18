<script setup>
// 라우터 뷰를 사용하기 위한 설정

// 앱이 마운트될 때 임신 정보 초기화가 더 이상 필요하지 않음
// 캘린더 페이지에서만 임신 정보를 초기화할 예정
</script>

<template>
  <div class="min-h-screen bg-ivory text-dark-gray">
    <router-view />
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: 'Noto Sans KR', 'Roboto', sans-serif;
  font-weight: 400;
}

h1, h2, h3, h4, h5, h6 {
  font-weight: 700;
}
</style>
