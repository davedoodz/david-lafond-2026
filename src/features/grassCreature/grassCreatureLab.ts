/**
 * Studio prototype (studio/grass-pokemon.html): the About page's contribution-graph grass on its
 * own, with a small 3D creature that bursts out of the tallest patch when the pointer reaches it.
 * The grass is the real renderer (components/grassField.ts) with the site's saved dial values;
 * the creature draws into the same WebGL2 context so the blades hide it where they cover it.
 */
import '../../styles/global.css'
import contributions from '../../data/contributions.json'
import tuning from '../../data/tuning.json'
import { buildBlades, buildTiles, fitView, GrassRenderer, project, toGround, type GrassDay } from '../../components/grassField'
import { CreatureRenderer, DEFAULT_LOOK, HEAD_TOP, type CreatureLook } from './creature'
import { Encounter, type AppearPreset } from './encounter'
import { mountDials, type CreatureValues } from './GrassCreatureDials'

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

// The creature lives in the busiest day's patch: the tallest, brightest grass.
let spawn: [number, number] = [0, 0]
let busiest = -1
weeks.forEach((week, x) =>
  week.forEach((day, z) => {
    if (day && day.count > busiest) {
      busiest = day.count
      spawn = [x, z]
    }
  }),
)

const view = fitView(weeks.length, g.tilt, g.height)
const tilt = (g.tilt * Math.PI) / 180
const eye: [number, number, number] = [(weeks.length - 1) / 2, Math.sin(tilt) * 30, 3 + Math.cos(tilt) * 30]

// ---------- DOM ----------

const labelsEl = document.querySelector<HTMLDivElement>('.cg__labels')!
const stageEl = document.querySelector<HTMLDivElement>('.cg__stage')!
const canvas = document.querySelector<HTMLCanvasElement>('.cg__grass')!
const exclaimEl = document.querySelector<HTMLDivElement>('.gc-exclaim')!
const exclaimMark = exclaimEl.querySelector<HTMLSpanElement>('.gc-exclaim__mark')!

// ---------- Dials ----------

let settings: CreatureValues | null = null
let look: CreatureLook = DEFAULT_LOOK
function applyDials(values: CreatureValues) {
  settings = values
  const { body, ears, face, tail, stripes, shading } = values
  look = {
    bodyColor: body.color,
    bodyWidth: body.width,
    bodyHeight: body.height,
    headSize: body.headSize,
    earLength: ears.length,
    earWidth: ears.width,
    earSpread: ears.spread,
    earTipColor: ears.tipColor,
    earTip: ears.tip,
    eyeColor: face.eyeColor,
    eyeSize: face.eyeSize,
    eyeSpacing: face.eyeSpacing,
    eyeHighlight: face.highlight,
    cheekColor: face.cheekColor,
    cheekSize: face.cheekSize,
    tail: tail.show,
    tailSize: tail.size,
    stripes: stripes.show,
    stripeColor: stripes.color,
    gloss: shading.gloss,
    rim: shading.rim,
    groundShade: shading.groundShade,
  }
  exclaimEl.dataset.style = values.exclaim.style
  exclaimMark.textContent = values.exclaim.style === 'emoji' ? '❗' : '!'
}

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

// ---------- Rendering ----------

const grass = new GrassRenderer(canvas)
grass.setTiles(buildTiles(grassDays))
grass.setBlades(buildBlades(grassDays, g.density))
const creature = new CreatureRenderer(canvas.getContext('webgl2')!)
const encounter = new Encounter(spawn, (x, z) => (weeks[x]?.[z]?.count ?? 0) > 0)

const NO_HOVER: [number, number] = [-99, -99]
const pointer = { x: 0, z: 0, strength: 0, tx: 0, tz: 0, target: 0 }
let hover = NO_HOVER
let cooldownUntil = 0
// Hover startles it once; the pointer has to leave the patch before it can startle it again.
let armed = true

