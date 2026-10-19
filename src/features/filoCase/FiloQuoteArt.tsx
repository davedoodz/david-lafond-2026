import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import { useTuning } from '../../tuning/useTuning'
import './filoQuoteArt.css'

type Tuple = [number, number, number, number]

/** Dials for one card's illustration; scale and x/y adjust it from its base spot (see ART). */
const placement = () => ({
  /** Size, from the art's bottom-right corner (1 = base size). */
  scale: [1, 0.3, 2.5, 0.01] as Tuple,
  /** Move from the base spot (px): positive x goes right, positive y goes down. */
  x: [0, -400, 300, 1] as Tuple,
  y: [0, -250, 200, 1] as Tuple,
  opacity: [1, 0, 1, 0.01] as Tuple,
})

const CONFIG = {
  /** The whole sliding strip: cards, text, art and shadow scale together, and the page reflows. */
  strip: {
    /** Off freezes the marquee where it is; on resumes it from there. */
    play: true,
    scale: [1, 0.5, 1.6, 0.01] as Tuple,
    /** Marquee speed: 1 is the base pace, 2 twice as fast, 0.5 half as fast. */
    speed: [1, 0.2, 4, 0.05] as Tuple,
  },
  /** Shared by every Filo quote card, so they are all the same size. */
  card: {
    width: [640, 420, 900, 1] as Tuple,
    height: [260, 160, 420, 1] as Tuple,
    /** Space between neighbouring cards (px). */
    gap: [16, 0, 120, 1] as Tuple,
    /** Text column (% of the card); the art lives in the rest. */
    text: [54, 35, 80, 1] as Tuple,
    /** Phones (≤720 px): the art sits under the text, so the card is taller. */
    mobileHeight: [400, 240, 600, 1] as Tuple,
    /** Card fill: the warm off-white of the card mockups. */
    fill: { type: 'color' as const, default: '#FBF8F6' },
    /** Quote and role typeface: the case study's Beatrice, or Inter (Inter has no italic, so the quote's slant is synthesized). */
    font: { type: 'select' as const, options: ['Beatrice', 'Inter'], default: 'Beatrice' },
  },
  /**
   * Quote text on every card. Defaults are the current look. Inter is variable (any weight);
   * Beatrice ships 400 and 500 only, so with it weights snap to the nearest of those.
   */
  quoteType: {
    /** Font size (px). Phones (≤640 px) have their own, as the site's body size drops there. */
    size: [22, 12, 40, 0.5] as Tuple,
    sizeMobile: [15.4, 10, 30, 0.1] as Tuple,
    weight: [400, 300, 700, 10] as Tuple,
    /** Letter spacing (px; negative = tighter). */
    spacing: [-0.64, -3, 3, 0.02] as Tuple,
    lineHeight: [1.3, 0.9, 2, 0.01] as Tuple,
  },
  /** Drop shadow under every card. The strip clips its overflow, so it gets room for the shadow. */
  shadow: {
    show: true,
    /** Small drop and little tuck, so the shadow shows above and beside the card as well as below. */
    y: [8, 0, 60, 1] as Tuple,
    blur: [40, 0, 120, 1] as Tuple,
    spread: [-8, -60, 20, 1] as Tuple,
    opacity: [0.2, 0, 0.6, 0.01] as Tuple,
    color: { type: 'color' as const, default: '#171717' },
  },
  /** Shows each card as a thick tag: a solid edge under the face, in a darker shade of the card fill. */
  thickness: {
    show: false,
    /** Edge depth (px) before the strip's scale. */
    depth: [6, 1, 16, 1] as Tuple,
    /** How much darker the edge is than the face (%). */
    shade: [14, 4, 40, 1] as Tuple,
  },
  'Technical designer, BlueSTEM': placement(),
  'Sourcing lead, Gap': placement(),
  'Product lead, O’Neill': placement(),
  'Merchandiser, Calvin Klein': placement(),
}
type Card = Exclude<keyof typeof CONFIG, 'strip' | 'card' | 'quoteType' | 'shadow' | 'thickness'>

/**
 * The card's box-shadow: with thickness on, a stack of 1px hard shadows forms the tag's edge, darker
 * toward the bottom and following the card's rounded corners, with a light catch on the top edge;
 * the drop shadow then falls from the bottom of that edge.
 */
function cardShadow(drop: { show: boolean; y: number; blur: number; spread: number; color: string; opacity: number }, thick: { show: boolean; depth: number; shade: number }) {
  const depth = thick.show ? thick.depth : 0
  const layers: string[] = []
  if (thick.show) {
    layers.push('inset 0 1px 0 rgb(255 255 255 / .7)')
    for (let i = 1; i <= depth; i++) {
      const dark = thick.shade * (0.6 + 0.4 * (i / depth))
      layers.push(`0 ${i}px 0 color-mix(in srgb, var(--qa-card-fill, #fbf8f6) ${(100 - dark).toFixed(1)}%, #5f5446)`)
    }
  }
  if (drop.show) layers.push(`0 ${drop.y + depth}px ${drop.blur}px ${drop.spread}px ${rgba(drop.color, drop.opacity)}`)
  return { shadow: layers.length ? layers.join(', ') : 'none', depth }
}

