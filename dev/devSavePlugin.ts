/**
 * Dev-only endpoint that lets on-page tools (DialKit panels, the signature
 * studio) write their values back into the repo, so tuning survives reloads,
 * ships to production, and lives in git.
 *
 *   POST /__dev/save  { file: 'tuning', key: 'Hero', data: {...} }  → merges key into src/data/tuning.json
 *   POST /__dev/save  { file: 'signature', data: {...} }             → replaces src/data/signature.json
 *   POST /__dev/save  { file: 'work-stickers', data: {...} }        → replaces studio/work-stickers.saved.json
 *   POST /__dev/upload { dataUrl: 'data:image/png;base64,…' }        → writes studio/sticker-uploads/<hash>.png, returns { url }
 */
import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const FILES = {
  tuning: 'src/data/tuning.json',
  signature: 'src/data/signature.json',
  deviceSequence: 'studio/momo-device-sequence.json',
  momoSystem: 'src/features/momoSystem/settings.json',
  portfolioLayouts: 'src/data/portfolio-layouts.json',
  'work-stickers': 'studio/work-stickers.saved.json',
  'about-stickers': 'studio/about-stickers.saved.json',
} as const

type SaveBody = { file: keyof typeof FILES; key?: string; data: unknown }
const UPLOADS = 'studio/sticker-uploads'

export function devSavePlugin(): Plugin {
  let root = process.cwd()
  const selfWrites = new Map<string, number>()
  return {
    name: 'dev-save',
    apply: 'serve',
    configResolved(config) {
      root = config.root
    },
    configureServer(server) {
      server.middlewares.use('/__dev/save', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        let raw = ''
        req.on('data', (chunk) => (raw += chunk))
        req.on('end', () => {
          try {
            const body = JSON.parse(raw) as SaveBody
            const rel = FILES[body.file]
            if (!rel) throw new Error(`unknown file ${String(body.file)}`)
            const abs = path.join(root, rel)
            let next: unknown = body.data
            if (body.key) {
              const current = fs.existsSync(abs) ? JSON.parse(fs.readFileSync(abs, 'utf8') || '{}') : {}
              current[body.key] = body.data
              next = current
            }
            const text = JSON.stringify(next, null, 2) + '\n'
            fs.mkdirSync(path.dirname(abs), { recursive: true })
            if (!fs.existsSync(abs) || fs.readFileSync(abs, 'utf8') !== text) {
              selfWrites.set(abs, Date.now())
              fs.writeFileSync(abs, text)
            }
            res.setHeader('content-type', 'application/json')
            res.end('{"ok":true}')
          } catch (error) {
            res.statusCode = 400
            res.end(JSON.stringify({ ok: false, error: String(error) }))
          }
        })
      })
      // Sticker uploads become real files; storing them as data URLs overflowed localStorage.
      server.middlewares.use('/__dev/upload', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }
        let raw = ''
        req.on('data', (chunk) => (raw += chunk))
        req.on('end', () => {
          try {
            const { dataUrl } = JSON.parse(raw) as { dataUrl: string }
            const match = /^data:image\/(png|jpeg|gif|webp|svg\+xml|avif);base64,(.+)$/.exec(dataUrl)
            if (!match) throw new Error('expected a base64 image data URL')
            const bytes = Buffer.from(match[2], 'base64')
            const ext = { png: 'png', jpeg: 'jpg', gif: 'gif', webp: 'webp', 'svg+xml': 'svg', avif: 'avif' }[match[1]]
            const name = `${createHash('sha1').update(bytes).digest('hex').slice(0, 16)}.${ext}`
            const abs = path.join(root, UPLOADS, name)
            if (!fs.existsSync(abs)) {
              fs.mkdirSync(path.dirname(abs), { recursive: true })
              selfWrites.set(abs, Date.now())
              fs.writeFileSync(abs, bytes)
            }
            res.setHeader('content-type', 'application/json')
            res.end(JSON.stringify({ ok: true, url: `/${UPLOADS}/${name}` }))
          } catch (error) {
            res.statusCode = 400
            res.end(JSON.stringify({ ok: false, error: String(error) }))
          }
        })
      })
    },
    // Writes that came from the page must not reload the page that made them.
    handleHotUpdate(ctx) {
      const at = selfWrites.get(ctx.file)
      if (at && Date.now() - at < 2000) {
        selfWrites.delete(ctx.file)
        return []
      }
    },
  }
}