function trigger() {
  if (encounter.active || performance.now() < cooldownUntil || !settings) return
  const { appear, motion } = settings
  // Starts from how parted the patch already is near the spawn, so a hovering pointer doesn't snap it shut.
  const near = 1 - Math.min(1, Math.hypot(pointer.x - spawn[0], pointer.z - spawn[1]) / 1.5)
  encounter.start({ appear: appear.preset as AppearPreset, appearTime: appear.time, hops: motion.hops, size: motion.size }, pointer.strength * near)
  armed = false
}

function replay() {
  encounter.stop()
  cooldownUntil = 0
  trigger()
}

canvas.addEventListener('pointermove', (event) => {
  const rect = canvas.getBoundingClientRect()
  const ground = toGround(view, rect.width, rect.height, event.clientX - rect.left, event.clientY - rect.top)
  if (!ground) return
  pointer.tx = ground.x
  pointer.tz = ground.z
  // Jump to a fresh pointer only while the grass is closed; otherwise glide, so the dent never teleports.
  if (pointer.strength < 0.05 && !encounter.active) Object.assign(pointer, { x: ground.x, z: ground.z })
  pointer.target = 1
  const week = Math.round(ground.x)
  const row = Math.round(ground.z)
  hover = weeks[week]?.[row] ? [week, row] : NO_HOVER
  const distance = Math.hypot(ground.x - spawn[0], ground.z - spawn[1])
  if (distance > 1.5) armed = true
  else if (distance < 0.7 && armed) trigger()
})
canvas.addEventListener('pointerleave', () => {
  pointer.target = 0
  hover = NO_HOVER
  armed = true
})
mountDials(document.querySelector<HTMLDivElement>('#gc-dials')!, applyDials, replay)

let clock = 0
let last = performance.now()
let wasActive = false
function tick(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000)
  last = now
  clock += dt * g.flow
  const size = settings?.motion.size ?? 1.15
  const frame = encounter.update(dt * (settings?.motion.speed ?? 1))
  const { pose } = frame

  if (encounter.active) {
    // The creature takes over the field's single pointer: the grass parts around it as it moves.
    // Eased (not snapped) toward it, so the patch keeps its shape when the hand-off happens.
    const follow = 1 - Math.exp(-dt * 18)
    pointer.x += (pose.x - pointer.x) * follow
    pointer.z += (pose.z - pointer.z) * follow
    pointer.strength = frame.rustle
    wasActive = true
  } else {
    if (wasActive) {
      // A beat before it can be startled again, so it doesn't loop while the pointer rests there.
      cooldownUntil = now + 1200
      wasActive = false
    }
    const ease = 1 - Math.exp(-dt * 10)
    pointer.x += (pointer.tx - pointer.x) * ease
    pointer.z += (pointer.tz - pointer.z) * ease
    pointer.strength += (pointer.target - pointer.strength) * (1 - Math.exp(-dt * 4))
  }

  grass.draw(view, {
    time: clock,
    height: g.height,
    width: g.bladeWidth,
    wind: g.wind,
    radius: g.pointerRadius * Math.max(1, size),
    push: g.pointerPush,
    reach: g.pointerReach,
    pointer: [pointer.x, pointer.z, pointer.strength],
    hover,
  })
  if (pose.y > -1.5 * size) creature.draw(view.mvp, eye, pose, size, look)

  // "!" above its head.
  const top = project(view, width, height, pose.x, pose.y + (HEAD_TOP + 0.5) * size * pose.squash, pose.z)
  const scale = settings?.exclaim.size ?? 1
  exclaimEl.style.setProperty('--gc-x', `${top.x}px`)
  exclaimEl.style.setProperty('--gc-y', `${top.y - (settings?.exclaim.lift ?? 0)}px`)
  exclaimEl.style.setProperty('--gc-scale', String(scale))
  exclaimEl.classList.toggle('is-on', frame.exclaim > 0.5)
  requestAnimationFrame(tick)
}
requestAnimationFrame(tick)

// Show it once on load; after that the pointer wakes it.
setTimeout(trigger, 900)
