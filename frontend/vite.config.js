import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

if (typeof global !== "undefined" && typeof global.CustomEvent === "undefined") {
  global.CustomEvent = function () {};
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
})
