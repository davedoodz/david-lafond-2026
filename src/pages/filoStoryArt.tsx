import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { EditableText } from '../components/EditableText'
import { FiloPersonaLoop } from '../features/filoCase/FiloPersonaLoop'
import { tellClose, tellFlow, tellSpeed } from '../features/filoCase/appFlowMessages'
import type { Story } from './caseStudyFlows'
import type { TextReveal } from './caseStudyContent'
import { SHEET_GRID, SHEET_VIEWS, decodeSheet } from '../features/filoCase/turntableSheets'
import './filoStoryArt.css'

type StoryCopy = Pick<Story, 'problemLabel' | 'problemTitle' | 'problemBody' | 'opportunityLabel' | 'opportunityTitle' | 'opportunityBody' | 'spacing' | 'textWidth'>
export type FiloStorySettings = StoryCopy & {
  textReveal: TextReveal
  gapImage: { scale: number; x: number; y: number }
  proposalImage: { image: string; accent: string; scale: number; x: number; y: number; speed: number; close: string }
  products: { show: boolean; size: number; spread: number; spin: number; topLeft: string; topRight: string; bottomLeft: string; bottomRight: string }
}

/** The 1127 × 1396 photos of a phone over the Filo tag and swatches; their screens were blue, now transparent. */
const OPPORTUNITY_PHOTO = { width: 1127, height: 1396 }
/** The box each photo's warp projects onto its phone screen, in warp px. */
const SCREEN_BOX = { width: 792, height: 1715 }
/** The prototype's screen (public/work/filo/filo-phone-glimpse.html), stretched to fill SCREEN_BOX. */
const GLIMPSE = { src: '/work/filo/filo-phone-glimpse.html', width: 390, height: 845.5 }
/** The prototype's Dynamic Island at rest, in its screen px (filo-phone-glimpse.html `.island`). */
const ISLAND = { x: 133, y: 14.8, width: 124, height: 40 }

/**
 * The photo's own Dynamic Island is opaque and sits above the screen, so it would cover the prototype's
 * island as that grows. This mask cuts the photo where the prototype's resting island lands (the stadium
 * projected through the photo's warp), so the prototype draws the island there and grows over that spot.
 * Any sliver of the photo's island left outside the cut is black, like every island state, so it never shows.
 */
function islandCut(warp: string) {
  const m = warp.slice(warp.indexOf('(') + 1, -1).split(',').map(Number)
  const sx = SCREEN_BOX.width / GLIMPSE.width, sy = SCREEN_BOX.height / GLIMPSE.height
  const project = (x: number, y: number) => {
    const X = x * sx, Y = y * sy, w = m[3] * X + m[7] * Y + m[15]
    return `${((m[0] * X + m[4] * Y + m[12]) / w).toFixed(1)} ${((m[1] * X + m[5] * Y + m[13]) / w).toFixed(1)}`
  }
  // Half a pixel inside the island, so antialiasing never opens a hairline of wallpaper.
  const r = ISLAND.height / 2 - 0.5, cy = ISLAND.y + ISLAND.height / 2
  const ends = [[ISLAND.x + ISLAND.width - ISLAND.height / 2, -Math.PI / 2], [ISLAND.x + ISLAND.height / 2, Math.PI / 2]] as const
  const points = ends.flatMap(([cx, from]) => Array.from({ length: 17 }, (_, i) => {
    const a = from + (Math.PI * i) / 16
    return project(cx + r * Math.cos(a), cy + r * Math.sin(a))
  }))
  const { width: W, height: H } = OPPORTUNITY_PHOTO
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}'><path fill-rule='evenodd' d='M0 0H${W}V${H}H0Z M${points.join('L')}Z'/></svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}
/**
 * Per photo (DialKit › story › proposalImage › image): the keyed photo, its screen mask, and the warp
 * projecting SCREEN_BOX onto its screen. Each warp is fitted to the four straight edges of that photo's
 * blue screen and pushed 3px past them, so the bezel hides the seam and no gap can show at the edges.
 * Both photos' Dynamic Islands land within 5px of the prototype's.
 */
/** `olive`: the same photo with its orange swatch recoloured olive (DialKit › story › proposalImage › accent).
    The Orange swatches pair has its bottom knit swatch re-rendered as the bucket hat's tan leather (the `-leather` files). */
