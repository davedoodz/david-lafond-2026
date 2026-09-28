/**
 * Sheet depth: vertical "file sheet" presets for a colour panel that is pulled
 * up over (or tucked under) the section before it.
 *
 * The sheet never grows sideways. Depth comes from the section underneath
 * receding, ghost sheets peeking above the top edge, a 3D tilt, a folder tab,
 * or an arched top edge. Every preset is a function of one scroll progress
 *
 *   n = 0  sheet resting (just arrived at the bottom of the viewport)
 *   n = 1  sheet settled (pulled all the way up)
 *
 * and only writes CSS variables, so nothing re-lays out while scrolling.
 */
import { useEffect, useRef, type RefObject } from 'react'
import './sheetDepth.css'

export const SHEET_PRESETS = ['none', 'drawer', 'stack', 'tilt', 'folder', 'arch', 'deck'] as const
export type SheetPreset = (typeof SHEET_PRESETS)[number]

type Tuple = [number, number, number, number]

/** DialKit folder shared by every sheet. `none` keeps the section's own background. */
export const sheetDials = () => ({
  preset: { type: 'select' as const, options: [...SHEET_PRESETS], default: 'none' },
  /** How far (in viewport heights) the sheet travels before it is settled. */
  travel: [0.6, 0.1, 1.5, 0.01] as Tuple,
  /** Multiplies every depth cue: recede, tilt, tab height, arch, layer gap. */
  depth: [1, 0, 2, 0.05] as Tuple,
  /** Only used by the `folder` preset. The tab keeps its shape; `motion` picks what scrolling does to it. */
  folder: {
    motion: { type: 'select' as const, options: [...FOLDER_MOTIONS], default: 'static' },
    tabWidth: [32, 10, 80, 0.5] as Tuple,
    tabHeight: [52, 8, 160, 1] as Tuple,
    /** Width of the curved shoulder, as a multiple of the tab height. */
    slope: [0.9, 0.2, 3, 0.05] as Tuple,
    _collapsed: false,
  },
  _collapsed: false,
})

/**
 * What scrolling does to the folder (n: 0 resting → 1 settled):
 *   static  tab holds its shape
 *   grow    tab rises out of the flat edge as the folder is pulled up
 *   slide   tab starts on the right and slides to its left home
 *   swell   tab stretches taller mid-scroll, then settles back
 *   drawer  static tab, the page behind shrinks back and dims
 *   files   two more folders behind, their tabs staggered to the right
 *   tilt    static tab, folder lifts from lying back to upright
 */
export const FOLDER_MOTIONS = ['static', 'grow', 'slide', 'swell', 'drawer', 'files', 'tilt'] as const

export type SheetValues = {
  preset: string
  travel: number
  depth: number
  folder: { motion: string; tabWidth: number; tabHeight: number; slope: number }
}

type Look = {
  tabX: number
  underScale: number
  underDim: number
  underY: number
  rotateX: number
  layerGap: number
  tabH: number
  archH: number
  shadow: number
}

const FLAT: Look = { tabX: 0, underScale: 1, underDim: 0, underY: 0, rotateX: 0, layerGap: 0, tabH: 0, archH: 0, shadow: 0 }

