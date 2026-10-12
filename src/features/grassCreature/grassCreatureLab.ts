/**
 * Studio page (studio/grass-pokemon.html): the About page's contribution-graph grass on its own,
 * bigger, with the creature (scene.ts) and its DialKit panel. Same renderer, same saved dial
 * values and same creature as the site; this page adds a Space key pause and a "Paused" label.
 */
import '../../styles/global.css'
import contributions from '../../data/contributions.json'
import tuning from '../../data/tuning.json'
import { buildBlades, buildTiles, fitView, GrassRenderer, project, toGround, type GrassDay } from '../../components/grassField'
import { resolveStatic } from '../../tuning/useTuning'
import { CREATURE_CONFIG } from './config'
import { mountDials } from './GrassCreatureDials'
import { CreatureScene, type GrassPointer } from './scene'

type Day = { date: string; level: number; count: number }

const MONTHS_SHOWN = 4
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const g = tuning.Contributions.grass
const parse = (iso: string) => new Date(`${iso}T00:00:00Z`)

// Same calendar as ContributionGraph: weeks are columns (Sunday first), rows are weekdays.
const days = contributions.days as Day[]
const byDate = new Map(days.map((d) => [d.date, d]))
const snapshotDay = parse(days[days.length - 1].date)
const weeks: (Day | null)[][] = []
for (const d = new Date(Date.UTC(snapshotDay.getUTCFullYear(), snapshotDay.getUTCMonth() - MONTHS_SHOWN + 1, 1)); d <= snapshotDay; d.setUTCDate(d.getUTCDate() + 1)) {
  const date = d.toISOString().slice(0, 10)
  const day = byDate.get(date) ?? { date, level: 0, count: 0 }
  if (d.getUTCDay() === 0 || weeks.length === 0) weeks.push(Array(7).fill(null))
  weeks[weeks.length - 1][d.getUTCDay()] = day
}
const grassDays: GrassDay[][] = weeks.map((week) => week.map((d) => (d ? { count: d.count, level: d.level } : null)))
const view = fitView(weeks.length, g.tilt, g.height)

// ---------- DOM ----------

const labelsEl = document.querySelector<HTMLDivElement>('.cg__labels')!
const stageEl = document.querySelector<HTMLDivElement>('.cg__stage')!
const canvas = document.querySelector<HTMLCanvasElement>('.cg__grass')!
const pausedEl = document.querySelector<HTMLDivElement>('.gc-paused')!

let width = 0
let height = 0
function layout() {
  width = Math.max(200, Math.min(920, window.innerWidth - 48))
  height = width / view.aspect
  stageEl.style.width = labelsEl.style.width = `${width}px`
  stageEl.style.height = `${height}px`
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  canvas.width = Math.round(width * dpr)
  canvas.height = Math.round(height * dpr)
  labelsEl.replaceChildren(
    ...weeks.flatMap((week, i) => {
      const first = week.find((d) => d?.date.endsWith('-01'))
      if (!first) return []
      const span = document.createElement('span')
      span.textContent = MONTHS[parse(first.date).getUTCMonth()]
      span.style.left = `${project(view, width, height, i - 0.5, 0, -0.5).x}px`
      return [span]
    }),
  )
}
layout()
window.addEventListener('resize', layout)

// ---------- Scene ----------

const grass = new GrassRenderer(canvas)
grass.setTiles(buildTiles(grassDays))
grass.setBlades(buildBlades(grassDays, g.density))
const scene = new CreatureScene(canvas.getContext('webgl2')!, grassDays, resolveStatic(CREATURE_CONFIG), document.querySelector<HTMLDivElement>('.gc-exclaim')!)

const NO_HOVER: [number, number] = [-99, -99]
const pointer: GrassPointer = { x: 0, z: 0, strength: 0, tx: 0, tz: 0, target: 0 }
let hover = NO_HOVER

function setPaused(paused: boolean) {
  scene.setPaused(paused)
  pausedEl.hidden = !paused
}

canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect()
  const ground = toGround(view, rect.width, rect.height, event.clientX - rect.left, event.clientY - rect.top)
  if (!ground) return
  const week = Math.round(ground.x)
  const row = Math.round(ground.z)
  hover = weeks[week]?.[row] ? [week, row] : NO_HOVER
  scene.pointerMoved(pointer, ground.x, ground.z)
})
canvas.addEventListener('pointerleave', () => {
  hover = NO_HOVER
  scene.pointerLeft(pointer)
})
window.addEventListener('keydown', (event) => {
  if (event.code !== 'Space' || event.repeat) return
  if (event.target instanceof HTMLElement && event.target.closest('input, textarea, select, button, [contenteditable]')) return
  event.preventDefault()
  setPaused(!scene.paused)
})
mountDials(
  document.querySelector<HTMLDivElement>('#gc-dials')!,
  (values) => scene.setSettings(values),
  (action) => {
    if (action === 'pause') return setPaused(!scene.paused)
    setPaused(false)
    scene.replay(pointer)
  },
)

let clock = 0
let last = performance.now()
function tick(now: number) {
  // Paused: dt 0 freezes the creature, the wind and the grass on the current frame.
  const dt = scene.paused ? 0 : Math.min(0.05, (now - last) / 1000)
  last = now
  clock += dt * g.flow
  scene.update(dt, pointer, now)
  grass.draw(view, {
    time: clock,
    height: g.height,
    width: g.bladeWidth,
    wind: g.wind,
    radius: g.pointerRadius * scene.radiusScale,
    push: g.pointerPush,
    reach: g.pointerReach,
    pointer: [pointer.x, pointer.z, pointer.strength],
    hover,
  })
  scene.draw(view, g.tilt, weeks.length, width, height)
  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)