const OPPORTUNITY_PHOTOS: Record<string, { phone: string; olive?: string; mask: string; warp: string }> = {
  'Green swatches': {
    phone: '/work/filo/story/opportunity-phone.webp',
    mask: '/work/filo/story/opportunity-screen-mask.webp',
    warp: 'matrix3d(0.518932, -0.113517, 0, 2.29135e-06, 0.174382, 0.315426, 0, -5.46061e-05, 0, 0, 1, 0, 239.982, 103.016, 0, 1)',
  },
  'Orange swatches': {
    phone: '/work/filo/story/opportunity-phone-2-leather.webp',
    olive: '/work/filo/story/opportunity-phone-2-olive-leather.webp',
    mask: '/work/filo/story/opportunity-screen-mask-2.webp',
    warp: 'matrix3d(0.521914, -0.111371, 0, 9.46491e-06, 0.174494, 0.318496, 0, -5.03511e-05, 0, 0, 1, 0, 239.6, 100.902, 0, 1)',
  },
}

/** Products made with new materials that can turn beside the proposal image, by their name in
    DialKit › story › products (caseStudyContent.ts PROPOSAL_PRODUCT_NAMES); each quadrant picks one. Each sheet is
    36 transparent views in a 6 × 6 grid, row by row; `view` is the sheet's own px per view; `olive` is the sheet
    recoloured for the olive accent. */
const PROPOSAL_PRODUCTS: Record<string, { label: string; sheet: string; olive?: string; view: number }> = {
  Windbreaker: { label: 'Xtep windbreaker in PLA', sheet: '/work/filo/sprites-hd/xtep-pla-windbreaker-spritesheet.webp', olive: '/work/filo/sprites-hd/xtep-pla-windbreaker-olive-spritesheet.webp', view: 768 },
  Tote: { label: 'Zara tote in Piñatex', sheet: '/work/filo/sprites-hd/zara-pinatex-bag-spritesheet.webp', view: 768 },
  Puffer: { label: 'The North Face puffer', sheet: '/work/filo/sprites-hd/northface-spritesheet.webp', view: 768 },
  Sneakers: { label: 'Nike Happy Pineapple sneaker in Piñatex', sheet: '/work/filo/sprites/nike-partners-with-pinatex-for-happy-pineapple-plant-based-sneaker-collection-spritesheet.webp', view: 256 },
  'Bucket hat': { label: 'Reishi mycelium leather bucket hat', sheet: '/work/filo/sprites/reishi-spritesheet.webp', view: 256 },
}
const QUADRANTS = [['top-left', 'topLeft'], ['bottom-left', 'bottomLeft'], ['top-right', 'topRight'], ['bottom-right', 'bottomRight']] as const
type ProductPicks = Pick<FiloStorySettings['products'], (typeof QUADRANTS)[number][1]>

/**
 * One product turning on a canvas. Painting the HD sheet as a CSS background made Chrome decode the
 * whole 4608px sheet (~85 MB, up to 130 ms) on the main thread, evict it, and decode it again on every
 * return. Here a worker decodes it once at the canvas's device-pixel size (never above the sheet's
 * own), so it looks the same and the page thread never decodes or resizes it; each step then copies
 * one view. The decode starts ahead of the viewport, turning runs only while on screen, and reduced
 * motion holds the first view.
 */
function Turntable({ sheet, view, spin, phase }: { sheet: string; view: number; spin: number; phase: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const spinRef = useRef(spin)
  useEffect(() => { spinRef.current = spin }, [spin])
  useEffect(() => {
    const canvas = ref.current
    // CPU-backed: the decoded sheet stays in memory and each step copies one view, so the compositor
    // uploads only this small canvas, never the whole sheet, and no GPU surface is set up mid-scroll.
    const ctx = canvas?.getContext('2d', { willReadFrequently: true })
    if (!canvas || !ctx) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let bitmap: ImageBitmap | undefined
    let tile = 0
    let wanted = 0
    let shown = -1
    let near = false
    let visible = false
    let raf = 0
    let timer = 0
    let alive = true
    const viewAt = (now: number) => reduced.matches ? 0 : Math.floor((((now / 1000) / spinRef.current + phase) % 1) * SHEET_VIEWS)
    const draw = (index: number) => {
      if (!bitmap) return
      shown = index
      const t = bitmap.width / SHEET_GRID
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(bitmap, (index % SHEET_GRID) * t, Math.floor(index / SHEET_GRID) * t, t, t, 0, 0, canvas.width, canvas.height)
    }
    const tick = (now: number) => {
      const index = viewAt(now)
      if (index !== shown) draw(index)
      raf = requestAnimationFrame(tick)
    }
    const sync = () => {
      cancelAnimationFrame(raf)
      raf = 0
      if (!bitmap) return
      if (visible && !reduced.matches) raf = requestAnimationFrame(tick)
      else draw(viewAt(performance.now()))
    }
    const decode = async () => {
      const size = wanted
      if (!near || size <= tile) return
      const next = await decodeSheet(sheet, size * SHEET_GRID)
      if (!alive || size <= tile) return next.close()
      bitmap?.close()
      bitmap = next
      tile = size
      sync()
    }
    const resize = new ResizeObserver(([entry]) => {
      const px = Math.round(entry.contentRect.width * devicePixelRatio)
      if (!px) return
      canvas.width = px
      canvas.height = px
      wanted = Math.min(px, view)
      sync()
      // Debounced, so dragging the size dial decodes once it settles.
      clearTimeout(timer)
      timer = window.setTimeout(() => void decode(), tile ? 200 : 0)
    })
    const ahead = new IntersectionObserver(([entry]) => {
      near = entry.isIntersecting
      if (near) void decode()
    }, { rootMargin: '900px 0px' })
    const onScreen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      sync()
    })
    resize.observe(canvas)
    ahead.observe(canvas)
    onScreen.observe(canvas)
    reduced.addEventListener('change', sync)
    return () => {
      alive = false
      cancelAnimationFrame(raf)
      clearTimeout(timer)
      resize.disconnect()
      ahead.disconnect()
      onScreen.disconnect()
      reduced.removeEventListener('change', sync)
      bitmap?.close()
    }
  }, [sheet, view, phase])
  return <canvas ref={ref} className="fs-turntable" />
}

