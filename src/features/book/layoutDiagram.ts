import { PAGE_ASPECT } from './bookPages'
import type { LayoutBlock, PageLayout } from './pageLayouts'

/** `ink: 'auto'` contrasts with the page, `'custom'` uses `color`, `'block'` follows each block's black/white ink. */
export type LineLayer = { show: boolean; ink: string; color: string; width: number; opacity: number; style: string }
export type DiagramSettings = {
  enabled: boolean
  opacity: number
  scanOpacity: number
  snap: boolean
  fills: { show: boolean; opacity: number }
  outlines: LineLayer & { handles: boolean }
  dots: { show: boolean; ink: string; color: string; size: number; spacing: number; opacity: number }
  grid: LineLayer & { columns: number; rows: number }
  guides: LineLayer
}

/** SVG user units: 100 across, page-aspect tall, so strokes never stretch. One unit = 10px at the 1000px intrinsic width. */
export const PAGE_HEIGHT = 100 / PAGE_ASPECT
const px = (value: number) => +(value / 10).toFixed(4)

/** Grid lines include current block edges, so they track every move and resize. */
export function diagramGuides(page: PageLayout, settings: DiagramSettings) {
  const grid = { x: [] as number[], y: [] as number[] }
  const edges = { x: new Set<number>(), y: new Set<number>() }
  if (settings.grid.show) {
    for (let i = 1; i < settings.grid.columns; i++) grid.x.push(i * 100 / settings.grid.columns)
    for (let i = 1; i < settings.grid.rows; i++) grid.y.push(i * 100 / settings.grid.rows)
  }
  if (settings.guides.show) {
    for (const block of page.blocks) {
      edges.x.add(block.x); edges.x.add(block.x + block.w)
      edges.y.add(block.y); edges.y.add(block.y + block.h)
    }
  }
  return { grid, edges: { x: [...edges.x], y: [...edges.y] } }
}

export function layerColor(layer: { ink: string; color: string }, page: PageLayout, block?: LayoutBlock) {
  if (layer.ink === 'block' && block) return block.color
  if (layer.ink === 'custom') return layer.color
  return page.background === 'black' ? 'white' : 'black'
}

function dashArray(layer: LineLayer) {
  const unit = Math.max(layer.width, 1)
  if (layer.style === 'dotted') return `${px(unit)} ${px(unit * 3)}`
  if (layer.style === 'dashed') return `${px(unit * 5)} ${px(unit * 4)}`
  return 'none'
}

/** Animation hooks: data-kind plus page-percentage geometry for presets to time against. */
function lineMarkup(kind: string, layer: LineLayer, page: PageLayout, lines: { x: number[]; y: number[] }) {
  if (!lines.x.length && !lines.y.length) return ''
  const items = [
    ...lines.x.map((x) => `<line data-kind="${kind}" data-axis="x" data-x="${x}" data-y="0" data-w="0" data-h="100" x1="${x}" x2="${x}" y1="0" y2="${PAGE_HEIGHT}"/>`),
    ...lines.y.map((y) => `<line data-kind="${kind}" data-axis="y" data-x="0" data-y="${y}" data-w="100" data-h="0" x1="0" x2="100" y1="${y * PAGE_HEIGHT / 100}" y2="${y * PAGE_HEIGHT / 100}"/>`),
  ].join('')
  return `<g data-layer="${kind}" fill="none" stroke="${layerColor(layer, page)}" stroke-width="${px(layer.width)}" stroke-dasharray="${dashArray(layer)}" opacity="${layer.opacity}">${items}</g>`
}

