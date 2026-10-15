/**
 * Catalog wall filling the Filo card: three tilted rails of FutureFabric product
 * turntables slide past at different speeds (studio/ecofabriq-thumbnail.html, "Catalog wall").
 *
 * No product ever shows twice at once. A tile only picks its product while it is still
 * just outside the card, choosing one that no other on-card tile holds (least recently
 * used first). That stays solvable because at most 16 tiles can touch the card at the
 * default tile size, one fewer than the 17 products.
 *
 * Draws only while the card is on screen; reduced motion shows one still frame.
 */
import { useEffect, useRef, type CSSProperties } from 'react'
import { useTuning } from '../tuning/useTuning'

type Tuple = [number, number, number, number]

const CONFIG = {
  /** Rail speed in tiles per second (middle rail ×1.5, bottom rail ×0.75). */
  speed: [0.375, 0, 1.5, 0.005] as Tuple,
  /** Turntable frames per second. */
  spin: [4.5, 0, 18, 0.5] as Tuple,
  /** Wall tilt in degrees. */
  tilt: [-9, -30, 30, 0.5] as Tuple,
  zoom: [1.25, 1, 2, 0.01] as Tuple,
  /** Tile size as a share of the card height. Larger tiles = fewer on card at once. */
  tile: [0.32, 0.2, 0.5, 0.005] as Tuple,
  /** Gap between tiles as a share of the tile. */
  gap: [0.12, 0, 0.5, 0.01] as Tuple,
  tileRadius: [0.1, 0, 0.5, 0.01] as Tuple,
  /** "Linen glass" (studio/filo-card-palettes.html): frosted-look tiles over a linen field with two drifting glows. */
  glass: {
    fill: [0.17, 0, 0.9, 0.01] as Tuple,
    edge: [0.42, 0, 1, 0.01] as Tuple,
    glowA: { type: 'color' as const, default: '#D6C7B4' },
    glowB: { type: 'color' as const, default: '#C3B19C' },
  },
}

const SPRITES = [
  'balenciaga-ephea-mycelium-coat-fw2022',
  'nike-partners-with-pinatex-for-happy-pineapple-plant-based-sneaker-collection',
  'stella-mccartney-x-veuve-clicquot-vegea-frayme-grape-waste-woven-bag',
  'allbirds-wool-runners',
  'reishi',
  'zara-pinatex-sandal',
  'xtep-pla-windbreaker',
  'yuima-nakazato-couture-with-brewed-protein',
  'stella-mccartney-mylo-bustier-and-trousers-2021',
  'zara-pinatex-bag',
  'northface',
  'coprinus',
  'ferragamo-orange-fiber-collection-2017',
  'osman-yousefzada-ss22-tencel-luxe',
  'christian-siriano-ss2025-circ-lyocell',
  'slk-orangefiber-tieorange-fiber-collection-e-marinalla',
  'orange-fiber-x-h-m-conscious-exclusive-collection-2019',
].map((name) => `url(/work/filo/sprites/${name}-spritesheet.webp)`)

const ROWS = 3
const PER_ROW = 9
const RAIL_SPEED = [1, 1.5, 0.75]

type Tile = { el: HTMLDivElement; sprite: HTMLDivElement; product: number; near: boolean }

const mod = (a: number, n: number) => ((a % n) + n) % n

