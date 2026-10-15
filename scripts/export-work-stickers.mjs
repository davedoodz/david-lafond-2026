/**
 * Freezes David's saved Work-intro sticker study into the live config the portfolio ships:
 *
 *   - src/features/workStickers/workStickers.live.json (look + copy + per-sticker faces)
 *   - public/work/stickers/<hash>.png (uploaded artwork, resized to a 192px max side)
 *
 * Reads studio/work-stickers.saved.json (DialKit's persisted values) and studio/work-stickers.html
 * (the study's copy + slot config) — never the studio's localStorage, so this is reproducible from
 * a clean checkout. Re-run after editing the study in the dev server:
 *
 *   node scripts/export-work-stickers.mjs
 */
import { execFileSync } from 'node:child_process'
import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const HTML_PATH = path.join(root, 'studio/work-stickers.html')
const SAVED_PATH = path.join(root, 'studio/work-stickers.saved.json')
const UPLOADS_DIR = path.join(root, 'studio/sticker-uploads')
const IMAGES_OUT_DIR = path.join(root, 'public/work/stickers')
const JSON_OUT_PATH = path.join(root, 'src/features/workStickers/workStickers.live.json')
const MAX_SIDE = 192

const STYLE_FIELDS = ['label', 'artwork', 'image', 'fill', 'color', 'gradientEnd', 'gradientAngle', 'outline', 'size', 'offsetX', 'offsetY', 'side', 'gap', 'ends', 'height', 'tilt', 'hoverRotate', 'hoverX', 'hoverY']

/** Un-dots DialKit's flat `values` object for one sticker's faceN.* keys into a nested face object. */
function buildFace(values, index, resolveMotion) {
  const face = {}
  for (const key of STYLE_FIELDS) face[key] = values[`face${index}.${key}`]
  face.motion = {
    landing: resolveMotion(values[`face${index}.motion.landing`], 'landing'),
    letters: resolveMotion(values[`face${index}.motion.letters`], 'letters'),
  }
  return face
}

/** Walks a `<p>…</p>` paragraph's raw inner HTML into ordered {type:'text'|'sticker'} segments,
 * matching the study's own DOM-order run numbering (one index per non-whitespace text node, in
 * document order) so `layout.copy["p.run"]` keys line up exactly. */
function parseParagraph(innerHtml) {
  const segments = []
  const buttonRe = /<button\b[^>]*\bdata-slot="([^"]+)"[^>]*>([^<]*)<\/button>/g
  let last = 0
  let run = 0
  let match
  while ((match = buttonRe.exec(innerHtml))) {
    const text = innerHtml.slice(last, match.index)
    if (text.trim()) segments.push({ type: 'text', text, run: run++ })
    segments.push({ type: 'sticker', id: match[1] })
    last = buttonRe.lastIndex
  }
  const tail = innerHtml.slice(last)
  if (tail.trim()) segments.push({ type: 'text', text: tail, run: run++ })
  return segments
}

/** Applies layout.copy overrides and layout.removed substitutions, then merges adjacent text runs
 * (a removed sticker's plain text sits between two copy runs, same as the study's live DOM). */
function buildParagraph(segments, p, layout) {
  const tokens = segments.map(seg => {
    if (seg.type === 'text') {
      const key = `${p}.${seg.run}`
      const text = Object.hasOwn(layout.copy, key) ? layout.copy[key] : seg.text
      return { type: 'text', text }
    }
    if (Object.hasOwn(layout.removed, seg.id)) return { type: 'text', text: layout.removed[seg.id] }
    return { type: 'sticker', id: seg.id }
  })
  const merged = []
  for (const token of tokens) {
    const top = merged[merged.length - 1]
    if (token.type === 'text' && top?.type === 'text') top.text += token.text
    else merged.push({ ...token })
  }
  return merged.filter(token => token.type === 'sticker' || token.text !== '')
}

