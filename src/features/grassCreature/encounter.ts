/**
 * One grass encounter: the patch parts, the creature appears (one of the APPEAR presets), freezes
 * startled (ears up, wide eyes, a "!" over its head, a nervous look around), darts through a few
 * neighbouring patches, then dives back into the grass and the blades close over it.
 *
 * `rustle` is how far the grass is parted around the creature (0 closed, 1 open). It only ever
 * moves smoothly and starts from however open the patch already is, so the patch never flickers.
 */
import { RESTING_POSE, type CreaturePose } from './creature'

export type AppearPreset = 'pop' | 'peek' | 'burst' | 'rise'

type Appear = {
  /** Grass parts before anything shows (s). */
  part: number
  /** Peek: ears and eyes rise above the grass, then it looks around before coming out (s). */
  peekRise: number
  peekHold: number
  /** Comes out onto its feet (s). */
  rise: number
  /** Jump overshoot above the ground, in creature heights (0 = rises straight up). */
  jump: number
  /** Landing squash strength. */
  land: number
}

export const APPEAR: Record<AppearPreset, Appear> = {
  pop: { part: 0.32, peekRise: 0, peekHold: 0, rise: 0.42, jump: 0.38, land: 1 },
  peek: { part: 0.4, peekRise: 0.38, peekHold: 0.75, rise: 0.36, jump: 0.24, land: 0.7 },
  burst: { part: 0.14, peekRise: 0, peekHold: 0, rise: 0.3, jump: 0.72, land: 1.35 },
  rise: { part: 0.5, peekRise: 0, peekHold: 0, rise: 0.75, jump: 0, land: 0.25 },
}

export type EncounterSettings = {
  appear: AppearPreset
  /** Multiplies the appear preset's timings. */
  appearTime: number
  hops: number
  /** Creature scale, so heights and hops follow its size. */
  size: number
}

const STARTLE = 1.05
const HOP = 0.34
const HOP_GAP = 0.05
const DIVE = 0.5
const SETTLE = 0.55
const HIDDEN_Y = -1.25
const PEEK_Y = -0.62

export type EncounterFrame = {
  pose: CreaturePose
  /** How far the grass is parted around the creature, 0-1 (fed to the field's pointer push). */
  rustle: number
  /** Opacity / pop of the "!" over its head, 0-1. */
  exclaim: number
}

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
  return t * t * (3 - 2 * t)
}

export class Encounter {
  private time = Infinity
  private spawn: [number, number] = [0, 0]
  private path: [number, number][] = []
  private appear: Appear = APPEAR.pop
  private size = 1
  private openAtStart = 0
  private total = 0

  /** @param hasGrass whether a tile has a grass patch, for picking where it runs */
  constructor(private hasGrass: (x: number, z: number) => boolean) {}

  get active() {
    return this.time < this.total
  }

  /**
   * @param spawn tile (week, row) it rises from
   * @param openAtStart how parted the patch already is (e.g. the pointer is resting in it), 0-1
   */
  start(spawn: [number, number], settings: EncounterSettings, openAtStart = 0) {
    const a = APPEAR[settings.appear] ?? APPEAR.pop
    const k = settings.appearTime
    this.appear = { ...a, part: a.part * k, peekRise: a.peekRise * k, peekHold: a.peekHold * k, rise: a.rise * k }
    this.size = settings.size
    this.openAtStart = Math.min(1, Math.max(0, openAtStart))
    this.time = 0
    this.spawn = spawn
    this.path = [spawn]
    let heading: [number, number] = [Math.random() < 0.5 ? -1 : 1, 0]
    for (let i = 0; i < settings.hops; i++) {
      const [x, z] = this.path[this.path.length - 1]
      const options: { at: [number, number]; score: number }[] = []
      for (let dx = -1; dx <= 1; dx++)
        for (let dz = -1; dz <= 1; dz++) {
          const at: [number, number] = [x + dx, z + dz]
          if ((!dx && !dz) || !this.hasGrass(...at) || this.path.some(([px, pz]) => px === at[0] && pz === at[1])) continue
          // Prefer carrying on the way it was going, with some randomness so every run differs.
          options.push({ at, score: dx * heading[0] + dz * heading[1] + Math.random() * 1.2 })
        }
      if (!options.length) break
      const next = options.sort((p, q) => q.score - p.score)[0].at
      heading = [next[0] - x, next[1] - z]
      this.path.push(next)
    }
    const { part, peekRise, peekHold, rise } = this.appear
    this.total = part + peekRise + peekHold + rise + STARTLE + (this.path.length - 1) * (HOP + HOP_GAP) + DIVE + SETTLE
  }

  stop() {
    this.time = Infinity
  }