/** One SVG document feeds page-flip images, grid previews, zoom, and the animated overlay, so the overlay's last frame is the resting image. */
export function diagramMarkup(page: PageLayout, settings: DiagramSettings, id = 'diagram', veil = true) {
  const H = PAGE_HEIGHT
  const guides = diagramGuides(page, settings)
  const geometry = (b: LayoutBlock) => `data-x="${b.x}" data-y="${b.y}" data-w="${b.w}" data-h="${b.h}" x="${b.x}" y="${b.y * H / 100}" width="${b.w}" height="${b.h * H / 100}"`
  const { dots, fills, outlines } = settings
  const dotLayer = dots.show
    ? `<defs><pattern id="${id}-dots" width="${px(dots.spacing)}" height="${px(dots.spacing)}" patternUnits="userSpaceOnUse"><circle cx="${px(dots.spacing / 2)}" cy="${px(dots.spacing / 2)}" r="${px(dots.size / 2)}" fill="${layerColor(dots, page)}"/></pattern></defs><g data-layer="dots" opacity="${dots.opacity}"><rect data-kind="dots" width="100" height="${H}" fill="url(#${id}-dots)"/></g>`
    : ''
  const fillLayer = fills.show && page.blocks.length
    ? `<g data-layer="fills" opacity="${fills.opacity}">${page.blocks.map((b) => `<rect data-kind="fill" ${geometry(b)} fill="${b.color}"/>`).join('')}</g>`
    : ''
  const outlineLayer = outlines.show && page.blocks.length
    ? `<g data-layer="outlines" fill="none" stroke-width="${px(outlines.width)}" stroke-dasharray="${dashArray(outlines)}" opacity="${outlines.opacity}">${page.blocks.map((b) => `<rect data-kind="outline" ${geometry(b)} stroke="${layerColor(outlines, page, b)}"/>`).join('')}</g>`
    : ''
  const handle = px(Math.max(4, outlines.width * 4))
  const handleLayer = outlines.show && outlines.handles && page.blocks.length
    ? `<g data-layer="handles" opacity="${outlines.opacity}">${page.blocks.map((b) => [[b.x, b.y], [b.x + b.w, b.y], [b.x, b.y + b.h], [b.x + b.w, b.y + b.h]].map(([x, y]) =>
      `<rect data-kind="handle" data-x="${x}" data-y="${y}" data-w="0" data-h="0" x="${x - handle / 2}" y="${y * H / 100 - handle / 2}" width="${handle}" height="${handle}" fill="${layerColor(outlines, page, b)}"/>`).join('')).join('')}</g>`
    : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="${Math.round(1000 * H / 100)}" viewBox="0 0 100 ${H}" preserveAspectRatio="none">`
    + (veil ? `<rect data-kind="veil" width="100" height="${H}" fill="${page.background}" opacity="${1 - settings.scanOpacity}"/>` : '')
    + `<g opacity="${settings.opacity}">${dotLayer}${lineMarkup('grid', settings.grid, page, guides.grid)}${lineMarkup('guide', settings.guides, page, guides.edges)}${fillLayer}${outlineLayer}${handleLayer}</g></svg>`
}

export function diagramSource(page: PageLayout, settings: DiagramSettings, veil = true): string {
  return `data:image/svg+xml,${encodeURIComponent(diagramMarkup(page, settings, 'diagram', veil))}`
}

/** Clamp and snap on a page-local coordinate system, never to viewport pixels. */
export function constrainBlock(block: LayoutBlock, page: PageLayout, settings: DiagramSettings, resize: boolean): LayoutBlock {
  const snap = (value: number, axis: 'x' | 'y') => {
    if (!settings.snap) return value
    const count = axis === 'x' ? settings.grid.columns : settings.grid.rows
    const step = 100 / count
    let nearest = Math.round(value / step) * step
    let distance = Math.abs(value - nearest)
    for (const other of page.blocks) {
      if (other.id === block.id) continue
      for (const edge of axis === 'x' ? [other.x, other.x + other.w] : [other.y, other.y + other.h]) {
        const d = Math.abs(value - edge)
        if (d < distance) { nearest = edge; distance = d }
      }
    }
    return distance <= Math.min(1.25, step / 2) ? nearest : value
  }
  const next = { ...block }
  if (resize) {
    next.w = Math.min(100 - next.x, Math.max(0.5, snap(next.x + next.w, 'x') - next.x))
    next.h = Math.min(100 - next.y, Math.max(0.5, snap(next.y + next.h, 'y') - next.y))
  } else {
    next.x = Math.min(100 - next.w, Math.max(0, snap(next.x, 'x')))
    next.y = Math.min(100 - next.h, Math.max(0, snap(next.y, 'y')))
  }
  return { ...next, x: +next.x.toFixed(3), y: +next.y.toFixed(3), w: +next.w.toFixed(3), h: +next.h.toFixed(3) }
}
