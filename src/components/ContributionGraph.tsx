/**
 * GitHub contribution graph for the last N months, from the build-time snapshot in
 * src/data/contributions.json (`npm run contributions`, also run before every build).
 * Columns are weeks (Sunday first), rows are weekdays, like GitHub's own calendar.
 *
 * Each day is a 3D patch of grass (grassField.ts): the more contributions, the taller it
 * grows. It sways in the wind, parts around the pointer, and names the hovered day.
 * Without WebGL2 it falls back to GitHub's flat tiles.
 */
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { SOCIAL } from '../data/contact'
import contributions from '../data/contributions.json'
import { useTuning } from '../tuning/useTuning'
import { buildBlades, buildTiles, fitView, GrassRenderer, project, toGround, type GrassDay, type Palette } from './grassField'
import './ContributionGraph.css'

type Tuple = [number, number, number, number]

const CONFIG = {
  show: true,
  /** How far back the graph reaches, ending at the latest snapshot day. */
  months: [4, 1, 12, 1] as Tuple,
  /** Graph width (px); it shrinks to fit narrower screens. */
  widthDesktop: [560, 200, 1200, 1] as Tuple,
  widthMobile: [340, 160, 700, 1] as Tuple,
  /** Space between the playground grid and the graph (px). */
  topGapDesktop: [40, 0, 240, 1] as Tuple,
  topGapMobile: [28, 0, 200, 1] as Tuple,
  /** Position nudge from where it sits (px); moves it without shifting anything else. */
  xDesktop: [0, -400, 400, 1] as Tuple,
  yDesktop: [0, -300, 300, 1] as Tuple,
  xMobile: [0, -200, 200, 1] as Tuple,
  yMobile: [0, -300, 300, 1] as Tuple,
  palette: { type: 'select' as const, options: ['green', 'mono'], default: 'green' },
  grass: {
    /** Height of the busiest day's grass, in tiles. */
    height: [1.3, 0.2, 3, 0.05] as Tuple,
    /** Blades per patch. */
    density: [36, 4, 96, 1] as Tuple,
    bladeWidth: [1, 0.3, 3, 0.05] as Tuple,
    /** Wind strength (lean and sway) and speed. */
    wind: [1, 0, 3, 0.05] as Tuple,
    flow: [1, 0, 3, 0.05] as Tuple,
    /** Camera angle above the ground (deg): low = side-on, 90 = straight down. */
    tilt: [52, 15, 89, 1] as Tuple,
    /** How far (tiles) and how hard the grass parts around the pointer. */
    pointerRadius: [1.6, 0.3, 5, 0.1] as Tuple,
    pointerPush: [1, 0, 3, 0.05] as Tuple,
    _collapsed: false,
  },
}

type Day = { date: string; level: number; count: number }

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const parse = (iso: string) => new Date(`${iso}T00:00:00Z`)
const NO_HOVER: [number, number] = [-99, -99]
const MOBILE = '(max-width: 640px)'

type Hover = { day: Day; x: number; y: number }

