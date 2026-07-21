import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// base './' so the static build works from any path (GitHub Pages included);
// HashRouter handles client-side routes without server rewrites.
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
})