async function main() {
  const [html, saved] = await Promise.all([
    readFile(HTML_PATH, 'utf8'),
    readFile(SAVED_PATH, 'utf8').then(JSON.parse),
  ])
  const storage = saved.storage ?? {}

  const configMatch = html.match(/<script id="sticker-config" type="application\/json">([\s\S]*?)<\/script>/)
  if (!configMatch) throw new Error(`sticker-config script not found in ${HTML_PATH}`)
  const { slots } = JSON.parse(configMatch[1])

  const introMatch = html.match(/<div id="intro"[^>]*>([\s\S]*?)<\/div>\s*<div class="preview-footer">/)
  if (!introMatch) throw new Error(`#intro markup not found in ${HTML_PATH}`)
  const paragraphHtml = [...introMatch[1].matchAll(/<p>([\s\S]*?)<\/p>/g)].map(m => m[1])
  if (paragraphHtml.length !== 2) throw new Error(`expected 2 paragraphs in #intro, found ${paragraphHtml.length}`)

  const layout = {
    faces: {},
    removed: {},
    copy: {},
    ...(storage['work-stickers-layout-v1'] ?? {}),
  }

  const lookValues = storage['dialkit:work-stickers-look-v1']?.values
  if (!lookValues) throw new Error('dialkit:work-stickers-look-v1 missing from the saved file')
  const look = {
    appearance: {
      pill: lookValues['appearance.pill'],
      stickerScale: lookValues['appearance.stickerScale'],
    },
    motion: {
      landing: lookValues['motion.landing'],
      letters: lookValues['motion.letters'],
      letterStagger: lookValues['motion.letterStagger'],
      letterSpeed: lookValues['motion.letterSpeed'],
      lift: lookValues['motion.lift'],
      hoverScale: lookValues['motion.hoverScale'],
      spring: lookValues['motion.spring'],
      loop: lookValues['motion.loop'],
    },
    hop: {
      height: lookValues['hop.height'],
      perDistance: lookValues['hop.perDistance'],
      peak: lookValues['hop.peak'],
      lean: lookValues['hop.lean'],
      rise: lookValues['hop.rise'],
      exit: lookValues['hop.exit'],
      blur: lookValues['hop.blur'],
      ripple: lookValues['hop.ripple'],
    },
  }
  const resolveMotion = (value, key) => (value === 'Global' ? look.motion[key] : value)

  const paragraphs = paragraphHtml.map((inner, p) => buildParagraph(parseParagraph(inner), p, layout))

  const liveIds = []
  for (const paragraph of paragraphs) {
    for (const token of paragraph) {
      if (token.type === 'sticker' && !liveIds.includes(token.id)) liveIds.push(token.id)
    }
  }

  await mkdir(IMAGES_OUT_DIR, { recursive: true })
  const resizedImages = new Map() // source path -> public path, so shared uploads resize once

  async function exportImage(sourceUrlPath) {
    if (resizedImages.has(sourceUrlPath)) return resizedImages.get(sourceUrlPath)
    const filename = path.basename(sourceUrlPath)
    const sourcePath = path.join(UPLOADS_DIR, filename)
    const destPath = path.join(IMAGES_OUT_DIR, filename)
    await copyFile(sourcePath, destPath)
    execFileSync('sips', ['-Z', String(MAX_SIDE), destPath], { stdio: 'pipe' })
    const publicPath = `/work/stickers/${filename}`
    resizedImages.set(sourceUrlPath, publicPath)
    return publicPath
  }

  const stickers = {}
  for (const id of liveIds) {
    const slot = slots[id]
    if (!slot) throw new Error(`slot "${id}" referenced in #intro but missing from sticker-config`)
    const values = storage[`dialkit:work-stickers-${id}-v1`]?.values
    if (!values) throw new Error(`dialkit:work-stickers-${id}-v1 missing from the saved file`)
    const faceCount = layout.faces[id] ?? slot.labels.length
    const faces = []
    for (let i = 1; i <= faceCount; i++) {
      const face = buildFace(values, i, resolveMotion)
      if (face.image) face.image = await exportImage(face.image)
      faces.push(face)
    }
    stickers[id] = {
      title: slot.title,
      timing: {
        hold: values['timing.hold'],
        duration: values['timing.duration'],
        letterSpeed: values['timing.letterSpeed'],
      },
      faces,
    }
  }

  const liveConfig = { look, paragraphs, stickers }
  await writeFile(JSON_OUT_PATH, `${JSON.stringify(liveConfig, null, 2)}\n`)

  const imageCount = resizedImages.size
  const stickerCount = Object.keys(stickers).length
  console.log(`work stickers: exported ${stickerCount} live stickers (${liveIds.join(', ')}), ${imageCount} images, to ${path.relative(root, JSON_OUT_PATH)}`)
}

await main()
