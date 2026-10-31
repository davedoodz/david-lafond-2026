#!/usr/bin/env node
/**
 * Re-encodes a muted loop for the site: H.264 High@4.1, fast-start MP4, no audio track.
 *
 * High@4.1 is what cheap phones decode in hardware. Larger frames (over 8192 macroblocks, e.g.
 * 1600×1600 or 1060×2160) or a higher macroblock rate (1440×1440 at 60 fps) push them to software
 * decoding, which stutters and drains the battery. So the frame is scaled down to fit, and the
 * frame rate drops to 30 only when the frame is still too large to run at the source rate.
 *
 *   node scripts/encode-web-video.mjs <input> [--out <file>] [--crf <n>] [--max <px>]
 *
 * Without --out the input is replaced in place. CRF defaults to 26 (lower = larger, sharper); --max
 * also caps the long edge, for clips never shown that large.
 */
import { spawnSync } from 'node:child_process'
import { renameSync } from 'node:fs'
import path from 'node:path'

const MAX_FRAME_MBS = 8100 // under High@4.1's 8192 per frame, so 1440×1440 still fits
const MAX_MB_RATE = 245760 // High@4.1 macroblocks per second

const args = process.argv.slice(2)
const input = args.find((arg, i) => !arg.startsWith('--') && !args[i - 1]?.startsWith('--'))
const option = (name) => { const i = args.indexOf(`--${name}`); return i < 0 ? undefined : args[i + 1] }
if (!input) {
  console.error('Usage: node scripts/encode-web-video.mjs <input> [--out <file>] [--crf <n>] [--max <px>]')
  process.exit(1)
}
const out = option('out') ?? input
const crf = option('crf') ?? '26'
const maxEdge = Number(option('max') ?? Infinity)

const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate', '-of', 'json', input], { encoding: 'utf8' })
if (probe.status !== 0) throw new Error(probe.stderr)
const { width, height, r_frame_rate } = JSON.parse(probe.stdout).streams[0]
const [num, den] = r_frame_rate.split('/').map(Number)
const sourceFps = num / den

const mbs = (w, h) => Math.ceil(w / 16) * Math.ceil(h / 16)
let scale = Math.min(1, Math.sqrt((MAX_FRAME_MBS * 256) / (width * height)), maxEdge / Math.max(width, height))
let w = width, h = height
for (; ; scale -= 0.005) {
  w = Math.floor((width * scale) / 2) * 2
  h = Math.floor((height * scale) / 2) * 2
  if (mbs(w, h) <= MAX_FRAME_MBS) break
}
const fps = mbs(w, h) * sourceFps <= MAX_MB_RATE ? sourceFps : 30

const filters = [w !== width || h !== height ? `scale=${w}:${h}:flags=lanczos` : '', fps !== sourceFps ? `fps=${fps}` : ''].filter(Boolean)
const target = out === input ? path.join(path.dirname(input), `.${path.basename(input)}.encoding.mp4`) : out
const encode = spawnSync('ffmpeg', [
  '-hide_banner', '-loglevel', 'error', '-y', '-i', input,
  ...(filters.length ? ['-vf', filters.join(',')] : []),
  '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', crf,
  '-profile:v', 'high', '-level:v', '4.1', '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  target,
], { stdio: 'inherit' })
if (encode.status !== 0) process.exit(encode.status ?? 1)
if (target !== out) renameSync(target, out)
console.log(`${input}: ${width}×${height}@${+sourceFps.toFixed(2)} → ${w}×${h}@${+fps.toFixed(2)}, crf ${crf} → ${out}`)
