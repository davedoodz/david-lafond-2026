import { useEffect, useRef, type CSSProperties, type ReactNode } from 'react'
import { EditableText } from '../components/EditableText'
import { FiloPersonaLoop } from '../features/filoCase/FiloPersonaLoop'
import type { Story } from './caseStudyFlows'
import type { TextReveal } from './caseStudyContent'
import { SHEET_GRID, SHEET_VIEWS, decodeSheet } from '../features/filoCase/turntableSheets'
import './filoStoryArt.css'

type StoryCopy = Pick<Story, 'problemLabel' | 'problemTitle' | 'problemBody' | 'opportunityLabel' | 'opportunityTitle' | 'opportunityBody' | 'spacing' | 'textWidth'>
export type FiloStorySettings = StoryCopy & {
  textReveal: TextReveal
  gapImage: { scale: number; x: number; y: number }
  proposalImage: { image: string; accent: string; scale: number; x: number; y: number }
  products: { show: boolean; size: number; spread: number; spin: number }
}

/** The 1127 × 1396 photos of a phone over the Filo tag and swatches; their screens were blue, now transparent. */
const OPPORTUNITY_PHOTO = { width: 1127, height: 1396 }
/** The screen inside the bezel of the 920 × 1844 phone films (studio 'phone' crop at 2×). */
const FILM_SCREEN = { x: 65, y: 63, width: 792, height: 1715 }
/**
 * Per photo (DialKit › story › proposalImage › image): the keyed photo, its screen mask, and the warp
 * projecting FILM_SCREEN onto its screen. Each warp is fitted to the four straight edges of that photo's
 * blue screen and pushed 3px past them, so the bezel hides the seam and no gap can show at the edges.
 * Both photos' Dynamic Islands land within 5px of the film's.
 */
/** `olive`: the same photo with its orange swatch recoloured olive (DialKit › story › proposalImage › accent). */
const OPPORTUNITY_PHOTOS: Record<string, { phone: string; olive?: string; mask: string; warp: string }> = {
  'Green swatches': {
    phone: '/work/filo/story/opportunity-phone.webp',
    mask: '/work/filo/story/opportunity-screen-mask.webp',
    warp: 'matrix3d(0.518932, -0.113517, 0, 2.29135e-06, 0.174382, 0.315426, 0, -5.46061e-05, 0, 0, 1, 0, 239.982, 103.016, 0, 1)',
  },
  'Orange swatches': {
    phone: '/work/filo/story/opportunity-phone-2.webp',
    olive: '/work/filo/story/opportunity-phone-2-olive.webp',
    mask: '/work/filo/story/opportunity-screen-mask-2.webp',
    warp: 'matrix3d(0.521914, -0.111371, 0, 9.46491e-06, 0.174494, 0.318496, 0, -5.03511e-05, 0, 0, 1, 0, 239.6, 100.902, 0, 1)',
  },
}

/** Products made with new materials, turning beside the proposal image. Each sheet is 36 transparent
    views in a 6 × 6 grid, row by row; `view` is the sheet's own px per view; `olive` is the sheet recoloured
    for the olive accent. */
const PROPOSAL_PRODUCTS = [
  { place: 'top-left', label: 'Xtep windbreaker in PLA', sheet: '/work/filo/sprites-hd/xtep-pla-windbreaker-spritesheet.webp', olive: '/work/filo/sprites-hd/xtep-pla-windbreaker-olive-spritesheet.webp', view: 768 },
  { place: 'bottom-left', label: 'Zara tote in Piñatex', sheet: '/work/filo/sprites-hd/zara-pinatex-bag-spritesheet.webp', view: 768 },
  { place: 'top-right', label: 'The North Face puffer', sheet: '/work/filo/sprites-hd/northface-spritesheet.webp', view: 768 },
  { place: 'bottom-right', label: 'Nike Happy Pineapple sneaker in Piñatex', sheet: '/work/filo/sprites/nike-partners-with-pinatex-for-happy-pineapple-plant-based-sneaker-collection-spritesheet.webp', view: 256 },
] as const

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