  /** Advances by `dt` seconds of animation time and returns the frame. */
  update(dt: number): EncounterFrame {
    this.time += dt
    const t = this.time
    const size = this.size
    const [sx, sz] = this.spawn
    const pose: CreaturePose = { ...RESTING_POSE, x: sx, z: sz, y: -2 }
    if (!this.active) return { pose, rustle: 0, exclaim: 0 }
    const { part, peekRise, peekHold, rise, jump, land } = this.appear

    // 1. The patch parts, smoothly, from however open it already was.
    if (t < part) return { pose, rustle: this.openAtStart + (1 - this.openAtStart) * smooth(0, part, t), exclaim: 0 }
    let s = t - part

    // 2. Peek (peek preset): ears and eyes come up over the grass and it glances around.
    const peeking = peekRise + peekHold > 0
    if (s < peekRise + peekHold) {
      const up = smooth(0, peekRise, s)
      const hold = Math.max(0, s - peekRise)
      Object.assign(pose, {
        y: (HIDDEN_Y + (PEEK_Y - HIDDEN_Y) * up) * size,
        earSpread: -0.25 + 0.08 * Math.sin(hold * 26) * Math.exp(-hold * 4),
        eyeScale: 1.1,
        headTurn: 0.45 * Math.sin((hold / Math.max(peekHold, 1e-3)) * Math.PI * 2) * smooth(0, 0.1, hold),
      })
      return { pose, rustle: 1, exclaim: 0 }
    }
    s -= peekRise + peekHold

    // 3. Comes out: eased up from below (or from the peek), with the preset's jump on top.
    const from = (peeking ? PEEK_Y : HIDDEN_Y) * size
    const riseY = (u: number) => from * (1 - u) * (1 - u) + jump * size * Math.sin(Math.PI * Math.min(1, u))
    if (s < rise) {
      const u = s / rise
      const velocity = (riseY(u + 0.02) - riseY(u)) / (0.02 * size)
      Object.assign(pose, {
        y: riseY(u),
        squash: 1 + Math.max(-0.14, Math.min(0.22, velocity * 0.06)),
        earSpread: -0.3,
        eyeScale: 1.3,
      })
      return { pose, rustle: 1, exclaim: 0 }
    }
    s -= rise

    // 4. Startled: landing squash, a shiver, ears pricked, wide eyes, a look left and right.
    const firstHop = this.path[1] ?? [sx + 1, sz]
    const runYaw = Math.atan2(firstHop[0] - sx, firstHop[1] - sz)
    if (s < STARTLE) {
      const look = s < 0.3 ? 0 : s < 0.52 ? 0.65 * smooth(0.3, 0.42, s) : s < 0.74 ? 0.65 - 1.3 * smooth(0.52, 0.64, s) : -0.65 + 0.65 * smooth(0.74, 0.84, s)
      Object.assign(pose, {
        y: 0,
        squash: (1 - 0.26 * land * Math.exp(-s * 9) * Math.cos(s * 22)) * (1 - 0.12 * smooth(STARTLE - 0.2, STARTLE, s)),
        roll: 0.14 * Math.sin(s * 60) * Math.exp(-s * 5),
        earSpread: -0.3 + 0.1 * Math.sin(s * 32) * Math.exp(-s * 3),
        eyeScale: 1 + 0.38 * smooth(0, 0.06, s) - 0.12 * smooth(0.8, STARTLE, s),
        headTurn: look,
        headTilt: 0.12 * Math.sin(s * 9) * Math.exp(-s * 2),
        yaw: runYaw * smooth(STARTLE - 0.22, STARTLE, s),
        tailWag: 0.35 * Math.sin(s * 40) * Math.exp(-s * 4),
      })
      const exclaim = smooth(0, 0.06, s) * (1 - smooth(0.7, 0.85, s))
      return { pose, rustle: 1 - 0.15 * smooth(0, 0.4, s), exclaim }
    }
    s -= STARTLE

    // 5. Darts through neighbouring patches, leaning into each hop.
    const hops = this.path.length - 1
    const hopIndex = Math.min(hops, Math.floor(s / (HOP + HOP_GAP)))
    if (hopIndex < hops) {
      const [ax, az] = this.path[hopIndex]
      const [bx, bz] = this.path[hopIndex + 1]
      const local = s - hopIndex * (HOP + HOP_GAP)
      const u = Math.min(1, local / HOP)
      const eased = u * u * (3 - 2 * u)
      const landing = local > HOP ? Math.sin(((local - HOP) / HOP_GAP) * Math.PI) : 0
      Object.assign(pose, {
        x: ax + (bx - ax) * eased,
        z: az + (bz - az) * eased,
        y: 0.28 * size * Math.sin(Math.PI * u),
        yaw: Math.atan2(bx - ax, bz - az),
        pitch: 0.28,
        squash: 1 + 0.16 * Math.sin(Math.PI * u) - 0.12 * landing,
        earSpread: 0.35,
        eyeScale: 1.15,
        tailWag: 0.45 * Math.sin(s * 22),
      })
      return { pose, rustle: 0.9, exclaim: 0 }
    }
    s -= hops * (HOP + HOP_GAP)

    // 6. Dives head-first back into the grass.
    const [lx, lz] = this.path[hops]
    const [px, pz] = this.path[Math.max(0, hops - 1)]
    const yaw = hops ? Math.atan2(lx - px, lz - pz) : runYaw
    if (s < DIVE) {
      const u = s / DIVE
      Object.assign(pose, {
        x: lx + Math.sin(yaw) * 0.3 * u,
        z: lz + Math.cos(yaw) * 0.3 * u,
        y: size * (1.1 * u * (1 - u) - 1.5 * u * u * u),
        yaw,
        pitch: 1.5 * smooth(0.15, 0.7, u),
        squash: 1.12,
        earSpread: 0.6,
        tailWag: 0.5 * Math.sin(s * 30),
      })
      return { pose, rustle: 1, exclaim: 0 }
    }
    s -= DIVE

    // 7. The blades close over the spot where it vanished.
    Object.assign(pose, { x: lx + Math.sin(yaw) * 0.3, z: lz + Math.cos(yaw) * 0.3 })
    return { pose, rustle: 1 - smooth(0, SETTLE, s), exclaim: 0 }
  }
}