function ProposalProducts({ spin, olive, picks }: { spin: number; olive: boolean; picks: ProductPicks }) {
  return <>
    {QUADRANTS.map(([place, key], i) => {
      const p = PROPOSAL_PRODUCTS[picks[key]]
      return p && <div key={place} className="fs-product" data-place={place} aria-label={p.label}>
        <Turntable sheet={olive && p.olive ? p.olive : p.sheet} view={p.view} spin={spin} phase={i * 0.37} />
      </div>
    })}
  </>
}

/**
 * The glimpse prototype (filo-phone-glimpse.html) running live on the photographed phone, under its
 * bezel: the island reads the tag, Open launches the App Clip, and it stops on the material's record.
 * It plays while in view and rewinds once fully off screen, so the next visit starts over.
 */
function Opportunity({ image, olive, speed, close, products }: { image: string; olive: boolean; speed: number; close: string; products: (ProductPicks & { spin: number }) | null }) {
  const photo = OPPORTUNITY_PHOTOS[image] ?? OPPORTUNITY_PHOTOS['Green swatches']
  const hostRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLIFrameElement>(null)
  const playback = useRef({ speed, close })
  useEffect(() => {
    playback.current = { speed, close }
    tellSpeed(frameRef.current, speed)
    tellClose(frameRef.current, close)
  }, [speed, close])
  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    // The stage is laid out in photo pixels; scale it to the frame's width.
    const resize = new ResizeObserver(([entry]) => {
      host.style.setProperty('--fs-opp-scale', String(entry.contentRect.width / OPPORTUNITY_PHOTO.width))
    })
    resize.observe(host)
    let visible = false
    const sync = () => tellFlow(frameRef.current, visible ? 'play' : 'pause')
    // The prototype says it's ready once its type has loaded; anything sent before that is dropped.
    const onMessage = (event: MessageEvent) => {
      if (event.source !== frameRef.current?.contentWindow || event.data?.filoAppFlow !== 'ready') return
      tellSpeed(frameRef.current, playback.current.speed)
      tellClose(frameRef.current, playback.current.close)
      sync()
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.intersectionRatio >= 0.15) { visible = true; sync() }
      else if (!entry.isIntersecting) { visible = false; tellFlow(frameRef.current, 'restart') }
    }, { threshold: [0, 0.15] })
    window.addEventListener('message', onMessage)
    observer.observe(host)
    return () => {
      resize.disconnect()
      observer.disconnect()
      window.removeEventListener('message', onMessage)
    }
  }, [])
  return <>
  <div className="fs-opp" ref={hostRef}>
    <div className="fs-opp-stage" style={{ width: OPPORTUNITY_PHOTO.width, height: OPPORTUNITY_PHOTO.height }}>
      <div className="fs-opp-screen" style={{ '--fs-opp-mask': `url(${photo.mask})` } as CSSProperties}>
        <div className="fs-opp-warp" style={{ width: SCREEN_BOX.width, height: SCREEN_BOX.height, transform: photo.warp }}>
          <iframe
            ref={frameRef}
            src={GLIMPSE.src}
            title="Filo App Clip: the tag is read and Bacterial Cellulose's material record opens."
            width={GLIMPSE.width}
            height={GLIMPSE.height}
            style={{ transform: `scale(${SCREEN_BOX.width / GLIMPSE.width}, ${SCREEN_BOX.height / GLIMPSE.height})` }}
            loading="lazy"
            tabIndex={-1}
          />
        </div>
      </div>
      <img className="fs-opp-phone" src={olive && photo.olive ? photo.olive : photo.phone} style={{ '--fs-opp-island': islandCut(photo.warp) } as CSSProperties} width={OPPORTUNITY_PHOTO.width} height={OPPORTUNITY_PHOTO.height} alt="" loading="lazy" decoding="async" draggable={false} />
    </div>
  </div>
  {products && <ProposalProducts spin={products.spin} olive={olive} picks={products} />}
  </>
}