export function FiloCard() {
  const v = useTuning('Filo card', CONFIG)
  const wallRef = useRef<HTMLDivElement>(null)
  const valuesRef = useRef(v)
  valuesRef.current = v

  useEffect(() => {
    const wall = wallRef.current
    const host = wall?.parentElement
    if (!wall || !host) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')

    const tiles: Tile[] = []
    for (let i = 0; i < ROWS * PER_ROW; i++) {
      const el = document.createElement('div')
      el.className = 'ecowall__tile'
      const sprite = document.createElement('div')
      sprite.className = 'ecowall__sprite'
      el.append(sprite)
      wall.append(el)
      tiles.push({ el, sprite, product: -1, near: false })
    }
    const lastUsed = new Float64Array(SPRITES.length).fill(-Infinity)

    let w = 0
    let h = 0
    let t = 0
    let last = 0
    let frame = 0
    let visible = false

    const render = () => {
      const cur = valuesRef.current
      const tile = h * cur.tile
      const slot = tile * (1 + cur.gap)
      const span = slot * PER_ROW
      const a = (cur.tilt * Math.PI) / 180
      const c = Math.cos(a)
      const s = Math.sin(a)
      // Swap margin outside the card edge: more than one clamped (50 ms) step of the fastest rail,
      // so a tile always changes product before any of it is on the card.
      const m = cur.speed * Math.max(...RAIL_SPEED) * slot * cur.zoom * 0.05 + 4
      // Card rectangle (plus margin) mapped into the wall's own coordinates, for an exact overlap test.
      const corners = [
        [-m, -m],
        [w + m, -m],
        [w + m, h + m],
        [-m, h + m],
      ].map(([px, py]) => {
        const dx = (px - w / 2) / cur.zoom
        const dy = (py - h / 2) / cur.zoom
        return [dx * c + dy * s + w / 2, -dx * s + dy * c + h / 2]
      })
      const range = (ax: number, ay: number) => {
        let lo = Infinity
        let hi = -Infinity
        for (const [x, y] of corners) {
          const d = x * ax + y * ay
          if (d < lo) lo = d
          if (d > hi) hi = d
        }
        return [lo, hi]
      }
      const cardX = range(1, 0)
      const cardY = range(0, 1)
      const cardU = range(c, -s)
      const cardV = range(s, c)
      const overlaps = (x: number, y: number) => {
        if (x + tile < cardX[0] || x > cardX[1] || y + tile < cardY[0] || y > cardY[1]) return false
        for (const [ax, ay, [lo, hi]] of [
          [c, -s, cardU],
          [s, c, cardV],
        ] as const) {
          const p = [x * ax + y * ay, (x + tile) * ax + y * ay, x * ax + (y + tile) * ay, (x + tile) * ax + (y + tile) * ay]
          if (Math.max(...p) < lo || Math.min(...p) > hi) return false
        }
        return true
      }

      const pos: [number, number][] = []
      const held = new Set<number>()
      const entering: number[] = []
      tiles.forEach((tl, i) => {
        const row = Math.floor(i / PER_ROW)
        const dir = row % 2 ? 1 : -1
        const shift = t * cur.speed * RAIL_SPEED[row] * slot
        const x = mod((i % PER_ROW) * slot + dir * shift, span) - slot
        const y = h / 2 + (row - 1) * slot - tile / 2
        pos.push([x, y])
        const near = overlaps(x, y)
        if (near && tl.near && tl.product >= 0) held.add(tl.product)
        else if (near) entering.push(i)
        tl.near = near
      })
      for (const i of entering) {
        const tl = tiles[i]
        let pick = -1
        for (let p = 0; p < SPRITES.length; p++) {
          if (!held.has(p) && (pick < 0 || lastUsed[p] < lastUsed[pick])) pick = p
        }
        if (pick < 0) pick = tl.product >= 0 ? tl.product : 0
        if (pick !== tl.product) {
          tl.product = pick
          tl.sprite.style.backgroundImage = SPRITES[pick]
        }
        lastUsed[pick] = t + i * 1e-6
        held.add(pick)
      }

      wall.style.transform = `rotate(${cur.tilt}deg) scale(${cur.zoom})`
      wall.style.setProperty('--tile-radius', `${tile * cur.tileRadius}px`)
      tiles.forEach((tl, i) => {
        if (!tl.near) {
          tl.el.style.visibility = 'hidden'
          return
        }
        const [x, y] = pos[i]
        const f = mod(Math.floor(t * cur.spin + i * 7), 36)
        tl.el.style.visibility = ''
        tl.el.style.width = tl.el.style.height = `${tile}px`
        tl.el.style.transform = `translate3d(${x}px, ${y}px, 0)`
        tl.sprite.style.backgroundPosition = `${(f % 6) * 20}% ${Math.floor(f / 6) * 20}%`
      })
    }

    const tick = (now: number) => {
      // Clamp the step so a long pause cannot jump a tile past the swap margin.
      if (last) t += Math.min(now - last, 50) / 1000
      last = now
      render()
      frame = visible && !reduced.matches ? requestAnimationFrame(tick) : 0
      if (!frame) last = 0
    }
    const play = () => {
      if (!frame) frame = requestAnimationFrame(tick)
    }

    const resize = new ResizeObserver(() => {
      w = host.clientWidth
      h = host.clientHeight
      render()
    })
    resize.observe(host)
    const seen = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) play()
    })
    seen.observe(host)
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      seen.disconnect()
      wall.replaceChildren()
    }
  }, [])

  return (
    <div
      className="works__mesh ecowall"
      aria-hidden="true"
      style={
        {
          '--glass-fill': v.glass.fill,
          '--glass-edge': v.glass.edge,
          '--glow-a': v.glass.glowA,
          '--glow-b': v.glass.glowB,
        } as CSSProperties
      }
    >
      <span className="ecowall__glow ecowall__glow--a" />
      <span className="ecowall__glow ecowall__glow--b" />
      <div ref={wallRef} className="ecowall__wall" />
    </div>
  )
}
