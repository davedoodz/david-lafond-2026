import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { devSavePlugin } from './dev/devSavePlugin.ts'
import { filoExportPlugin } from './dev/filoExportPlugin.ts'
import { rmSync } from 'node:fs'

/** Studio pages served in dev only: removed from dist after the build copies public/. */
const DEV_ONLY = ['dist/work/filo/studio/thumbnail-layers.html']
const devOnlyPages = () => ({ name: 'dev-only-pages', apply: 'build' as const, closeBundle: () => DEV_ONLY.forEach((p) => rmSync(p, { force: true })) })

export default defineConfig({
  plugins: [react(), devSavePlugin(), filoExportPlugin(), devOnlyPages()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    rolldownOptions: {
      input: { main: 'index.html', filoStudio: 'studio/filo-prototypes.html' },
    },
  },
})
