import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 仓库名为 category，部署到 GitHub Pages 时路径为 /category/
export default defineConfig({
  base: '/category/',
  plugins: [vue()],
})
