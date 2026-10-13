import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { devSavePlugin } from './dev/devSavePlugin.ts'
import { filoExportPlugin } from './dev/filoExportPlugin.ts'

export default defineConfig({
  plugins: [react(), devSavePlugin(), filoExportPlugin()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    rolldownOptions: {
      input: { main: 'index.html', filoStudio: 'studio/filo-prototypes.html' },
    },
  },
})
