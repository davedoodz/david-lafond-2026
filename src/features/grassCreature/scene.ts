/**
 * The creature living in the contribution grass: it hides in a random busy, well-surrounded patch, and when the
 * pointer reaches that patch it appears, startles ("!" over its head), darts through neighbouring
 * patches and dives back in, then hides in a new random patch. Owns the encounter, the pointer
 * hand-off and the "!" element; the host owns the grass renderer, the render loop and the pointer
 * state.
 *
 * Used by components/ContributionGraph.tsx (About page) and the studio page.
 */
import { project, type GrassDay, type View } from '../../components/grassField'
import { lookFrom, type CreatureValues } from './config'
import { CreatureRenderer, DEFAULT_LOOK, HEAD_TOP, type CreatureLook } from './creature'
import { Encounter, type AppearPreset, type EncounterFrame } from './encounter'
import './exclaim.css'

/** The grass field's single pointer: eased position/strength plus where it's heading. */
export type GrassPointer = { x: number; z: number; strength: number; tx: number; tz: number; target: number }

/** How far (tiles) the pointer's dent reaches when judging how open the patch already is. */
const OPEN_REACH = 1.5
/** A beat after a run before it can be startled again (ms). */
const COOLDOWN = 1200
/** A hideout needs at least this many grass patches among its 8 neighbours (diagonals count). */
const MIN_GRASS_NEIGHBOURS = 4
/** A hideout must also rank in this top share of grass patches by contributions (ties included). */
const TOP_SHARE = 0.3

export class CreatureScene {
  paused = false
  private renderer: CreatureRenderer
  private encounter: Encounter
  private spawn: [number, number] = [0, 0]
  /** Patches it may hide in: among the busiest, with enough grass around to run into. */
  private hideouts: [number, number][] = []
  private settings: CreatureValues
  private look: CreatureLook = DEFAULT_LOOK
  private armed = true
  private cooldownUntil = 0
  private wasActive = false
  private frame: EncounterFrame
  private mark: HTMLElement

