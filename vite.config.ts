import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { devSavePlugin } from './dev/devSavePlugin.ts'

export default defineConfig({
  plugins: [react(), devSavePlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
  },
})