function ProposalProducts({ spin, olive }: { spin: number; olive: boolean }) {
  return <>
    {PROPOSAL_PRODUCTS.map((p, i) => <div key={p.place} className="fs-product" data-place={p.place}>
      <Turntable sheet={olive && 'olive' in p ? p.olive : p.sheet} view={p.view} spin={spin} phase={i * 0.37} />
    </div>)}
  </>
}

/** The tag-to-record prototype (flow-04) playing on the photographed phone, under its bezel. */
function Opportunity({ image, olive, productSpin }: { image: string; olive: boolean; productSpin: number | null }) {
  const photo = OPPORTUNITY_PHOTOS[image] ?? OPPORTUNITY_PHOTOS['Green swatches']
  const hostRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const host = hostRef.current
    const video = videoRef.current
    if (!host || !video) return
    // The stage is laid out in photo pixels; scale it to the frame's width.
    const resize = new ResizeObserver(([entry]) => {
      host.style.setProperty('--fs-opp-scale', String(entry.contentRect.width / OPPORTUNITY_PHOTO.width))
    })
    resize.observe(host)
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let visible = false
    const sync = () => {
      if (!visible || reduced.matches || document.hidden) return video.pause()
      if (video.dataset.loaded !== 'true') {
        video.querySelectorAll('source').forEach((source) => { source.src = source.dataset.src ?? '' })
        video.dataset.loaded = 'true'
        video.load()
      }
      // A browser can deny autoplay; the poster frame stays visible in that case.
      void video.play().catch(() => {})
    }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync() }, { threshold: 0.15 })
    observer.observe(host)
    reduced.addEventListener('change', sync)
    document.addEventListener('visibilitychange', sync)
    return () => {
      resize.disconnect()
      observer.disconnect()
      reduced.removeEventListener('change', sync)
      document.removeEventListener('visibilitychange', sync)
      video.pause()
    }
  }, [])
  return <>
  <div className="fs-opp" ref={hostRef}>
    <div className="fs-opp-stage" style={{ width: OPPORTUNITY_PHOTO.width, height: OPPORTUNITY_PHOTO.height }}>
      <div className="fs-opp-screen" style={{ '--fs-opp-mask': `url(${photo.mask})` } as CSSProperties}>
        <div className="fs-opp-warp" style={{ width: FILM_SCREEN.width, height: FILM_SCREEN.height, transform: photo.warp }}>
          <video ref={videoRef} width={920} height={1844} style={{ left: -FILM_SCREEN.x, top: -FILM_SCREEN.y }} poster="/work/filo/films/flow-04.webp" muted loop playsInline preload="none" disablePictureInPicture>
            <source data-src="/work/filo/films/flow-04.mov" type={'video/quicktime; codecs="hvc1"'} />
            <source data-src="/work/filo/films/flow-04.webm" type="video/webm" />
          </video>
        </div>
      </div>
      <img className="fs-opp-phone" src={olive && photo.olive ? photo.olive : photo.phone} width={OPPORTUNITY_PHOTO.width} height={OPPORTUNITY_PHOTO.height} alt="" loading="lazy" decoding="async" draggable={false} />
    </div>
  </div>
  {productSpin !== null && <ProposalProducts spin={productSpin} olive={olive} />}
  </>
}

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
      'A phone held over a Filo tag on fabric swatches plays the prototype: tap the sample and its Technical File opens.', <Opportunity key="opportunity" image={s.proposalImage.image} olive={s.proposalImage.accent === 'Olive'} productSpin={s.products.show ? s.products.spin : null} />],
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
        <EditableText as="h2" className={title.includes('\n') ? 'fs-lines' : undefined} value={title} label={`${label} title`} onChange={edit(`story.${key}Title`)} />
        <EditableText as="p" value={body} label={`${label} body`} onChange={edit(`story.${key}Body`)} />
      </div>
      <StoryFilm kind={key} label={description}>{visual}</StoryFilm>
    </article>)}
  </section>
}
