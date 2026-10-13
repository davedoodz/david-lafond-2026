import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ArrowLeft, ArrowUpRight, Plus, House, Layers3, ClipboardList, Activity, Check, ChevronRight, FileText } from 'lucide-react'
import { ASSETS, ASSET_ROOT, timeline, type Block, type Project, type Scene } from './model'

export const WIDTH = 720
export const HEIGHT = 1040
export type Hit = { id: string; x: number; y: number; width: number; height: number }
export type RenderAssets = { images: Map<string, HTMLImageElement>; icons: Map<string, HTMLImageElement> }
let loading: Promise<RenderAssets> | undefined
export function loadAssets(): Promise<RenderAssets> {
  return loading ??= (async () => {
    const images = new Map<string, HTMLImageElement>()
    const icons = new Map<string, HTMLImageElement>()
    const font = new FontFace('Filo Studio', 'url(/fonts/Inter-var-latin.woff2)', { weight: '100 900' })
    await font.load(); document.fonts.add(font)
    await Promise.all([
      ...[...ASSETS.map(([id]) => [id, `${ASSET_ROOT}${id}.webp`]), ['frame', '/work/momo/devices/iphone-silver.png']].map(async ([id, src]) => {
        const image = new Image(); image.src = src; await image.decode(); images.set(id, image)
      }),
      ...Object.entries({ back: ArrowLeft, arrow: ArrowUpRight, plus: Plus, home: House, materials: Layers3, development: ClipboardList, activity: Activity, check: Check, chevron: ChevronRight, file: FileText }).map(async ([id, icon]) => {
        const image = new Image()
        image.src = `data:image/svg+xml,${encodeURIComponent(renderToStaticMarkup(createElement(icon, { size: 32, color: '#171918', strokeWidth: 1.65 })))}`
        await image.decode(); icons.set(id, image)
      }),
    ])
    return { images, icons }
  })()
}
const INK = '#171918'
const MUTED = '#767b76'
function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.fillStyle = fill; ctx.beginPath(); ctx.roundRect(x, y, w, h, Math.max(0, Math.min(r, h / 2, w / 2))); ctx.fill()
}
function text(ctx: CanvasRenderingContext2D, value: string, x: number, y: number, size: number, weight = 400, color = INK, maxWidth = 340, lineHeight = size * 1.35): number {
  ctx.font = `${weight} ${size}px "Filo Studio", sans-serif`; ctx.fillStyle = color; ctx.textBaseline = 'top'
  let lineY = y
  for (const paragraph of value.split('\n')) {
    let line = ''
    for (const word of paragraph.split(' ')) {
      const trial = line ? `${line} ${word}` : word
      if (ctx.measureText(trial).width > maxWidth && line) { ctx.fillText(line, x, lineY); lineY += lineHeight; line = word }
      else line = trial
    }
    ctx.fillText(line, x, lineY); lineY += lineHeight
  }
  return lineY
}
function imageCover(ctx: CanvasRenderingContext2D, image: HTMLImageElement, x: number, y: number, width: number, height: number) {
  const scale = Math.max(width / image.width, height / image.height)
  ctx.drawImage(image, x + (width - image.width * scale) / 2, y + (height - image.height * scale) / 2, image.width * scale, image.height * scale)
}

