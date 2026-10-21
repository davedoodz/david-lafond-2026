import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { devSavePlugin } from './dev/devSavePlugin.ts'
import { filoExportPlugin } from './dev/filoExportPlugin.ts'
import { readFileSync, rmSync } from 'node:fs'

/** Studio pages served in dev only: removed from dist after the build copies public/. */
const DEV_ONLY = ['dist/work/filo/studio/thumbnail-layers.html']
const devOnlyPages = () => ({ name: 'dev-only-pages', apply: 'build' as const, closeBundle: () => DEV_ONLY.forEach((p) => rmSync(p, { force: true })) })

/** The Work intro's first sticker faces start downloading with the HTML, not after the app renders
 * its pills (WorkIntroStickers holds the intro until they decode). Read at build time so a
 * re-export of workStickers.live.json updates the list. */
const STICKERS = 'src/features/workStickers/workStickers.live.json'
const stickerPreload = () => ({
  name: 'sticker-preload',
  transformIndexHtml: {
    order: 'pre' as const,
    handler: (_html: string, ctx: { filename: string }) => {
      if (!ctx.filename.endsWith('/index.html') || ctx.filename.includes('/studio/')) return
      const { stickers } = JSON.parse(readFileSync(STICKERS, 'utf8')) as { stickers: Record<string, { faces: { image?: string }[] }> }
      const images = [...new Set(Object.values(stickers).map((s) => s.faces[0]?.image).filter((src): src is string => !!src))]
      return images.map((href) => ({ tag: 'link', attrs: { rel: 'preload', as: 'image', href, fetchpriority: 'high' }, injectTo: 'head' as const }))
    },
  },
})

export default defineConfig({
  plugins: [react(), devSavePlugin(), filoExportPlugin(), devOnlyPages(), stickerPreload()],
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    rolldownOptions: {
      input: { main: 'index.html', filoStudio: 'studio/filo-prototypes.html' },
    },
  },
})
