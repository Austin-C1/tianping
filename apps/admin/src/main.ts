import Antd from 'ant-design-vue'
import { createPinia } from 'pinia'
import { createApp } from 'vue'
import 'ant-design-vue/dist/reset.css'
import App from './App.vue'
import { router } from './router'
import './styles/app.css'

createApp(App).use(createPinia()).use(router).use(Antd).mount('#app')
