import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'

// Run against the portfolio's Vite dev server; reuse the studio's actual screen renderer.
const origin = process.argv[2] ?? 'http://127.0.0.1:5391'
const output = new URL('../public/work/filo/story/', import.meta.url)
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  await page.goto(`${origin}/work/filo`)
  const frames = await page.evaluate(async () => {
    const { loadAssets, renderFrame, WIDTH, HEIGHT } = await import('/src/studio/filo/render.ts')
    const { STUDIO_FLOWS } = await import('/src/studio/filo/data.ts')
    const { DEFAULT_SETTINGS } = await import('/src/studio/filo/model.ts')
    const assets = await loadAssets()
    const canvas = document.createElement('canvas')
    canvas.width = WIDTH
    canvas.height = HEIGHT
    const crop = document.createElement('canvas')
    crop.width = 460
    crop.height = 916
    return ['nfc', 'file', 'listening', 'warning', 'approval'].map(id => {
      const scene = STUDIO_FLOWS.flatMap(flow => flow.scenes).find(scene => scene.id === id)
      if (!scene) throw new Error(`Missing studio scene: ${id}`)
      const project = { version: 1, flow: { id: 'story', title: 'Filo story', phase: 'Story', reference: 4, scenes: [scene] }, settings: DEFAULT_SETTINGS }
      renderFrame(canvas, project, assets, 0.9)
      const ctx = crop.getContext('2d')
      ctx.clearRect(0, 0, crop.width, crop.height)
      ctx.drawImage(canvas, 130, 62, 460, 916, 0, 0, 460, 916)
      return { id, image: crop.toDataURL('image/webp', 0.93).split(',')[1] }
    })
  })
  await mkdir(output, { recursive: true })
  for (const frame of frames) {
    const bytes = Buffer.from(frame.image, 'base64')
    await writeFile(new URL(`phone-${frame.id}.webp`, output), bytes)
    console.log(`${frame.id}: ${bytes.length} bytes`)
  }
} finally {
  await browser.close()
}
