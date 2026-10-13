export const ASSET_ROOT = '/work/filo/studio/'
export const ASSETS = [
  ['cellulose', 'Bacterial cellulose'], ['thread-detail', 'Clay thread detail'],
  ['thread-tag', 'Thread + tag'], ['material-tag', 'Physical material tag'],
  ['confirmation', 'Confirmation'], ['nfc', 'NFC signal'], ['library', 'Material library'],
  ['tag-scan', 'NFC-enabled tag'], ['pinked-edges', 'Pinked fabric edges'],
  ['scan-detail', 'Tag interaction'], ['lime-blob', 'Lime organic form'],
  ['swatches', 'Neutral swatches'], ['warning', 'Warning'], ['white-blob', 'White organic form'],
] as const
export type Asset = typeof ASSETS[number][0]
export type BlockKind = 'image' | 'rows' | 'metrics' | 'notice' | 'progress' | 'wave' | 'checklist'
export type Block = {
  id: string; kind: BlockKind; title?: string; body?: string; items?: [string, string][];
  asset?: Asset; height: number; tone?: 'neutral' | 'success' | 'warning';
  x?: number; y?: number; scale?: number
}
export type Scene = {
  id: string; label: string; kicker: string; title: string; description: string; cta: string;
  blocks: Block[]; hold: number; tapX: number; tapY: number
}
export type Flow = { id: string; title: string; phase: string; reference: number; scenes: Scene[] }
export type MotionStyle = 'push' | 'dissolve' | 'sheet' | 'lift'
export type Settings = {
  motion: { style: MotionStyle; speed: number; transition: number; hold: number; loopPause: number; softness: number; taps: boolean; tapSize: number };
  device: { scale: number; x: number; y: number; rotation: number };
  screen: { textScale: number; radius: number; accent: string; background: string }
}
export type Project = { version: 1; flow: Flow; settings: Settings }
export const DEFAULT_SETTINGS: Settings = {
  motion: { style: 'push', speed: 1, transition: 0.65, hold: 1, loopPause: 0.8, softness: 4, taps: true, tapSize: 22 },
  device: { scale: 1, x: 0, y: 0, rotation: 0 },
  screen: { textScale: 1, radius: 18, accent: '#4f6b4a', background: '#fafafa' },
}
export const PRESETS: { name: string; description: string; motion: Settings['motion'] }[] = [
  { name: 'Native', description: 'A calm, decisive screen push.', motion: { ...DEFAULT_SETTINGS.motion } },
  { name: 'Quiet', description: 'Unhurried dissolves. Time to read.', motion: { ...DEFAULT_SETTINGS.motion, style: 'dissolve', transition: 0.85, hold: 1.25, taps: false } },
  { name: 'Fluid', description: 'Soft upward reveals with a long settle.', motion: { ...DEFAULT_SETTINGS.motion, style: 'lift', transition: 0.9, softness: 5, hold: 1.1 } },
  { name: 'Sheet', description: 'Full-height sheets rise into place.', motion: { ...DEFAULT_SETTINGS.motion, style: 'sheet', transition: 0.75, softness: 4.5 } },
  { name: 'Quick cut', description: 'A concise, faster portfolio loop.', motion: { ...DEFAULT_SETTINGS.motion, style: 'dissolve', transition: 0.3, hold: 0.7, loopPause: 0.35 } },
]
export function timeline(project: Project) {
  let at = 0
  const clips = project.flow.scenes.map((scene, i) => {
    const hold = (scene.hold * project.settings.motion.hold + (i === project.flow.scenes.length - 1 ? project.settings.motion.loopPause : 0)) / project.settings.motion.speed
    const transition = project.settings.motion.transition / project.settings.motion.speed
    const clip = { start: at, hold, transition, end: at + hold + transition }
    at = clip.end
    return clip
  })
  return { clips, duration: at }
}

/** Shared by browser imports and the local encoder. Never trust a saved project as code or a URL. */
export function parseProject(value: unknown): Project {
  if (!value || typeof value !== 'object') throw new Error('Choose a Filo studio project JSON.')
  const p = value as Project
  if (p.version !== 1 || !p.flow || !Array.isArray(p.flow.scenes) || p.flow.scenes.length < 1 || p.flow.scenes.length > 20) throw new Error('This is not a supported Filo project.')
  const text = (v: unknown, max = 1500) => { if (typeof v !== 'string' || v.length > max) throw new Error('A text field is invalid or too long.') }
  const number = (v: unknown, min: number, max: number) => { if (typeof v !== 'number' || !Number.isFinite(v) || v < min || v > max) throw new Error(`A number is outside ${min}–${max}.`) }
  text(p.flow.id, 80); text(p.flow.title, 160); text(p.flow.phase, 80); number(p.flow.reference, 1, 16)
  for (const scene of p.flow.scenes) {
    for (const key of ['id', 'label', 'kicker', 'title', 'description', 'cta'] as const) text(scene[key])
    number(scene.hold, 0.5, 12); number(scene.tapX, 0, 393); number(scene.tapY, 0, 852)
    if (!Array.isArray(scene.blocks) || scene.blocks.length > 6) throw new Error('A screen may have up to six blocks.')
    for (const block of scene.blocks) {
      text(block.id, 100)
      if (!['image', 'rows', 'metrics', 'notice', 'progress', 'wave', 'checklist'].includes(block.kind)) throw new Error('Unknown block type.')
      if (block.title !== undefined) text(block.title)
      if (block.body !== undefined) text(block.body)
      if (block.asset !== undefined && !ASSETS.some(([id]) => id === block.asset)) throw new Error('Unknown image asset.')
      if (block.tone !== undefined && !['neutral', 'success', 'warning'].includes(block.tone)) throw new Error('Unknown evidence tone.')
      number(block.height, 48, 350)
      if (block.x !== undefined) number(block.x, -300, 300)
      if (block.y !== undefined) number(block.y, -500, 500)
      if (block.scale !== undefined) number(block.scale, 0.5, 1.5)
      if (block.items !== undefined) {
        if (!Array.isArray(block.items) || block.items.length > 12) throw new Error('Too many rows.')
        for (const row of block.items) { if (!Array.isArray(row) || row.length !== 2) throw new Error('Invalid row.'); text(row[0]); text(row[1]) }
      }
    }
  }
  const { motion: m, device: d, screen: s } = p.settings ?? {}
  if (!m || !d || !s || !['push', 'dissolve', 'sheet', 'lift'].includes(m.style) || typeof m.taps !== 'boolean') throw new Error('Missing animation settings.')
  number(m.speed, 0.25, 3); number(m.transition, 0.15, 1.5); number(m.hold, 0.4, 2); number(m.loopPause, 0, 3); number(m.softness, 2, 6); number(m.tapSize, 10, 40)
  number(d.scale, 0.65, 1.08); number(d.x, -110, 110); number(d.y, -70, 70); number(d.rotation, -8, 8)
  number(s.textScale, 0.85, 1.1); number(s.radius, 0, 30)
  if (!/^#[0-9a-f]{6}$/i.test(s.accent) || !/^#[0-9a-f]{6}$/i.test(s.background)) throw new Error('Use six-digit hex colors.')
  if (timeline(p).duration > 300) throw new Error('Keep each loop below five minutes.')
  return structuredClone(p)
}