/** `#rrggbb` + opacity → `rgb(r g b / a)`. */
function rgba(hex: string, alpha: number) {
  const n = Number.parseInt(hex.replace('#', '').slice(0, 6), 16)
  return `rgb(${(n >> 16) & 255} ${(n >> 8) & 255} ${n & 255} / ${alpha})`
}

/**
 * Persona quote index → illustration (trimmed, transparent). `base` is where it sits at scale 1, x/y 0:
 * width as % of the card, inset (px) from the card's right and bottom edges.
 */
type Art = { card: Card; src: string; width: number; height: number; base: { width: number; right: number; bottom: number } }
const ART: Partial<Record<number, Art>> = {
  0: { card: 'Technical designer, BlueSTEM', src: '/work/filo/studio/quote-art-technical-designer.webp', width: 900, height: 672, base: { width: 46, right: 16, bottom: 10 } },
  1: { card: 'Sourcing lead, Gap', src: '/work/filo/studio/quote-art-designer.webp', width: 900, height: 543, base: { width: 48, right: 16, bottom: 12 } },
  2: { card: 'Product lead, O’Neill', src: '/work/filo/studio/quote-art-product-lead.webp', width: 900, height: 522, base: { width: 46, right: 16, bottom: 12 } },
  3: { card: 'Merchandiser, Calvin Klein', src: '/work/filo/studio/quote-art-merchandiser.webp', width: 900, height: 453, base: { width: 52, right: 14, bottom: 18 } },
}

/**
 * Lays out a Filo persona quote card as a wide card: quote on the left, illustration bottom-right.
 * Rendered for every card (an empty marker for cards without art) so all cards share one size.
 */
export function FiloQuoteArt({ index }: { index: number }) {
  const dials = useTuning('Filo quote art', CONFIG)
  const markerRef = useRef<HTMLSpanElement & HTMLImageElement>(null)
  const { width, height, gap, text, mobileHeight, fill, font } = dials.card
  const { size: quoteSize, sizeMobile: quoteSizeMobile, weight: quoteWeight, spacing: quoteSpacing, lineHeight: quoteLineHeight } = dials.quoteType
  const s = dials.shadow
  const { shadow, depth } = cardShadow(s, dials.thickness)
  const { scale: stripScale, play, speed } = dials.strip
  // Room the clipped strip needs above and below the cards so the (scaled) shadow is not cut off.
  const shadowPad = (s.show ? Math.max(0, s.y + depth + s.blur + s.spread) : depth) * stripScale

  // The card's dials go on the card itself (this element's parent).
  useLayoutEffect(() => {
    const card = markerRef.current?.parentElement
    if (!card) return
    card.dataset.filoQuote = ''
    card.style.setProperty('--qa-card-w', `${width}px`)
    card.style.setProperty('--qa-card-h', `${height}px`)
    card.style.setProperty('--qa-card-h-m', `${mobileHeight}px`)
    card.style.setProperty('--qa-text', `${text}%`)
    card.style.setProperty('--qa-card-fill', fill)
    card.dataset.qaFont = font
    card.style.setProperty('--qa-quote-size', `${quoteSize}px`)
    card.style.setProperty('--qa-quote-size-m', `${quoteSizeMobile}px`)
    card.style.setProperty('--qa-quote-weight', `${quoteWeight}`)
    card.style.setProperty('--qa-quote-spacing', `${quoteSpacing}px`)
    card.style.setProperty('--qa-quote-leading', `${quoteLineHeight}`)
    card.style.setProperty('--qa-card-shadow', shadow)
    const strip = card.closest<HTMLElement>('.persona__quotes')
    strip?.style.setProperty('--qa-shadow-pad', `${shadowPad}px`)
    strip?.style.setProperty('--qa-strip-scale', `${stripScale}`)
    strip?.style.setProperty('--qa-speed', `${speed}`)
    strip?.style.setProperty('--qa-gap', `${gap}px`)
    strip?.toggleAttribute('data-qa-paused', !play)
  }, [width, height, gap, text, mobileHeight, fill, font, quoteSize, quoteSizeMobile, quoteWeight, quoteSpacing, quoteLineHeight, shadow, shadowPad, stripScale, play, speed])

  const art = ART[index]
  if (!art) return <span ref={markerRef} hidden />
  const t = dials[art.card]
  return (
    <img
      ref={markerRef}
      className="filo-quote-art"
      src={art.src}
      width={art.width}
      height={art.height}
      alt=""
      aria-hidden="true"
      decoding="async"
      draggable={false}
      style={
        {
          '--qa-w': `${art.base.width}%`,
          '--qa-right': `${art.base.right}px`,
          '--qa-bottom': `${art.base.bottom}px`,
          '--qa-scale': t.scale,
          '--qa-x': `${t.x}px`,
          '--qa-y': `${t.y}px`,
          '--qa-opacity': t.opacity,
        } as CSSProperties
      }
    />
  )
}
