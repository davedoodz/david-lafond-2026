/**
 * Dev-only endpoint that lets on-page tools (DialKit panels, the signature
 * studio) write their values back into the repo, so tuning survives reloads,
 * ships to production, and lives in git.
 *
 *   POST /__dev/save  { file: 'tuning', key: 'Hero', data: {...} }  → merges key into src/data/tuning.json
 *   POST /__dev/save  { file: 'signature', data: {...} }             → replaces src/data/signature.json
 */
import fs from 'node:fs'
import path from 'node:path'
import type { Plugin } from 'vite'

const FILES = {
  tuning: 'src/data/tuning.json',
  signature: 'src/data/signature.json',
  deviceSequence: 'studio/momo-device-sequence.json',
  momoSystem: 'src/features/momoSystem/settings.json',
  portfolioLayouts: 'src/data/portfolio-layouts.json',
} as const

type SaveBody = { file: keyof typeof FILES; key?: string; data: unknown }

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