/** `r` = 1 − n (how "unsettled" the sheet is), `d` = depth dial, `vh` = viewport height. */
const LOOKS: Record<Exclude<SheetPreset, 'none'>, (n: number, r: number, d: number, vh: number) => Partial<Look>> = {
  // iOS-style sheet: the page behind shrinks back and darkens as the sheet pulls up.
  drawer: (n, _r, d) => ({ underScale: 1 - 0.07 * d * n, underDim: 0.45 * d * n, underY: -24 * d * n, shadow: 0.35 * d }),
  // A pile of file sheets: two ghosts fan out above the top edge, then tuck in.
  stack: (n, r, d) => ({ layerGap: 26 * d * r, underScale: 1 - 0.03 * d * n, shadow: 0.25 * d }),
  // Paper laid back on a desk, lifted upright as you scroll.
  tilt: (n, r, d) => ({ rotateX: 18 * d * r, underDim: 0.25 * d * n, shadow: 0.4 * d * r }),
  // Folder: handled by folderLook (needs the folder dials).
  folder: () => ({}),
  // The top edge bulges like a sheet being pushed up from below, then flattens.
  arch: (_n, r, d, vh) => ({ archH: 0.22 * vh * d * r, shadow: 0.3 * d }),
  // Everything at once, softer: ghosts + slight tilt + receding page.
  deck: (n, r, d) => ({
    layerGap: 18 * d * r,
    rotateX: 8 * d * r,
    underScale: 1 - 0.05 * d * n,
    underDim: 0.35 * d * n,
    underY: -16 * d * n,
    shadow: 0.35 * d,
  }),
}

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x)
const smooth = (x: number) => x * x * (3 - 2 * x)
const px = (x: number) => `${x.toFixed(2)}px`

/** `h` = tab height, `x` = tab left edge (px), `layerGap` = spacing of the ghost folders in `files`. */
function folderLook(motion: string, n: number, r: number, d: number, tabH: number, W: number): Partial<Look> {
  switch (motion) {
    case 'grow':
      return { tabH: tabH * n, shadow: 0.3 * d }
    case 'slide':
      return { tabH, tabX: W * 0.5 * d * r, shadow: 0.3 * d }
    case 'swell':
      return { tabH: tabH * (1 + 0.8 * d * Math.sin(Math.PI * n)), shadow: 0.3 * d }
    case 'drawer':
      return { tabH, underScale: 1 - 0.07 * d * n, underDim: 0.45 * d * n, underY: -24 * d * n, shadow: 0.35 * d }
    case 'files':
      return { tabH, layerGap: 22 * d * (0.35 + 0.65 * r), shadow: 0.25 * d }
    case 'tilt':
      return { tabH, rotateX: 18 * d * r, underDim: 0.25 * d * n, shadow: 0.4 * d * r }
    default:
      return { tabH, shadow: 0.3 * d }
  }
}

/**
 * Folder outline: a tab `tw` wide and `h` tall starting at `x`, curved
 * shoulders `slope`·h wide, body below. `R` top radius, `B` bottom radius.
 */
function folderPath(W: number, H: number, x: number, tw: number, h: number, slope: number, R: number, B: number) {
  const s = Math.max(h * slope, 0.5)
  const r = Math.min(R, H / 2)
  const tr = Math.min(r, h > 1 ? h : r)
  const tx = Math.min(Math.max(x, 0), Math.max(W - r - tw - 2 * s, 0))
  const right = tx + tw
  const left =
    tx < 2 * s + r
      ? `M0 ${H - B} L0 ${tr} Q0 0 ${tr} 0`
      : `M0 ${H - B} L0 ${h + r} Q0 ${h} ${r} ${h} L${tx - 2 * s} ${h} C${tx - s} ${h} ${tx - s} 0 ${tx} 0`
  return (
    `path('${left} L${right} 0 C${right + s} 0 ${right + s} ${h} ${right + 2 * s} ${h} ` +
    `L${W - r} ${h} Q${W} ${h} ${W} ${h + r} L${W} ${H - B} Q${W} ${H} ${W - B} ${H} ` +
    `L${B} ${H} Q0 ${H} 0 ${H - B} Z')`
  )
}

type Options = {
  values: SheetValues
  /** Top corner radius once settled, desktop / mobile. */
  radius: [number, number]
  /** Bottom corner radius (0 when the sheet runs to the end of the page). */
  bottomRadius?: [number, number]
  /** Custom 0‒1 progress; defaults to the top edge travelling `travel`·vh up from the viewport bottom. */
  progress?: (rect: DOMRect, vh: number) => number
}

