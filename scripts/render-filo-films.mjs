import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { STUDIO_FLOWS } from '../src/studio/filo/data.ts'
import { DEFAULT_SETTINGS, timeline } from '../src/studio/filo/model.ts'
import { FILM_CROPS, FILO_FILMS } from '../src/features/filoCase/filoFilmPlan.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const output = path.join(root, 'public/work/filo/films')
const origin = process.env.FILO_STUDIO_ORIGIN ?? 'http://127.0.0.1:4177'
const selected = process.argv.slice(2)
const films = Object.values(FILO_FILMS).filter(f => !selected.length || selected.includes(f.id))
if (!films.length || selected.some(id => !FILO_FILMS[id])) throw new Error('Pass known flow IDs, or no arguments to render all fifteen.')
await mkdir(output, { recursive: true })
const scratch = await mkdtemp(path.join(tmpdir(), 'filo-case-films-'))
const browser = await chromium.launch({ headless: true })
let encoder
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 1100 }, deviceScaleFactor: 1 })
  await page.goto(`${origin}/studio/filo-prototypes.html?render=1`, { waitUntil: 'networkidle' })
  await page.waitForFunction(() => window.filoRender?.ready)
  for (const film of films) {
    const flow = STUDIO_FLOWS.find(f => f.id === film.id)
    const project = { version: 1, flow, settings: structuredClone(DEFAULT_SETTINGS) }
    // Canonical studio content and motion; presentation cropping happens only after rendering.
    const { clips, duration } = timeline(project)
    await page.evaluate(p => window.filoRender.setProject(p, 1440), project)
    const crop = FILM_CROPS[film.crop]
    const filter = `crop=${crop.width * 2}:${crop.height * 2}:${crop.x * 2}:${crop.y * 2}`
    const poster = await page.evaluate(t => window.filoRender.frame(t), clips[film.posterScene].start + 1.5)
    const posterPath = path.join(scratch, `${film.id}.png`)
    await writeFile(posterPath, Buffer.from(poster, 'base64'))
    const posterEncoder = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', posterPath, '-vf', filter, '-frames:v', '1', '-quality', '90', path.join(output, `${film.id}.webp`)], { stdio: 'inherit' })
    await new Promise((resolve, reject) => { posterEncoder.once('error', reject); posterEncoder.once('close', code => code === 0 ? resolve() : reject(new Error(`Poster encoder exited ${code}`))) })
    const frames = Math.ceil(duration * 30)
    encoder = spawn('ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-y', '-framerate', '30', '-f', 'image2pipe', '-vcodec', 'png', '-i', 'pipe:0',
      '-an', '-vf', filter, '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', '-b:v', '0', '-crf', '30', '-deadline', 'good', '-cpu-used', '5', '-row-mt', '1', path.join(output, `${film.id}.webm`),
      '-an', '-vf', filter, '-c:v', 'hevc_videotoolbox', '-pix_fmt', 'bgra', '-alpha_quality', '0.8', '-tag:v', 'hvc1', '-b:v', '2500k', '-movflags', '+faststart', path.join(output, `${film.id}.mov`),
    ], { stdio: ['pipe', 'ignore', 'pipe'] })
    let errors = ''
    encoder.stderr.on('data', chunk => { errors = (errors + chunk).slice(-6000) })
    encoder.stdin.on('error', () => {})
    const encoded = new Promise((resolve, reject) => {
      encoder.once('error', reject)
      encoder.once('close', code => code === 0 ? resolve() : reject(new Error(`Video encoder exited ${code}: ${errors}`)))
    })
    void encoded.catch(() => {})
    console.log(`${film.id} · ${film.label} · ${frames} frames · ${crop.width * 2}×${crop.height * 2}`)
    for (let frame = 0; frame < frames; frame++) {
      const png = await page.evaluate(t => window.filoRender.frame(t), frame / frames * duration)
      await new Promise((resolve, reject) => encoder.stdin.write(Buffer.from(png, 'base64'), error => error ? reject(error) : resolve()))
    }
    encoder.stdin.end()
    await encoded
    encoder = undefined
    console.log(`Saved ${film.id}: VP9 alpha + Apple HEVC alpha + poster`)
  }
} finally {
  encoder?.kill('SIGKILL')
  await browser.close()
  await rm(scratch, { recursive: true, force: true })
}