function paintBlock(ctx: CanvasRenderingContext2D, block: Block, y: number, height: number, assets: RenderAssets, project: Project, time: number) {
  const { radius, accent, textScale: ts } = project.settings.screen
  const width = 345
  const tone = block.tone === 'warning' ? '#faf0e8' : block.tone === 'success' ? '#eef3e9' : '#f0f1ee'
  const toneInk = block.tone === 'warning' ? '#936243' : accent
  ctx.save()
  ctx.translate(24 + (block.x ?? 0), y + (block.y ?? 0))
  ctx.scale(block.scale ?? 1, block.scale ?? 1)
  if (block.kind === 'image') {
    ctx.beginPath(); ctx.roundRect(0, 0, width, height, radius); ctx.clip()
    const im = assets.images.get(block.asset ?? 'cellulose')!
    imageCover(ctx, im, 0, 0, width, height)
  } else if (block.kind === 'notice') {
    rounded(ctx, 0, 0, width, height, radius, tone)
    const end = text(ctx, block.title ?? '', 17, 17, 15 * ts, 600, block.tone ? toneInk : INK, 310)
    text(ctx, block.body ?? '', 17, end + 9, 14 * ts, 400, '#626761', 309, 20 * ts)
  } else if (block.kind === 'metrics') {
    rounded(ctx, 0, 0, width, height, radius, '#f0f1ee')
    text(ctx, block.title ?? '', 17, 16, 12 * ts, 500, MUTED, 310)
    const items = block.items ?? []
    const slot = (width - 34) / Math.max(1, items.length)
    items.forEach(([value, label], i) => {
      text(ctx, value, 17 + i * slot, 47, (items.length > 2 ? 29 : 36) * ts, 600, INK, slot - 8)
      text(ctx, label, 17 + i * slot, 92, 11 * ts, 400, MUTED, slot - 8, 15)
    })
  } else if (block.kind === 'wave') {
    rounded(ctx, 0, 0, width, height, radius, '#edf2e8')
    text(ctx, block.title ?? '', 18, 17, 17 * ts, 500, accent, 305)
    for (let i = 0; i < 39; i++) {
      const amplitude = (Math.sin(i * 0.71 + time * 7) * 0.5 + 0.5) * (Math.sin(i / 38 * Math.PI) * 26) + 4
      rounded(ctx, 22 + i * 7.8, height * 0.52 - amplitude / 2, 3, amplitude, 1.5, accent)
    }
    text(ctx, block.body ?? '', 18, height - 33, 12 * ts, 400, MUTED, 309)
  } else {
    rounded(ctx, 0, 0, width, height, radius, '#f1f2ef')
    text(ctx, block.title ?? '', 17, 16, 13 * ts, 600, INK, 310)
    const items = block.items ?? []
    const rowHeight = (height - 50) / Math.max(1, items.length)
    items.forEach(([label, value], i) => {
      const rowY = 47 + i * rowHeight
      if (i && block.kind === 'rows') { ctx.strokeStyle = '#dfe2da'; ctx.lineWidth = 0.65; ctx.beginPath(); ctx.moveTo(17, rowY - 9); ctx.lineTo(width - 17, rowY - 9); ctx.stroke() }
      if (block.kind === 'checklist' || block.kind === 'progress') {
        const checked = block.kind === 'checklist' ? value !== 'Excluded' : time > i * 0.38
        rounded(ctx, 16, rowY + 1, 18, 18, 9, checked ? '#dceaca' : '#e4e6df')
        if (checked) ctx.drawImage(assets.icons.get('check')!, 19, rowY + 4, 12, 12)
        text(ctx, label, 44, rowY, 13 * ts, 500, INK, 281)
        text(ctx, value, 44, rowY + 22, 11 * ts, 400, MUTED, 280)
      } else if (rowHeight >= 53) {
        text(ctx, label, 17, rowY, 14 * ts, 500, INK, 307)
        text(ctx, value, 17, rowY + 23, 12 * ts, 400, MUTED, 288)
        ctx.drawImage(assets.icons.get('chevron')!, 312, rowY + 5, 15, 15)
      } else {
        text(ctx, label, 17, rowY, 12 * ts, 400, MUTED, 141, 16)
        text(ctx, value, 166, rowY, 12 * ts, 500, INK, 161, 16)
      }
    })
  }
  ctx.restore()
}

