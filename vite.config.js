import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // 👈 WAJIB ditambahkan agar aset tidak broken saat jadi .exe
})