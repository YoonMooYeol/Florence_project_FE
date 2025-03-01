import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import pinia from './store'
import './style.css'

// Tailwind CSS 적용
import 'tailwindcss/tailwind.css'

const app = createApp(App)

app.use(pinia)
app.use(router)
app.mount('#app')