/** Draw a stateless screen. The film's only input is time, so scrubbing and export match playback. */
export function paintScreen(ctx: CanvasRenderingContext2D, scene: Scene, project: Project, assets: RenderAssets, time: number): Hit[] {
  const ts = project.settings.screen.textScale
  ctx.fillStyle = project.settings.screen.background; ctx.fillRect(0, 0, 393, 852)
  text(ctx, scene.kicker, 24, 119, 9.5, 550, MUTED, 343, 13)
  const titleBottom = text(ctx, scene.title, 24, 145, 27 * ts, 550, INK, 341, 31 * ts)
  const descTop = titleBottom + 10
  const descBottom = text(ctx, scene.description, 24, descTop, 13 * ts, 400, MUTED, 338, 18 * ts)
  const hits: Hit[] = [
    { id: 'title', x: 24, y: 145, width: 345, height: titleBottom - 145 },
    { id: 'description', x: 24, y: descTop, width: 345, height: descBottom - descTop },
  ]
  let y = descBottom + 20
  const available = 715 - y - Math.max(0, scene.blocks.length - 1) * 12
  const requested = scene.blocks.reduce((sum, b) => sum + b.height, 0)
  const fit = Math.min(1, available / Math.max(1, requested))
  for (const block of scene.blocks) {
    const height = block.height * fit
    paintBlock(ctx, block, y, height, assets, project, time)
    hits.push({ id: block.id, x: 24 + (block.x ?? 0), y: y + (block.y ?? 0), width: 345 * (block.scale ?? 1), height: height * (block.scale ?? 1) })
    y += height + 12
  }
  rounded(ctx, 24, 735, 345, 46, 23, INK)
  ctx.font = `500 ${13 * ts}px "Filo Studio"`; const ctaWidth = ctx.measureText(scene.cta).width
  text(ctx, scene.cta, Math.max(38, (393 - ctaWidth) / 2), 750, 13 * ts, 500, '#ffffff', 319)
  hits.push({ id: 'cta', x: 24, y: 735, width: 345, height: 46 })
  return hits
}

function paintChrome(ctx: CanvasRenderingContext2D, scene: Scene, assets: RenderAssets) {
  text(ctx, '9:41', 30, 20, 15, 600)
  ctx.fillStyle = INK
  for (let i = 0; i < 4; i++) ctx.fillRect(306 + i * 4, 28 - i * 2, 2.7, 4 + i * 2)
  ctx.strokeStyle = INK; ctx.lineWidth = 1.5
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(335, 31, 2 + i * 3.4, Math.PI * 1.22, Math.PI * 1.78); ctx.stroke() }
  rounded(ctx, 349, 21, 21, 10, 3, INK); rounded(ctx, 371, 24, 2, 4, 1, '#929591')
  text(ctx, 'Filo', 24, 64, 27, 550)
  ctx.drawImage(assets.icons.get('plus')!, 317, 69, 21, 21)
  rounded(ctx, 353, 77, 3, 3, 2, INK); rounded(ctx, 359, 77, 3, 3, 2, INK); rounded(ctx, 365, 77, 3, 3, 2, INK)
  ctx.strokeStyle = '#e3e5df'; ctx.lineWidth = 0.65; ctx.beginPath(); ctx.moveTo(24, 796); ctx.lineTo(369, 796); ctx.stroke()
  const nav = [['home', 'Home'], ['materials', 'Materials'], ['development', 'Development'], ['activity', 'Activity']]
  nav.forEach(([icon, label], i) => {
    ctx.globalAlpha = i === (scene.id === 'home' ? 0 : 1) ? 1 : 0.5
    ctx.drawImage(assets.icons.get(icon)!, 55 + i * 88, 805, 17, 17)
    text(ctx, label, 64 + i * 88 - label.length * 2.1, 827, 8.2, 500, INK, 87)
  })
  ctx.globalAlpha = 1
}

export function screenPoint(project: Project, x: number, y: number) {
  const { scale, rotation, x: dx, y: dy } = project.settings.device
  const radians = -rotation * Math.PI / 180
  const px = x - WIDTH / 2 - dx, py = y - HEIGHT / 2 - dy
  const localX = (px * Math.cos(radians) - py * Math.sin(radians)) / scale
  const localY = (px * Math.sin(radians) + py * Math.cos(radians)) / scale
  const phoneW = 440, phoneH = phoneW * 1780 / 874
  const sx = -phoneW / 2 + 46 / 874 * phoneW, sy = -phoneH / 2 + 39 / 1780 * phoneH
  return { x: (localX - sx) / (784 / 874 * phoneW) * 393, y: (localY - sy) / (1702 / 1780 * phoneH) * 852 }
}