export function ContributionGraph() {
  const t = useTuning('Contributions', CONFIG)
  const { months } = t
  const g = t.grass

  const { weeks, total } = useMemo(() => {
    const days = contributions.days as Day[]
    const last = parse(days[days.length - 1].date)
    const from = new Date(last)
    from.setUTCMonth(from.getUTCMonth() - months)
    from.setUTCDate(from.getUTCDate() + 1)
    const start = from.toISOString().slice(0, 10)
    const shown = days.filter((d) => d.date >= start)

    // Days before the start in the first week stay as blank slots.
    const weeks: (Day | null)[][] = []
    for (const day of shown) {
      const dow = parse(day.date).getUTCDay()
      if (dow === 0 || weeks.length === 0) weeks.push(Array(7).fill(null))
      weeks[weeks.length - 1][dow] = day
    }
    return { weeks, total: shown.reduce((n, d) => n + d.count, 0) }
  }, [months])

  // Month label on the first week that starts in a new month.
  const labels = useMemo(() => {
    const labels = weeks.map((week, i) => {
      const first = week.find(Boolean)
      if (!first) return ''
      const m = parse(first.date).getUTCMonth()
      const prev = i > 0 ? weeks[i - 1].find(Boolean) : null
      return !prev || parse(prev.date).getUTCMonth() !== m ? MONTHS[m] : ''
    })
    // A partial first month would crowd the next label (GitHub drops it too).
    const second = labels.findIndex((label, i) => i > 0 && label)
    if (second > 0 && second < 3) labels[0] = ''
    return labels
  }, [weeks])

  const view = useMemo(() => fitView(weeks.length, g.tilt, g.height), [weeks.length, g.tilt, g.height])

  // Canvas size: the width dial, capped by the space the section gives it.
  const stageRef = useRef<HTMLDivElement>(null)
  const [room, setRoom] = useState(Infinity)
  const [mobile, setMobile] = useState(() => matchMedia(MOBILE).matches)
  useEffect(() => {
    const stage = stageRef.current?.parentElement
    if (!stage) return
    const observer = new ResizeObserver(() => setRoom(stage.clientWidth))
    observer.observe(stage)
    const query = matchMedia(MOBILE)
    const onQuery = () => setMobile(query.matches)
    query.addEventListener('change', onQuery)
    return () => {
      observer.disconnect()
      query.removeEventListener('change', onQuery)
    }
  }, [t.show])
  const width = Math.max(1, Math.min(mobile ? t.widthMobile : t.widthDesktop, room))
  const height = width / view.aspect

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<GrassRenderer | null>(null)
  const [flat, setFlat] = useState(false)
  const drawRef = useRef<() => void>(() => {})

  // Live values for the render loop, so dial moves never restart it.
  const live = useRef({ view, g, pointer: { x: 0, z: 0, strength: 0, target: 0, tx: 0, tz: 0 }, hover: NO_HOVER })
  live.current.view = view
  live.current.g = g

  const grassDays = useMemo<GrassDay[][]>(() => weeks.map((week) => week.map((d) => (d ? { count: d.count, level: d.level } : null))), [weeks])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !t.show) return
    let renderer: GrassRenderer
    try {
      renderer = new GrassRenderer(canvas)
    } catch {
      setFlat(true)
      return
    }
    rendererRef.current = renderer
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let visible = false
    let clock = 0
    let last = performance.now()

    const draw = () => {
      const { view, g, pointer, hover } = live.current
      renderer.draw(view, {
        time: clock,
        height: g.height,
        width: g.bladeWidth,
        wind: g.wind,
        radius: g.pointerRadius,
        push: g.pointerPush,
        pointer: [pointer.x, pointer.z, pointer.strength],
        hover,
      })
    }
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const { g, pointer } = live.current
      clock += dt * g.flow
      // Ease the pointer so the grass parts and settles instead of snapping.
      const ease = 1 - Math.exp(-dt * 10)
      pointer.x += (pointer.tx - pointer.x) * ease
      pointer.z += (pointer.tz - pointer.z) * ease
      pointer.strength += (pointer.target - pointer.strength) * (1 - Math.exp(-dt * 6))
      draw()
      frame = visible ? requestAnimationFrame(tick) : 0
    }
    // Reduced motion: no wind clock or easing; redraw only when something changes.
    drawRef.current = reduced
      ? () => {
          const { pointer } = live.current
          Object.assign(pointer, { x: pointer.tx, z: pointer.tz, strength: pointer.target })
          draw()
        }
      : () => {}

    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (reduced) return draw()
      if (visible && !frame) {
        last = performance.now()
        frame = requestAnimationFrame(tick)
      }
    })
    observer.observe(canvas)
    return () => {
      observer.disconnect()
      cancelAnimationFrame(frame)
      renderer.destroy()
      rendererRef.current = null
      drawRef.current = () => {}
    }
  }, [t.show])

  useEffect(() => {
    const renderer = rendererRef.current
    if (!renderer) return
    renderer.setPalette(t.palette as Palette)
    renderer.setTiles(buildTiles(grassDays))
    renderer.setBlades(buildBlades(grassDays, g.density))
    drawRef.current()
  }, [grassDays, g.density, t.palette, flat, t.show])

  // Backing store follows the CSS size at up to 2x pixel density.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = Math.round(width * dpr)
    canvas.height = Math.round(height * dpr)
    drawRef.current()
  }, [width, height])

  // Redraw in reduced motion when a dial changes the picture.
  useEffect(() => drawRef.current(), [view, g.bladeWidth, g.wind, g.pointerRadius, g.pointerPush])

  const [hover, setHover] = useState<Hover | null>(null)
  const onPointerMove = (event: PointerEvent<HTMLCanvasElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - rect.left
    const py = event.clientY - rect.top
    const ground = toGround(view, rect.width, rect.height, px, py)
    const { pointer } = live.current
    if (!ground) return
    pointer.tx = ground.x
    pointer.tz = ground.z
    if (pointer.target === 0) Object.assign(pointer, { x: ground.x, z: ground.z })
    pointer.target = 1
    const week = Math.round(ground.x)
    const row = Math.round(ground.z)
    const day = weeks[week]?.[row] ?? null
    live.current.hover = day ? [week, row] : NO_HOVER
    if (!day) setHover(null)
    else if (hover?.day !== day) {
      const top = project(view, rect.width, rect.height, week, g.height * 0.8, row)
      setHover({ day, x: top.x, y: top.y })
    }
    drawRef.current()
  }
  const onPointerLeave = () => {
    live.current.pointer.target = 0
    live.current.hover = NO_HOVER
    setHover(null)
    drawRef.current()
  }

  if (!t.show) return null

  const style = {
    '--cg-w': `${width}px`,
    '--cg-cell': `${width / weeks.length}px`,
    '--cg-top-d': `${t.topGapDesktop}px`,
    '--cg-top-m': `${t.topGapMobile}px`,
    '--cg-x-d': `${t.xDesktop}px`,
    '--cg-y-d': `${t.yDesktop}px`,
    '--cg-x-m': `${t.xMobile}px`,
    '--cg-y-m': `${t.yMobile}px`,
  } as CSSProperties

  const span = months === 1 ? 'month' : `${months} months`
  const describe = (d: Day) => `${d.count || 'No'} contribution${d.count === 1 ? '' : 's'} on ${parse(d.date).toLocaleString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' })}`

  return (
    <section className="cg" data-palette={t.palette} style={style} aria-labelledby="cg-title">
      <a id="cg-title" className="cg__title eyebrow" href={SOCIAL.github} target="_blank" rel="noopener">
        {total} contributions in the last {span}
      </a>
      <div ref={stageRef} className="cg__graph" role="img" aria-label={`${total} GitHub contributions in the last ${span}`}>
        {flat ? (
          <>
            <div className="cg__months" aria-hidden="true">
              {labels.map((label, i) => (
                <span key={i}>{label}</span>
              ))}
            </div>
            <div className="cg__weeks">
              {weeks.map((week, i) => (
                <div key={i} className="cg__week">
                  {week.map((day, d) => (day ? <span key={d} className="cg__day" data-level={day.level} title={describe(day)} /> : <span key={d} className="cg__day" data-empty />))}
                </div>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="cg__labels" aria-hidden="true" style={{ width }}>
              {labels.map((label, i) =>
                label ? (
                  <span key={i} style={{ left: project(view, width, height, i - 0.5, 0, -0.5).x }}>
                    {label}
                  </span>
                ) : null,
              )}
            </div>
            <div className="cg__stage" style={{ width, height }}>
              <canvas ref={canvasRef} className="cg__grass" onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} />
              {hover && (
                <span className="cg__tip" style={{ left: hover.x, top: hover.y }}>
                  {describe(hover.day)}
                </span>
              )}
            </div>
          </>
        )}
      </div>
    </section>
  )
}