/** A chapter title written on several lines, one entry per line; the trailing newline some titles
 *  end with adds no line. Each line is its own block, so phones can open a gap between sentences. */
const titleLines = (title: string) => title.replace(/\n+$/, '').split('\n')

/** Like Momo: play on entry, stop offscreen, restart from the first frame on return. */
function StoryFilm({ kind, label, children }: { kind: string; label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    const sync = () => {
      el.dataset.live = String(visible && !reduced.matches)
      el.dataset.paused = String(document.hidden)
    }
    const observer = new IntersectionObserver(([entry]) => {
      // Observe the visual, not the taller article, so mobile can always trigger playback.
      visible = entry.isIntersecting
      sync()
    }, { threshold: 0 })
    observer.observe(el)
    reduced.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    sync()
    return () => {
      observer.disconnect()
      reduced.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', sync)
    }
  }, [])
  return <div className={`fs-film fs-film--${kind}`} ref={ref} role="img" aria-label={label}>
    <div className="fs-stage" aria-hidden="true">{children}</div>
  </div>
}

export function FiloStory({ s, edit }: { s: FiloStorySettings; edit: (path: string) => (next: string) => void }) {
  const rows = [
    ['problem', s.problemLabel, s.problemTitle, s.problemBody,
      'A technical designer at her desk calls a supplier, sketches, sews a sample, checks a swatch and types up the result.', <FiloPersonaLoop key="gap" alt="" />],
    ['opportunity', s.opportunityLabel, s.opportunityTitle, s.opportunityBody,
      'A phone held over a Filo tag on fabric swatches plays the prototype: the tag is read and the material\'s record opens.', <Opportunity key="opportunity" image={s.proposalImage.image} olive={s.proposalImage.accent === 'Olive'} speed={s.proposalImage.speed} close={s.proposalImage.close} products={s.products.show ? s.products : null} />],
  ] as const
  return <section
    id="filo-story"
    data-section="story"
    className="case__section filo-story"
    aria-label="Market gap and proposal"
    style={{
      '--section-pad-top': `${s.spacing.top}px`,
      '--section-pad-bottom': `${s.spacing.bottom}px`,
      '--fs-chapter-gap': `${s.spacing.contentGap}px`,
      '--fs-copy-width': `${s.textWidth}px`,
      '--fs-gap-scale': s.gapImage.scale,
      '--fs-gap-x': `${s.gapImage.x}px`,
      '--fs-prop-scale': s.proposalImage.scale,
      '--fs-prop-x': `${s.proposalImage.x}px`,
      '--fs-prop-y': `${s.proposalImage.y}px`,
      '--fs-product-size': `${s.products.size}px`,
      '--fs-product-spread': `${s.products.spread}px`,
      '--fs-gap-y': `${s.gapImage.y}px`,
    } as CSSProperties}
  >
    {rows.map(([key, label, title, body, description, visual]) => <article
      className="fs-chapter"
      data-chapter={key}
      key={key}
      data-text-block
      data-text-reveal={s.textReveal.preset}
      style={{ '--text-reveal-duration': `${s.textReveal.duration}s`, '--text-reveal-stagger': `${s.textReveal.stagger}s` } as CSSProperties}
    >
      <div className="fs-copy" data-text-copy>
        <p className="eyebrow">{label}</p>
        {title.includes('\n')
          ? <h2 className="fs-lines">{titleLines(title).map((line, i, lines) => <EditableText
              as="span"
              className="fs-line"
              key={i}
              value={line}
              label={`${label} title, line ${i + 1}`}
              onChange={(next) => edit(`story.${key}Title`)(lines.map((l, j) => (j === i ? next : l)).join('\n'))}
            />)}</h2>
          : <EditableText as="h2" value={title} label={`${label} title`} onChange={edit(`story.${key}Title`)} />}
        <EditableText as="p" value={body} label={`${label} body`} onChange={edit(`story.${key}Body`)} />
      </div>
      <StoryFilm kind={key} label={description}>{visual}</StoryFilm>
    </article>)}
  </section>
}
