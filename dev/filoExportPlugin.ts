import { createReadStream } from 'node:fs'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { randomUUID } from 'node:crypto'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { once } from 'node:events'
import type { Plugin } from 'vite'
import { chromium, type Browser } from 'playwright'
import { parseProject, timeline } from '../src/studio/filo/model.ts'

/** Local-only rendering. No source writes, shell interpolation, remote URLs or visible browser windows. */
export function filoExportPlugin(): Plugin {
  let busy = false
  const downloads = new Map<string, { file: string; directory: string; timer: NodeJS.Timeout }>()
  return {
    name: 'filo-transparent-video-export',
    apply: 'serve',
    configureServer(server) {
      server.httpServer?.once('close', () => {
        for (const item of downloads.values()) { clearTimeout(item.timer); void rm(item.directory, { recursive: true, force: true }) }
        downloads.clear()
      })
      server.middlewares.use('/__filo', async (req, res) => {
        const address = server.httpServer?.address()
        if (!address || typeof address === 'string') { res.statusCode = 503; res.end('Local renderer unavailable.'); return }
        const host = req.headers.host ?? ''
        if (![`127.0.0.1:${address.port}`, `localhost:${address.port}`, `[::1]:${address.port}`].includes(host)
          || (req.headers.origin && req.headers.origin !== `http://${host}`)
          || req.headers['sec-fetch-site'] === 'cross-site') {
          res.statusCode = 403; res.end('The renderer is available only from this local studio.'); return
        }
        const downloadId = /^\/download\/([a-f0-9-]{36})$/.exec(req.url ?? '')?.[1]
        if (req.method === 'GET' && downloadId) {
          const item = downloads.get(downloadId)
          if (!item) { res.statusCode = 404; res.end('This temporary export expired. Render the loop again.'); return }
          res.setHeader('Content-Type', 'video/webm')
          res.setHeader('Content-Disposition', 'attachment; filename="filo-loop.webm"')
          createReadStream(item.file).on('error', () => res.destroy()).pipe(res)
          return
        }
        if (req.method !== 'POST' || req.url !== '/export') { res.statusCode = 404; res.end(); return }
        if (busy) { res.statusCode = 409; res.end('Another loop is rendering. Wait for it or cancel it first.'); return }
        let browser: Browser | undefined, encoder: ChildProcessWithoutNullStreams | undefined, directory: string | undefined
        let cancelled = false, started = false
        const cancel = () => { cancelled = true; encoder?.kill('SIGKILL'); void browser?.close() }
        const timeout = setTimeout(cancel, 300_000)
        res.once('close', cancel)
        try {
          let raw = ''
          for await (const chunk of req) {
            raw += String(chunk)
            if (raw.length > 1_000_000) throw new Error('Project exceeds the 1 MB limit.')
          }
          const body = JSON.parse(raw)
          const project = parseProject(body.project)
          const width = body.width
          if (width !== 540 && width !== 720) throw new Error('Choose a 540px or 720px render.')
          if (timeline(project).duration > 180) throw new Error('Video export is limited to a three-minute loop. Increase playback speed or reduce holds.')
          // Recheck after reading the body: concurrent requests must not both acquire the encoder.
          if (busy) { res.statusCode = 409; res.end('Another loop is rendering.'); return }
          busy = true; started = true
          res.setHeader('Content-Type', 'application/x-ndjson')
          res.setHeader('Cache-Control', 'no-store')
          res.write(JSON.stringify({ progress: 0, message: 'Starting windowless Chromium…' }) + '\n')
          browser = await chromium.launch({ headless: true })
          const page = await browser.newPage({ viewport: { width: 800, height: 1100 }, deviceScaleFactor: 1 })
          await page.goto(`http://127.0.0.1:${address.port}/studio/filo-prototypes.html?render=1`, { waitUntil: 'networkidle' })
          await page.waitForFunction(() => window.filoRender?.ready, undefined, { timeout: 30_000 })
          const duration = await page.evaluate(({ project, width }) => window.filoRender!.setProject(project, width), { project, width })
          if (cancelled) throw new Error('Render cancelled.')
          directory = await mkdtemp(path.join(tmpdir(), 'filo-loop-'))
          const file = path.join(directory, 'loop.webm')
          encoder = spawn('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-framerate', '24', '-f', 'image2pipe', '-vcodec', 'png', '-i', 'pipe:0', '-an', '-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-auto-alt-ref', '0', '-b:v', '0', '-crf', '24', '-deadline', 'good', '-cpu-used', '4', '-row-mt', '1', file], { stdio: ['pipe', 'pipe', 'pipe'] })
          let errors = ''
          encoder.stderr.on('data', data => { errors = (errors + String(data)).slice(-4000) })
          const encoded = new Promise<void>((resolve, reject) => {
            encoder!.once('error', error => reject(new Error(`FFmpeg could not start: ${error.message}`)))
            encoder!.once('close', code => code === 0 ? resolve() : reject(new Error(`FFmpeg failed: ${errors || code}`)))
          })
          // A spawn failure may arrive while a frame is being evaluated; keep it handled until awaited.
          void encoded.catch(() => {})
          encoder.stdin.on('error', () => {})
          const frames = Math.ceil(duration * 24)
          for (let frame = 0; frame < frames; frame++) {
            if (cancelled) throw new Error('Render cancelled.')
            const png = await page.evaluate(time => window.filoRender!.frame(time), frame / frames * duration)
            if (!encoder.stdin.write(Buffer.from(png, 'base64'))) {
              await Promise.race([once(encoder.stdin, 'drain'), encoded.then(() => { throw new Error('Encoder closed before all frames were written.') })])
            }
            if (frame % 12 === 0) res.write(JSON.stringify({ progress: (frame + 1) / frames * 0.95, message: `Rendering frame ${frame + 1} of ${frames}…` }) + '\n')
          }
          encoder.stdin.end()
          res.write(JSON.stringify({ progress: 0.97, message: 'Finishing transparent WebM…' }) + '\n')
          await encoded
          const id = randomUUID(), completedDirectory = directory
          const timer = setTimeout(() => { downloads.delete(id); void rm(completedDirectory, { recursive: true, force: true }) }, 3_600_000)
          timer.unref()
          downloads.set(id, { file, directory, timer }); directory = undefined
          res.end(JSON.stringify({ progress: 1, message: 'Transparent loop ready. Download available for one hour.', url: `/__filo/download/${id}` }) + '\n')
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          if (!res.headersSent) { res.statusCode = 400; res.end(message) }
          else if (!res.destroyed) res.end(JSON.stringify({ error: message }) + '\n')
        } finally {
          clearTimeout(timeout); res.off('close', cancel)
          encoder?.kill('SIGKILL'); await browser?.close().catch(() => {})
          if (directory) await rm(directory, { recursive: true, force: true })
          if (started) busy = false
        }
      })
    },
  }
}
