/**
 * Entrance for the spread grid: every spread arrives as if it came out of the physical
 * book (cover first, back cover last). Web Animations only, no layout changes; spreads
 * below the fold are left alone so nothing pops in late while scrolling.
 */
/** Hover looks for a grid spread; styled in book.css under `[data-hover]`. */
export const GRID_HOVERS = ['none', 'lift', 'float', 'press', 'tilt', 'fold', 'peel'] as const

export const GRID_ENTRANCES = ['none', 'open', 'turn', 'deal', 'lay', 'fan'] as const
export type GridEntrance = (typeof GRID_ENTRANCES)[number]

export type GridEntranceValues = {
  preset: string
  /** One spread's animation (ms). */
  duration: number
  /** Delay between consecutive spreads (ms). */
  stagger: number
  /** Deal / lay / fan: how far and how tilted spreads travel (1 = default). */
  distance: number
  /** 3D depth for open / turn (px; lower = stronger perspective). */
  perspective: number
}

const EASE = 'cubic-bezier(0.22, 1, 0.36, 1)'
const SOFT = 'cubic-bezier(0.33, 1, 0.68, 1)'

/** Deterministic -1..1 jitter per spread. */
const jitter = (i: number, salt: number) => {
  const s = Math.sin(i * 91.7 + salt * 13.3) * 43758.5453
  return (s - Math.floor(s)) * 2 - 1
}

export function playGridEntrance(root: HTMLElement, v: GridEntranceValues): Animation[] {
  if (v.preset === 'none' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return []
  const cards = [...root.querySelectorAll<HTMLElement>('.spread-grid__pages')]
  const fold = window.innerHeight * 1.1
  const shown = cards.filter((card) => card.getBoundingClientRect().top < fold)
  if (!shown.length) return []
  const cover = shown[0].getBoundingClientRect()
  const d = v.distance
  const animations: Animation[] = []
  const run = (el: Element, keyframes: Keyframe[], delay: number, easing = EASE, duration = v.duration) =>
    animations.push(el.animate(keyframes, { duration, delay, easing, fill: 'backwards' }))

  // Pages stay fully opaque: a spread is hidden until its turn, then appears solid at once.
  const appear = (el: Element, delay: number) => run(el, [{ opacity: 0 }, { opacity: 1 }], delay, 'steps(1, start)', 1)

  shown.forEach((card, i) => {
    const delay = i * v.stagger
    const rect = card.getBoundingClientRect()
    const pages = [...card.querySelectorAll('img')]
    const side = card.parentElement?.dataset.side
    const persp = `perspective(${v.perspective}px)`

    switch (v.preset) {
      case 'open': {
        // Each spread starts shut on its spine and opens flat. Its drop shadow grows with the
        // pages, so there is never a dark box under pages that are still edge-on.
        appear(card, delay)
        run(card, [{ boxShadow: '0 18px 34px -8px rgb(0 0 0 / 0)' }, { boxShadow: getComputedStyle(card).boxShadow }], delay)
        if (side === 'front') run(pages[0], [{ transformOrigin: 'left center', transform: `${persp} rotateY(-100deg)` }, { transformOrigin: 'left center', transform: `${persp} rotateY(0deg)` }], delay)
        else if (side === 'back') run(pages[0], [{ transformOrigin: 'right center', transform: `${persp} rotateY(100deg)` }, { transformOrigin: 'right center', transform: `${persp} rotateY(0deg)` }], delay)
        else {
          run(pages[0], [{ transformOrigin: 'right center', transform: `${persp} rotateY(90deg)` }, { transformOrigin: 'right center', transform: `${persp} rotateY(0deg)` }], delay)
          run(pages[1], [{ transformOrigin: 'left center', transform: `${persp} rotateY(-90deg)` }, { transformOrigin: 'left center', transform: `${persp} rotateY(0deg)` }], delay)
        }
        break
      }
      case 'turn': {
        // The right page is there; the left page turns over onto it from the right, like reading.
        appear(card, delay)
        run(card, [{ transform: 'translateY(8px)' }, { transform: 'none' }], delay, SOFT, v.duration * 0.45)
        const leaf = side === 'back' ? pages[0] : side === 'front' ? null : pages[0]
        if (leaf) {
          run(
            leaf,
            [
              { transformOrigin: 'right center', transform: `${persp} rotateY(180deg)`, opacity: 0 },
              { transformOrigin: 'right center', transform: `${persp} rotateY(91deg)`, opacity: 0, offset: 0.45 },
              { transformOrigin: 'right center', transform: `${persp} rotateY(89deg)`, opacity: 1, offset: 0.46 },
              { transformOrigin: 'right center', transform: `${persp} rotateY(0deg)` },
            ],
            delay + v.duration * 0.2,
            'cubic-bezier(0.45, 0, 0.2, 1)',
          )
        }
        break
      }
      case 'deal': {
        // Dealt off the closed book (the cover's spot): folded to one page, flown to its slot.
        const dx = cover.left + cover.width / 2 - (rect.left + rect.width / 2)
        const dy = cover.top + cover.height / 2 - (rect.top + rect.height / 2)
        const sx = cover.width / rect.width
        const sy = cover.height / rect.height
        const tilt = jitter(i, 1) * 6 * d
        run(card, [
          { transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy}) rotate(${tilt}deg)` },
          { transform: 'none' },
        ], i === 0 ? 0 : delay)
        if (i > 0) appear(card, delay)
        break
      }
      case 'lay': {
        // Set down on the table: lifted, slightly skewed, then pressed flat with its shadow.
        run(card, [
          { transform: `translateY(${-28 * d}px) scale(1.06) rotate(${jitter(i, 2) * 2.5 * d}deg)`, boxShadow: '0 50px 70px -10px rgb(0 0 0 / 0.75)' },
          { transform: 'none', boxShadow: getComputedStyle(card).boxShadow },
        ], delay)
        appear(card, delay)
        break
      }
      case 'fan': {
        // Fanned out from the book's spine like riffling pages, settling into rows.
        const dx = cover.left - (rect.left + rect.width / 2)
        const dy = cover.top + cover.height - (rect.top + rect.height)
        const angle = (-20 + (i / Math.max(1, shown.length - 1)) * 40) * d
        run(card, [
          { transformOrigin: '50% 100%', transform: `translate(${dx * 0.6}px, ${dy * 0.6}px) rotate(${angle}deg) scale(0.6)` },
          { transformOrigin: '50% 100%', transform: 'none' },
        ], delay)
        appear(card, delay)
        break
      }
    }
  })
  // Hold every spread at its hidden first frame until the visible thumbnails have decoded,
  // so pages never open onto blank (still-loading) rectangles. Capped so it never stalls.
  animations.forEach((animation) => animation.pause())
  const images = shown.flatMap((card) => [...card.querySelectorAll('img')])
  images.forEach((img) => (img.loading = 'eager'))
  const decoded = Promise.all(images.map((img) => img.decode().catch(() => undefined)))
  const cap = new Promise((resolve) => setTimeout(resolve, 1200))
  void Promise.race([decoded, cap]).then(() => animations.forEach((animation) => animation.playState === 'paused' && animation.play()))
  return animations
}