export function useSheetDepth(
  sheetRef: RefObject<HTMLElement | null>,
  underRef: RefObject<HTMLElement | null>,
  { values, radius, bottomRadius = [0, 0], progress }: Options,
) {
  const progressRef = useRef(progress)
  progressRef.current = progress
  const key = JSON.stringify([values.preset, values.travel, values.depth, values.folder, radius, bottomRadius])

  useEffect(() => {
    const sheet = sheetRef.current
    const under = underRef.current
    if (!sheet) return
    const preset = values.preset as SheetPreset
    sheet.dataset.sheet = preset
    sheet.dataset.folder = values.folder.motion
    under?.classList.toggle('sheet-under', preset !== 'none')
    const clear = () => {
      for (const v of ['--sheet-clip', '--sheet-clip-1', '--sheet-clip-2', '--sheet-tf', '--sheet-layer-gap', '--sheet-shadow'])
        sheet.style.removeProperty(v)
      for (const v of ['--under-tf', '--under-dim']) under?.style.removeProperty(v)
    }
    if (preset === 'none' || !(preset in LOOKS)) {
      clear()
      return
    }

    const mobileQuery = window.matchMedia('(max-width: 640px)')
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0

    const update = () => {
      frame = 0
      const vh = window.innerHeight
      const rect = sheet.getBoundingClientRect()
      const custom = progressRef.current
      const n = reduced ? 1 : custom ? custom(rect, vh) : smooth(clamp01((vh - rect.top) / (values.travel * vh)))
      const mobile = mobileQuery.matches
      const R = mobile ? radius[1] : radius[0]
      const B = mobile ? bottomRadius[1] : bottomRadius[0]
      const W = sheet.offsetWidth
      const H = sheet.offsetHeight
      const f = values.folder
      const isFolder = preset === 'folder'
      const look = {
        ...FLAT,
        ...(isFolder
          ? folderLook(f.motion, n, 1 - n, values.depth, f.tabHeight, W)
          : LOOKS[preset as Exclude<SheetPreset, 'none'>](n, 1 - n, values.depth, vh)),
      }

      let clip: string
      if (isFolder) {
        const tw = (W * f.tabWidth) / 100
        const outline = (x: number) => folderPath(W, H, x, tw, look.tabH, f.slope, R, B)
        clip = outline(look.tabX)
        // Ghost folders (files motion): tabs staggered right, like a filing drawer.
        const step = tw * 0.9 + 2 * f.slope * look.tabH
        sheet.style.setProperty('--sheet-clip-1', outline(look.tabX + step))
        sheet.style.setProperty('--sheet-clip-2', outline(look.tabX + 2 * step))
      } else if (look.archH > R) clip = `inset(0 round 50% 50% ${px(B)} ${px(B)} / ${px(look.archH)} ${px(look.archH)} ${px(B)} ${px(B)})`
      else clip = `inset(0 round ${px(R)} ${px(R)} ${px(B)} ${px(B)})`

      sheet.style.setProperty('--sheet-clip', clip)
      sheet.style.setProperty('--sheet-tf', look.rotateX > 0.01 ? `perspective(1600px) rotateX(${look.rotateX.toFixed(2)}deg)` : 'none')
      sheet.style.setProperty('--sheet-layer-gap', px(look.layerGap))
      sheet.style.setProperty('--sheet-shadow', look.shadow.toFixed(3))
      if (under) {
        under.style.setProperty('--under-tf', `translateY(${px(look.underY)}) scale(${look.underScale.toFixed(4)})`)
        under.style.setProperty('--under-dim', look.underDim.toFixed(3))
      }
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    mobileQuery.addEventListener('change', schedule)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      mobileQuery.removeEventListener('change', schedule)
      clear()
      delete sheet.dataset.sheet
      delete sheet.dataset.folder
      under?.classList.remove('sheet-under')
    }
    // `key` captures every value the effect reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, sheetRef, underRef])
}

/** Background layers for a sheet. Render as the first child of the sheet element. */
export function SheetLayers({ preset }: { preset: string }) {
  if (preset === 'none') return null
  return (
    <div className="sheet__depth" aria-hidden="true">
      <div className="sheet__layer" data-layer="2" />
      <div className="sheet__layer" data-layer="1" />
      <div className="sheet__bg" />
    </div>
  )
}
