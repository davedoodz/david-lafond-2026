import { useId, useLayoutEffect, useRef, type CSSProperties } from 'react'

/**
 * The Filo mark (Loop f, public/work/filo/filo-mark.webp) drawn in as with a fountain pen when the case
 * study opens (studio/filo-logo-variations.html, 01 Fountain pen, at 2×). The real mark is revealed
 * through a mask of round-capped pen strokes along its centre lines, so the last frame is the logo
 * itself. A small round nib, cut to the logo's shape, rides the front of the ink.
 *
 * Pen order: stroke 0 is one movement (hook, stem, loop, bar and i); its second piece is the stem's
 * crossing of the bar line, clipped to the stem until the pen reaches the bar so no bar shows early.
 * Then the l, then the o.
 */
const PIECES = [
  { stroke: 0, d: 'M 520 74 C 506 46 486 35 452 35 C 410 35 382 56 356 92 C 340 115 322 142 306 168' },
  { stroke: 0, clip: true, d: 'M 306 168 C 294 188 282 210 270 232 C 259 253 247 273 236 292' },
  { stroke: 0, d: 'M 236 292 C 222 318 205 346 188 372 C 164 408 140 438 100 438 C 60 438 33 410 33 360 C 33 300 80 254 140 238 C 165 232 190 229 214 228' },
  { stroke: 0, bar: true, d: 'M 214 228 L 486 228 C 504 228 512 238 512 256 L 512 440' },
  { stroke: 1, d: 'M 604 22 L 604 392 C 604 424 622 438 652 438 L 694 438' },
  { stroke: 2, d: 'M 912 232 C 890 206 860 196 828 196 C 762 196 708 250 708 318 C 708 386 762 437 828 437 C 894 437 947 386 947 318 C 947 284 936 256 912 232' },
]
const STEM = '283,150 334.4,150 252.8,300 205,300'
const SRC = '/work/filo/filo-mark.webp'
/** Pen pace (px of route per ms): the studio's 1.0 at 3×. */
const SPEED = 3
/** Pause where the pen lifts between letters (ms), and before it lands (ms). */
const LIFT = 53
const START = 200
/** Nib radius: inside the stroke's half width, so at the crossing it stays within the stem. */
const NIB = 17

type Piece = { path: SVGPathElement; len: number; start: number; clip: boolean; bar: boolean }
type Stroke = { pieces: Piece[]; len: number; s: number[]; t: number[]; dur: number; begin: number }

// Eased where the pen lands and lifts: slower over the first and last 50px.
const ramp = (s: number, len: number) => Math.min(1, 0.3 + (0.7 * s) / 50) * Math.min(1, 0.3 + (0.7 * (len - s)) / 50)