export function renderFrame(canvas: HTMLCanvasElement, project: Project, assets: RenderAssets, seconds: number, selection?: string) {
  const ctx = canvas.getContext('2d', { alpha: true })!
  const { clips, duration } = timeline(project)
  const time = ((seconds % duration) + duration) % duration
  const index = Math.max(0, clips.findIndex(c => time < c.end))
  const clip = clips[index], elapsed = time - clip.start
  const progress = Math.max(0, Math.min(1, (elapsed - clip.hold) / clip.transition))
  const eased = 1 - Math.pow(1 - progress, project.settings.motion.softness)
  const next = (index + 1) % clips.length
  const style = next === 0 ? 'dissolve' : project.settings.motion.style
  ctx.setTransform(canvas.width / WIDTH, 0, 0, canvas.height / HEIGHT, 0, 0)
  ctx.clearRect(0, 0, WIDTH, HEIGHT)
  const d = project.settings.device
  ctx.translate(WIDTH / 2 + d.x, HEIGHT / 2 + d.y); ctx.rotate(d.rotation * Math.PI / 180); ctx.scale(d.scale, d.scale)
  const phoneW = 440, phoneH = phoneW * 1780 / 874
  const sx = -phoneW / 2 + 46 / 874 * phoneW, sy = -phoneH / 2 + 39 / 1780 * phoneH
  const sw = 784 / 874 * phoneW, sh = 1702 / 1780 * phoneH
  ctx.save(); ctx.translate(sx, sy); ctx.scale(sw / 393, sh / 852)
  ctx.beginPath(); ctx.roundRect(0, 0, 393, 852, 55); ctx.clip()
  ctx.fillStyle = project.settings.screen.background; ctx.fillRect(0, 0, 393, 852)
  let hits: Hit[] = []
  const draw = (sceneIndex: number, incoming: boolean) => {
    ctx.save()
    if (progress > 0) {
      if (style === 'push') ctx.translate(incoming ? (1 - eased) * 393 : -eased * 110, 0)
      if (style === 'sheet') ctx.translate(0, incoming ? (1 - eased) * 852 : 0)
      if (style === 'lift') { ctx.translate(0, incoming ? (1 - eased) * 44 : -eased * 18); ctx.globalAlpha = incoming ? eased : 1 - eased }
      if (style === 'dissolve') ctx.globalAlpha = incoming ? eased : 1
    }
    const result = paintScreen(ctx, project.flow.scenes[sceneIndex], project, assets, incoming ? 0 : elapsed)
    if (!incoming) hits = result
    ctx.restore()
  }
  // The status bar, app header and tab bar stay attached to the device.
  ctx.save(); ctx.beginPath(); ctx.rect(0, 106, 393, 690); ctx.clip()
  draw(index, false)
  if (progress > 0) draw(next, true)
  ctx.restore()
  paintChrome(ctx, project.flow.scenes[eased >= 0.5 ? next : index], assets)
  if (project.settings.motion.taps && !progress) {
    const lead = 0.6 / project.settings.motion.speed
    const t = (elapsed - (clip.hold - lead)) / lead
    if (t >= 0 && t <= 1) {
      const { tapX, tapY } = project.flow.scenes[index]
      const radius = project.settings.motion.tapSize * (1 + t * 0.35)
      ctx.fillStyle = `rgba(180,194,164,${Math.sin(t * Math.PI) * 0.55})`; ctx.strokeStyle = `rgba(70,94,55,${Math.sin(t * Math.PI) * 0.65})`; ctx.lineWidth = 1.4
      ctx.beginPath(); ctx.arc(tapX, tapY, radius, 0, Math.PI * 2); ctx.fill(); ctx.stroke()
    }
  }
  if (selection && progress === 0) {
    const hit = hits.find(h => h.id === selection)
    if (hit) {
      ctx.strokeStyle = '#639744'; ctx.lineWidth = 1.4; ctx.setLineDash([5, 3]); ctx.strokeRect(hit.x - 3, hit.y - 3, hit.width + 6, hit.height + 6); ctx.setLineDash([])
      for (const [x, y] of [[hit.x - 3, hit.y - 3], [hit.x + hit.width + 3, hit.y + hit.height + 3]]) rounded(ctx, x - 3, y - 3, 6, 6, 2, '#639744')
    }
  }
  ctx.restore()
  ctx.drawImage(assets.images.get('frame')!, -phoneW / 2, -phoneH / 2, phoneW, phoneH)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  return { index, hits, progress, duration }
}