  /**
   * @param gl the grass field's WebGL2 context; the creature draws after the grass, depth-tested
   * @param days the field's days (weeks x weekdays), to find where it can hide and run
   * @param exclaim the "!" element (`.gc-exclaim` with a `.gc-exclaim__mark` child), over the canvas
   */
  constructor(
    gl: WebGL2RenderingContext,
    days: GrassDay[][],
    settings: CreatureValues,
    private exclaim: HTMLElement,
  ) {
    const hasGrass = (x: number, z: number) => (days[x]?.[z]?.count ?? 0) > 0
    let busiest = -1
    const counts: number[] = []
    const dense: { at: [number, number]; count: number }[] = []
    days.forEach((week, x) =>
      week.forEach((day, z) => {
        if (!day || !hasGrass(x, z)) return
        counts.push(day.count)
        if (day.count > busiest) {
          busiest = day.count
          this.spawn = [x, z]
        }
        let neighbours = 0
        for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) if ((dx || dz) && hasGrass(x + dx, z + dz)) neighbours++
        if (neighbours >= MIN_GRASS_NEIGHBOURS) dense.push({ at: [x, z], count: day.count })
      }),
    )
    counts.sort((a, b) => b - a)
    const cutoff = counts[Math.max(0, Math.ceil(counts.length * TOP_SHARE) - 1)] ?? Infinity
    this.hideouts = dense.filter((d) => d.count >= cutoff).map((d) => d.at)
    // A field with no hideout keeps it in the busiest patch.
    this.hide()
    this.renderer = new CreatureRenderer(gl)
    this.encounter = new Encounter(hasGrass)
    this.frame = this.encounter.update(0)
    this.mark = exclaim.querySelector<HTMLElement>('.gc-exclaim__mark')!
    this.settings = settings
    this.setSettings(settings)
  }

  get active() {
    return this.encounter.active
  }

  /** Grass parting radius multiplier, so a bigger creature parts a wider circle. */
  get radiusScale() {
    return Math.max(1, this.settings.motion.size)
  }

  setSettings(values: CreatureValues) {
    this.settings = values
    this.look = lookFrom(values)
    this.exclaim.dataset.style = values.exclaim.style
    this.exclaim.dataset.motion = values.exclaim.boxMotion
    this.mark.textContent = values.exclaim.style === 'emoji' ? '❗' : '!'
  }

  setPaused(paused: boolean) {
    this.paused = paused
    this.exclaim.toggleAttribute('data-paused', paused)
  }

  /** Moves it to a random hideout, never the one it just left when there's another. */
  private hide() {
    const [sx, sz] = this.spawn
    const options = this.hideouts.length > 1 ? this.hideouts.filter(([x, z]) => x !== sx || z !== sz) : this.hideouts
    if (options.length) this.spawn = options[Math.floor(Math.random() * options.length)]
  }

  /** Starts a run unless one is going, it's cooling down or paused. */
  trigger(pointer: GrassPointer) {
    if (this.paused || this.encounter.active || performance.now() < this.cooldownUntil) return
    const { appear, motion } = this.settings
    // Starts from how parted the patch already is near the spawn, so a hovering pointer doesn't snap it shut.
    const near = 1 - Math.min(1, Math.hypot(pointer.x - this.spawn[0], pointer.z - this.spawn[1]) / OPEN_REACH)
    this.encounter.start(
      this.spawn,
      { appear: appear.preset as AppearPreset, appearTime: appear.time, hops: motion.hops, size: motion.size },
      pointer.strength * near,
    )
    this.armed = false
  }

  replay(pointer: GrassPointer) {
    this.setPaused(false)
    this.encounter.stop()
    this.cooldownUntil = 0
    this.trigger(pointer)
  }

  /** Call on every pointer move over the field, with the ground point under it. */
  pointerMoved(pointer: GrassPointer, x: number, z: number) {
    pointer.tx = x
    pointer.tz = z
    // Jump to a fresh pointer only while the grass is closed; otherwise glide, so the dent never teleports.
    if (pointer.strength < 0.05 && !this.encounter.active) Object.assign(pointer, { x, z })
    pointer.target = 1
    // Only the hideout's own tile wakes it; leaving that tile re-arms it.
    const onPatch = Math.round(x) === this.spawn[0] && Math.round(z) === this.spawn[1]
    if (!onPatch) this.armed = true
    else if (this.armed) this.trigger(pointer)
  }

  pointerLeft(pointer: GrassPointer) {
    pointer.target = 0
    this.armed = true
  }

  /**
   * Advances by `dt` seconds (pass 0 while paused) and eases the field's pointer: toward the
   * pointer's target normally, toward the creature while it's out so the grass parts around it.
   */
  update(dt: number, pointer: GrassPointer, now: number) {
    this.frame = this.encounter.update(dt * this.settings.motion.speed)
    const { pose, rustle } = this.frame
    if (this.encounter.active) {
      // Eased (not snapped) toward it, so the patch keeps its shape when the hand-off happens.
      const follow = 1 - Math.exp(-dt * 18)
      pointer.x += (pose.x - pointer.x) * follow
      pointer.z += (pose.z - pointer.z) * follow
      pointer.strength = rustle
      this.wasActive = true
      return
    }
    if (this.wasActive) {
      this.cooldownUntil = now + COOLDOWN
      this.wasActive = false
      this.hide()
    }
    const ease = 1 - Math.exp(-dt * 10)
    pointer.x += (pointer.tx - pointer.x) * ease
    pointer.z += (pointer.tz - pointer.z) * ease
    pointer.strength += (pointer.target - pointer.strength) * (1 - Math.exp(-dt * 4))
  }

  /** Draws the creature (after the grass) and places the "!" for a `width` x `height` CSS-px canvas. */
  draw(view: View, tiltDeg: number, weeks: number, width: number, height: number) {
    const { pose, exclaim } = this.frame
    const size = this.settings.motion.size
    if (pose.y > -1.5 * size) {
      const tilt = (tiltDeg * Math.PI) / 180
      this.renderer.draw(view.mvp, [(weeks - 1) / 2, Math.sin(tilt) * 30, 3 + Math.cos(tilt) * 30], pose, size, this.look)
    }
    const top = project(view, width, height, pose.x, pose.y + (HEAD_TOP + 0.5) * size * pose.squash, pose.z)
    const style = this.exclaim.style
    style.setProperty('--gc-x', `${top.x}px`)
    style.setProperty('--gc-y', `${top.y - this.settings.exclaim.lift}px`)
    style.setProperty('--gc-scale', String(this.settings.exclaim.size))
    this.exclaim.classList.toggle('is-on', exclaim > 0.5)
  }

  destroy() {
    this.renderer.destroy()
  }
}