export function FiloMarkDraw({ className, style }: { className?: string; style?: CSSProperties }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const svgRef = useRef<SVGSVGElement>(null)

  useLayoutEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const paths = Array.from(svg.querySelectorAll<SVGPathElement>('[data-piece]'))
    const nibs = Array.from(svg.querySelectorAll<SVGCircleElement>('[data-nib]'))
    const strokes: Stroke[] = []
    paths.forEach((path, i) => {
      const p = PIECES[i]
      const s = (strokes[p.stroke] ??= { pieces: [], len: 0, s: [], t: [], dur: 0, begin: 0 })
      const len = path.getTotalLength()
      s.pieces.push({ path, len, start: s.len, clip: !!p.clip, bar: !!p.bar })
      s.len += len
    })
    const pieceAt = (s: Stroke, at: number) => s.pieces.find((p) => at <= p.start + p.len) ?? s.pieces[s.pieces.length - 1]
    // Time → distance along each stroke, sampled every 4px at the eased pace.
    let begin = START
    for (const s of strokes) {
      for (let at = 0; ; at = Math.min(s.len, at + 4)) {
        if (s.s.length) s.t.push(s.t[s.t.length - 1] + (at - s.s[s.s.length - 1]) / (SPEED * ((ramp(at, s.len) + ramp(s.s[s.s.length - 1], s.len)) / 2)))
        else s.t.push(0)
        s.s.push(at)
        if (at >= s.len) break
      }
      s.dur = s.t[s.t.length - 1]
      s.begin = begin
      begin += s.dur + LIFT
    }
    const total = begin - LIFT
    const distance = (s: Stroke, t: number) => {
      if (t <= 0) return 0
      if (t >= s.dur) return s.len
      let lo = 0
      let hi = s.t.length - 1
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1
        if (s.t[mid] <= t) lo = mid
        else hi = mid
      }
      return s.s[lo] + ((t - s.t[lo]) / (s.t[hi] - s.t[lo])) * (s.s[hi] - s.s[lo])
    }

    const finish = () => {
      for (const s of strokes)
        for (const p of s.pieces) {
          p.path.removeAttribute('style')
          p.path.removeAttribute('clip-path')
        }
      for (const n of nibs) n.setAttribute('r', '0')
    }
    const render = (t: number) => {
      strokes.forEach((s, k) => {
        const local = t - s.begin
        const drawn = distance(s, local)
        for (const p of s.pieces) {
          const shown = Math.min(p.len, Math.max(0, drawn - p.start))
          p.path.style.strokeDasharray = `${p.len} ${p.len + 10}`
          p.path.style.strokeDashoffset = `${p.len - shown}`
          // A piece the pen hasn't reached hides its round cap too.
          p.path.style.visibility = shown > 0 ? 'visible' : 'hidden'
          if (p.clip) {
            const bar = s.pieces.find((q) => q.bar)
            if (bar && drawn > bar.start) p.path.removeAttribute('clip-path')
            else p.path.setAttribute('clip-path', `url(#${id}-stem)`)
          }
        }
        // The nib lands, rides the front of the ink, then lifts.
        const grow = Math.min(1, Math.max(0, local / 40)) * Math.min(1, Math.max(0, (s.dur + 47 - local) / 47))
        const nib = nibs[k]
        if (grow <= 0) return nib.setAttribute('r', '0')
        const piece = pieceAt(s, drawn)
        const pt = piece.path.getPointAtLength(Math.max(0, Math.min(piece.len, drawn - piece.start)))
        nib.setAttribute('cx', pt.x.toFixed(2))
        nib.setAttribute('cy', pt.y.toFixed(2))
        nib.setAttribute('r', (NIB * grow).toFixed(2))
      })
    }

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return finish()
    // Hidden before the first paint, so the finished mark never flashes ahead of the pen.
    render(0)
    let frame = 0
    let t0 = 0
    const tick = (now: number) => {
      t0 ||= now
      const t = now - t0
      if (t >= total) return finish()
      render(t)
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(frame)
      finish()
    }
  }, [id])

  return (
    <svg
      ref={svgRef}
      className={className}
      style={{ aspectRatio: '990 / 466', overflow: 'visible', ...style }}
      viewBox="0 0 990 466"
      width={990}
      height={466}
      aria-hidden="true"
    >
      <defs>
        <clipPath id={`${id}-stem`} clipPathUnits="userSpaceOnUse">
          <polygon points={STEM} />
        </clipPath>
        <mask id={`${id}-pen`} maskUnits="userSpaceOnUse" x={-40} y={-40} width={1070} height={546}>
          <g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth={64}>
            {PIECES.map((p, i) => (
              <path key={i} data-piece="" d={p.d} />
            ))}
          </g>
        </mask>
        <mask id={`${id}-shape`} maskUnits="userSpaceOnUse" x={0} y={0} width={990} height={466} style={{ maskType: 'alpha' }}>
          <image href={SRC} width={990} height={466} />
        </mask>
      </defs>
      <image href={SRC} width={990} height={466} mask={`url(#${id}-pen)`} />
      <g mask={`url(#${id}-shape)`}>
        {[0, 1, 2].map((k) => (
          <circle key={k} data-nib="" r={0} fill="#000" />
        ))}
      </g>
    </svg>
  )
}
