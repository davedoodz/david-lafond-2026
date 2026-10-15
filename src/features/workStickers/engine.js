/* Framework-free sticker engine: shared by the studio (src/studio/workStickers.js, DialKit-driven)
 * and the live Work page (src/features/workStickers/WorkIntroStickers.tsx, frozen config).
 *
 * A "record" is a plain object owned by the caller:
 *   {
 *     id, button, icon, label,          // DOM: the pill, its art window, its text window
 *     values,                           // { face: 'Face N', timing: {hold,duration,letterSpeed}, face1..faceN }
 *     faceCount,                        // number, or a function returning one
 *     current, imageKey, animations,    // engine-owned mutable state — start at '', '', []
 *     revision, hoverAnimation, restTilt,
 *     defaultLabel?(index0),            // fallback text when a face's label is blank
 *     ariaLabel?(text), titleFor?(text),// caller-chosen copy for the button's accessible name / tooltip
 *     onRender?(),                      // called at the start of every render() (e.g. studio editor sync)
 *   }
 *
 * `getLook()` returns the current { appearance: {stickerScale}, motion: {landing, letters, letterStagger,
 * letterSpeed, lift, hoverScale, spring}, hop: {...} } — live DialKit values in the studio, a frozen object
 * on the live page.
 */
import { animate } from 'motion'

/* STICKER STORYBOARD
 *   0ms  click: the letters reorganize using the active Letters preset
 *        (Morph · Wave · Cascade · Slot · Scramble · Fade), staggered per letter.
 *   0ms  the old sticker leaves and the next one lands using the Landing preset
 *        (Pop · Drop · Slap · Flip · Spin · Peel); the pill resizes to the new label.
 * ~420ms the default spring settles. Hover lifts artwork without changing copy.
 * Each sticker can override both presets. Reduced motion makes changes immediate.
 */

/* A shared 24-unit, round-stroke family. Filled silhouettes get a white die-cut edge. */
export const art = {
  people: '<circle class="die-cut art-fill" cx="8" cy="8" r="4"/><circle class="die-cut art-fill" cx="17" cy="10" r="3.5"/><path class="die-cut art-fill" d="M2 21v-3a6 6 0 0 1 12 0v3Zm12 0v-6a5 5 0 0 1 8 4v2Z"/><path class="art-detail" d="M7 8h2m7 2h2"/>',
  city: '<path class="die-cut art-fill" d="M3 21V8h6V3h7v9h5v9Z"/><path class="art-detail" d="M6 12v2m0 3v1m6-11h1m-1 4h1m-1 4h1m-1 4h1m5-3h1m-1 3h1"/>',
  orbit: '<circle class="die-cut art-fill" cx="12" cy="12" r="9"/><ellipse class="art-detail" cx="12" cy="12" rx="10" ry="4" transform="rotate(-35 12 12)"/><circle class="art-light" cx="12" cy="12" r="2" fill="currentColor" stroke="none"/>',
  cursor: '<path class="die-cut art-fill" d="m4 3 16 10-8 2-4 7Z"/><path class="art-detail" d="m12 15 4 6"/>',
  spark: '<path class="die-cut art-fill" d="m12 2 3 7 7 3-7 3-3 7-3-7-7-3 7-3Z"/>',
  globe: '<circle class="die-cut art-fill" cx="12" cy="12" r="9"/><ellipse class="art-detail" cx="12" cy="12" rx="4" ry="9"/><path class="art-detail" d="M3 12h18M5 6.5c4 2 10 2 14 0M5 17.5c4-2 10-2 14 0"/>',
  layers: '<path class="die-cut art-fill" d="m2 15 10-5 10 5-10 6Z"/><path class="die-cut art-fill" d="M2 8 12 3l10 5-10 5Z"/><path class="art-detail" d="m7 8 5 2.5L17 8"/>',
  flask: '<path class="die-cut art-fill" d="M9 3h6v7l6 9a2 2 0 0 1-2 3H5a2 2 0 0 1-2-3l6-9Z"/><path class="art-detail" d="M8 3h8M7 15h10"/><circle class="art-light" cx="10" cy="18" r="1"/>',
  heart: '<path class="die-cut art-fill" d="M12 21 3 12C-2 5 7-1 12 6c5-7 14-1 9 6Z"/>',
  bolt: '<path class="die-cut art-fill" d="M13.5 2 4 14h7l-1.5 8L19 10h-7Z"/>',
  rocket: '<path class="die-cut art-fill" d="M7 13.5 4 18.5l4.5.5M17 13.5l3 5-4.5.5Z"/><path class="die-cut art-fill" d="M12 2c4 3 6 7 5 12l-2 4H9l-2-4C6 9 8 5 12 2Z"/><circle class="art-detail" cx="12" cy="9.5" r="2"/><path class="art-detail" d="M12 20v2"/>',
  arrow: '<path class="die-cut art-fill" d="M4 17.5 14.5 7H10V3.5h10.5V14H17V9.5L6.5 20Z"/>',
}
export const iconOptions = Object.keys(art)

/* Landing presets: how the next sticker arrives and the old one leaves.
 * t = resting tilt (deg), s = resting scale. Values are Motion keyframes. */
export const LANDINGS = {
  Pop: {
    enter: (t, s) => ({ y: [16, 0], rotate: [t * -2, t], scale: [0.5 * s, s], opacity: [0, 1] }),
    exit: (t, s) => ({ y: -12, rotate: -t * 2, scale: 0.6 * s, opacity: 0 }),
  },
  Drop: {
    enter: (t, s) => ({ y: [-30, 0], rotate: [t + 18, t], scale: [1.25 * s, s], opacity: [0, 1] }),
    exit: (t, s) => ({ y: 20, rotate: t - 25, scale: 0.8 * s, opacity: 0 }),
  },
  Slap: {
    enter: (t, s) => ({ scale: [2.2 * s, s], rotate: [t - 26, t], opacity: [0, 1] }),
    exit: (t, s) => ({ scale: 0.35 * s, opacity: 0 }),
  },
  Flip: {
    enter: (t, s) => ({ transformPerspective: [90, 90], rotateY: [-100, 0], rotate: [t, t], scale: [s, s], opacity: [0, 1] }),
    exit: () => ({ transformPerspective: 90, rotateY: 100, opacity: 0 }),
  },
  Spin: {
    enter: (t, s) => ({ rotate: [t - 300, t], scale: [0.2 * s, s], opacity: [0, 1] }),
    exit: (t, s) => ({ rotate: t + 220, scale: 0.2 * s, opacity: 0 }),
  },
  Peel: {
    enter: (t, s) => ({ x: [-16, 0], y: [7, 0], rotate: [t - 38, t], scale: [0.7 * s, s], opacity: [0, 1] }),
    exit: (t, s) => ({ x: 18, y: -12, rotate: t + 42, scale: 0.7 * s, opacity: 0 }),
  },
}
export const landingOptions = Object.keys(LANDINGS)
export const letterOptions = ['Morph', 'Crisp', 'Glide', 'Drift', 'Soft', 'Ripple', 'Echo', 'Bloom', 'Punch', 'Sway', 'Squish', 'Hop', 'Twirl', 'Breeze', 'Tide', 'Tilt', 'Lean', 'Melt', 'Mist', 'Arc', 'Flip', 'Hinge', 'Turn', 'Coin', 'Barrel', 'Domino', 'Spin', 'Tumble', 'Pinwheel', 'Wave', 'Cascade', 'Slot', 'Split', 'Zoom', 'Elastic', 'Typewriter', 'Scramble', 'Fade']

export function mixHex(hex, other, amount) {
  const parse = (value) => value.match(/^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i)?.slice(1).map(n => parseInt(n, 16))
  const a = parse(hex), b = parse(other)
  if (!a || !b) return hex
  return `#${a.map((n, i) => Math.round(n + (b[i] - n) * amount).toString(16).padStart(2, '0')).join('')}`
}

const colorProbe = typeof document === 'undefined' ? null : document.createElement('canvas').getContext('2d')
/** Resolves any CSS color (named, hsl, etc.) to #rrggbb via a throwaway canvas. */
export function toHex(color) {
  if (/^#[\da-f]{6}$/i.test(color)) return color
  if (!colorProbe) return null
  colorProbe.fillStyle = '#000000'
  colorProbe.fillStyle = color
  return /^#[\da-f]{6}$/i.test(colorProbe.fillStyle) ? colorProbe.fillStyle : null
}

export function activePreset(value, fallback) {
  return value === 'Global' ? fallback : value
}

/* Artwork: each SVG instance owns its own gradient so ghosts keep their paint. */
let gradientCount = 0
export function createArtSvg(name) {
  const id = `sticker-fill-${++gradientCount}`
  const holder = document.createElement('span')
  // Only trusted, authored SVG paths enter markup. User labels always use textContent.
  holder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><defs><linearGradient id="${id}" gradientUnits="userSpaceOnUse"><stop offset="0"/><stop offset="1"/></linearGradient></defs>${art[name] ?? art.spark}</svg>`
  return holder.firstElementChild
}
export function paintArt(svg, values) {
  const gradient = svg?.querySelector('linearGradient')
  if (!gradient) return
  const radians = values.gradientAngle * Math.PI / 180
  const dx = Math.sin(radians) * 12
  const dy = -Math.cos(radians) * 12
  gradient.setAttribute('x1', String(12 - dx))
  gradient.setAttribute('y1', String(12 - dy))
  gradient.setAttribute('x2', String(12 + dx))
  gradient.setAttribute('y2', String(12 + dy))
  const [start, end] = gradient.querySelectorAll('stop')
  start.setAttribute('stop-color', values.color)
  end.setAttribute('stop-color', values.fill === 'Gradient' ? values.gradientEnd : values.color)
  svg.style.setProperty('--art-fill', `url(#${gradient.id})`)
  svg.style.setProperty('--outline', String(values.outline))
}
export function createFaceArt(face) {
  if (!face.image) return createArtSvg(face.artwork)
  const image = document.createElement('img')
  image.src = face.image
  image.alt = ''
  image.draggable = false
  return image
}

/* The hover tint follows the face's artwork: an SVG uses its fill (the midpoint of a gradient);
 * an uploaded image uses its most common vivid color, sampled once per image. */
export const NEUTRAL_TINT = '#f2f2f2'
const imageTints = new Map()
export function imageTint(src) {
  if (!imageTints.has(src)) {
    imageTints.set(src, new Promise(resolve => {
      const image = new Image()
      image.crossOrigin = 'anonymous'
      image.onerror = () => resolve(null)
      image.onload = () => {
        try {
          const size = 40
          const canvas = Object.assign(document.createElement('canvas'), { width: size, height: size })
          const context = canvas.getContext('2d', { willReadFrequently: true })
          context.drawImage(image, 0, 0, size, size)
          const { data } = context.getImageData(0, 0, size, size)
          // Bucket pixels by coarse color, weighting vivid ones; skip transparent, near-white, and near-black pixels.
          const buckets = new Map()
          for (let i = 0; i < data.length; i += 4) {
            const [r, g, b, a] = [data[i], data[i + 1], data[i + 2], data[i + 3]]
            const max = Math.max(r, g, b), min = Math.min(r, g, b)
            if (a < 160 || max < 40 || min > 225) continue
            const key = (r >> 5) << 6 | (g >> 5) << 3 | (b >> 5)
            const bucket = buckets.get(key) ?? { weight: 0, r: 0, g: 0, b: 0 }
            const weight = 1 + (max - min) / 32
            bucket.weight += weight; bucket.r += r * weight; bucket.g += g * weight; bucket.b += b * weight
            buckets.set(key, bucket)
          }
          let best = null
          for (const bucket of buckets.values()) if (!best || bucket.weight > best.weight) best = bucket
          if (!best) { resolve(NEUTRAL_TINT); return }
          const [r, g, b] = [best.r, best.g, best.b].map(n => Math.round(n / best.weight))
          // Black, white, and gray artwork has no color to borrow, so its pill lifts to a light gray instead.
          if (Math.max(r, g, b) - Math.min(r, g, b) < 24) { resolve(NEUTRAL_TINT); return }
          resolve(`#${[r, g, b].map(n => n.toString(16).padStart(2, '0')).join('')}`)
        } catch { resolve(null) }
      }
      image.src = src
    }))
  }
  return imageTints.get(src)
}

function resolveFaceCount(record) {
  return typeof record.faceCount === 'function' ? record.faceCount() : record.faceCount
}
/** Clamps the record's selected face ("Face N") to its current face count. */
export function faceOf(record) {
  const count = resolveFaceCount(record)
  return Math.min(Number(record.values.face.replace(/\D/g, '')) || 1, count)
}
export function currentFace(record) {
  return record.values[`face${faceOf(record)}`]
}

/** Paints the resting styles (fill, outline, placement, tilt, tint) without animating. */
export function paint(record) {
  const face = currentFace(record)
  record.button.style.setProperty('--accent', face.color)
  const fillTint = face.fill === 'Gradient' ? mixHex(toHex(face.color), toHex(face.gradientEnd), 0.5) : face.color
  record.button.style.setProperty('--tint', fillTint)
  if (face.image) {
    const image = face.image
    imageTint(image).then(tint => { if (tint && currentFace(record).image === image) record.button.style.setProperty('--tint', tint) })
  }
  record.button.style.setProperty('--tilt', `${face.tilt}deg`)
  // Uploaded images read --outline from the button; SVG art carries its own copy.
  record.button.style.setProperty('--outline', String(face.outline))
  record.button.style.setProperty('--gap', `${face.gap}em`)
  record.button.style.setProperty('--ends', `${face.ends}em`)
  record.button.style.setProperty('--pill-height', `${face.height}em`)
  record.button.dataset.side = face.side.toLowerCase()
  for (const el of record.icon.querySelectorAll('.sticker-art:not(.sticker-ghost)')) {
    // CSS translate/scale compose with Motion's animated transform; a leaving face keeps its own values.
    el.dataset.side = face.side.toLowerCase()
    el.style.translate = `${face.offsetX}em ${-face.offsetY}em`
    el.style.scale = String(face.size)
    const svg = el.querySelector('svg')
    if (svg) paintArt(svg, face)
  }
}

/* Letter presets: how characters reorganize between labels. */
function ghost(record, { element, x }) {
  element.className = 'sticker-char sticker-ghost'
  element.style.cssText = `left:${x}px;top:0`
  record.label.append(element)
  return element
}

export function turn(record, setFace, onBlocked) {
  const count = resolveFaceCount(record)
  if (count < 2) { onBlocked?.(record); return }
  const index = faceOf(record)
  setFace(record, `Face ${index % count + 1}`)
}

/** Advances one pill at a time, in list order, skipping any the caller flags. */
export function createLoopScheduler({ list, turn: turnRecord, skip, getTiming, loopEnabled, reducedMotion, isHidden }) {
  let timer
  let index = 0
  function schedule(delay = 600) {
    clearTimeout(timer)
    if (!loopEnabled() || reducedMotion.matches || isHidden()) return
    timer = setTimeout(step, delay)
  }
  function step() {
    const items = list()
    if (!items.length) { schedule(1000); return }
    const record = items[index++ % items.length]
    if (skip?.(record)) { schedule(300); return }
    turnRecord(record)
    const timing = getTiming(record)
    schedule((Math.max(timing.duration, timing.duration / timing.letterSpeed) + timing.hold) * 1000)
  }
  function stop() { clearTimeout(timer) }
  return { schedule, stop }
}

/**
 * Builds the motion-bound half of the engine: transition pacing, letter-reorganization
 * presets, hover, and render. Each caller (the studio, the live page) gets its own instance
 * so turn-in-progress pacing never leaks between independent sticker sets.
 */
export function createStickerEngine({ getLook, reducedMotion }) {
  // A turn runs at its pill's own duration; everything else (hover, previews outside a turn)
  // uses the global spring. While letters animate, the spring loses its bounce so words settle
  // without overshooting.
  let turnSeconds = null
  let lettersPhase = false
  function transition(delay = 0) {
    if (reducedMotion.matches) return { duration: 0 }
    const value = getLook().motion.spring
    // Advanced springs carry stiffness/damping, so letters get a fresh bounce-free spring of the same duration.
    const base = value.type === 'easing' ? { ...value, type: 'tween' } : lettersPhase ? { type: 'spring', visualDuration: value.visualDuration ?? 0.42, bounce: 0 } : value
    const paced = turnSeconds === null ? base : base.type === 'tween' ? { ...base, duration: turnSeconds } : { ...base, visualDuration: turnSeconds }
    return delay ? { ...paced, delay } : paced
  }
  function seconds() {
    return turnSeconds ?? getLook().motion.spring.visualDuration ?? getLook().motion.spring.duration ?? 0.42
  }
  function run(record, element, values, options = transition()) {
    const animation = animate(element, values, options)
    record.animations.push(animation)
    return animation
  }

  /* The Morph family: shared letters slide to their new places; new letters arrive and old ones
   * leave with a small, tunable difference. rise/fall are in em (positive = down), blur in px,
   * grow/shrink are entering/leaving scales, ripple staggers letters (reverse: right to left),
   * bend(dir, em, dx) adds a mid-move motion to sliding letters (bendTimes places its middle keyframe),
   * and enter(em)/exit(em) add extra keyframes for arriving and leaving letters. */
  function morphLike({ rise = 0.35, fall = -0.35, blur = 3, grow = 1, shrink = 1, ripple = 0, reverse = false, bend = null, bendTimes, enter = null, exit = null }) {
    return ({ record, entering, leaving, em, stagger }) => {
      entering.forEach(({ span, old, dx }, i) => {
        const order = reverse ? entering.length - 1 - i : i
        const options = transition(ripple ? order * stagger * ripple : 0)
        if (!old) {
          run(record, span, { y: [em * rise, 0], opacity: [0, 1], scale: [grow, 1], filter: [`blur(${blur}px)`, 'blur(0px)'], ...enter?.(em) }, options)
          return
        }
        run(record, span, { x: [dx, 0] }, options)
        if (bend && dx) run(record, span, bend(Math.sign(dx), em, dx), { duration: seconds(), ease: 'easeInOut', delay: options.delay ?? 0, ...(bendTimes && { times: bendTimes }) })
      })
      for (const item of leaving) {
        const element = ghost(record, item)
        run(record, element, { y: em * fall, opacity: 0, scale: shrink, filter: `blur(${blur}px)`, ...exit?.(em) }).then(() => element.remove())
      }
    }
  }
  const MORPH_FAMILY = {
    Morph: morphLike({}),
    // No vertical travel and no blur: a clean crossfade while letters slide.
    Glide: morphLike({ rise: 0, fall: 0, blur: 0 }),
    // Exactly Morph's rise and fall, with no blur: sharp letters the whole way.
    Crisp: morphLike({ blur: 0 }),
    // Reversed direction: new letters drop in from above, old ones sink away.
    Drift: morphLike({ rise: -0.35, fall: 0.35 }),
    // Shorter travel, heavier blur: hazier and quieter.
    Soft: morphLike({ rise: 0.18, fall: -0.18, blur: 7 }),
    // Letters settle one after another, left to right.
    Ripple: morphLike({ ripple: 1.2 }),
    // New letters grow in place; old ones swell and fade.
    Bloom: morphLike({ rise: 0, fall: 0, blur: 4, grow: 0.55, shrink: 1.35 }),
    // Sliding letters lean into the direction they travel.
    Sway: morphLike({ bend: (dir) => ({ rotate: [0, dir * -9, 0] }) }),
    // Sliding letters stretch as they move, then snap back.
    Squish: morphLike({ bend: () => ({ scaleX: [1, 1.18, 1], scaleY: [1, 0.86, 1] }) }),
    // Sliding letters make a small hop; lower and quicker-feeling than Arc. Tuned live from the Hop folder in Look & motion.
    Hop: (args) => {
      const hop = getLook().hop
      return morphLike({
        rise: hop.rise, fall: -hop.exit, blur: hop.blur, ripple: hop.ripple,
        bendTimes: [0, hop.peak, 1],
        bend: (dir, em, dx) => {
          const height = em * hop.height + Math.abs(dx) * hop.perDistance
          return { y: [0, -height, 0], rotate: [0, dir * -hop.lean, 0] }
        },
      })(args)
    },
    // Letters settle right to left: Ripple in reverse.
    Echo: morphLike({ ripple: 1.2, reverse: true }),
    // New letters breeze in from the right; old ones drift off to the left.
    Breeze: morphLike({ rise: 0, fall: 0, blur: 2, enter: (em) => ({ x: [em * 0.45, 0] }), exit: (em) => ({ x: -em * 0.45 }) }),
    // Breeze in the other direction.
    Tide: morphLike({ rise: 0, fall: 0, blur: 2, enter: (em) => ({ x: [-em * 0.45, 0] }), exit: (em) => ({ x: em * 0.45 }) }),
    // New letters rotate up into place; old ones tip away.
    Tilt: morphLike({ rise: 0.3, enter: () => ({ rotate: [14, 0] }), exit: () => ({ rotate: -14 }) }),
    // New letters straighten from a slant; old ones slant as they go.
    Lean: morphLike({ rise: 0.2, fall: -0.2, enter: () => ({ skewX: [-18, 0] }), exit: () => ({ skewX: 18 }) }),
    // Big-to-small arrival, no blur: punchier than Bloom.
    Punch: morphLike({ rise: 0, fall: 0, blur: 0, grow: 1.45, shrink: 0.6 }),
    // Old letters stretch and drip downward; new ones settle from above.
    Melt: morphLike({ rise: -0.2, fall: 0.45, blur: 6, exit: () => ({ scaleY: 1.6, scaleX: 0.85 }) }),
    // Almost no travel and very heavy blur: letters fade through fog.
    Mist: morphLike({ rise: 0.08, fall: -0.08, blur: 12 }),
    // Shared letters do a full spin as they slide to their new places.
    Twirl: morphLike({ bend: (dir) => ({ rotate: [0, dir * 360] }) }),
  }
  /* The Flip & spin family: every letter turns over or around, one after another.
   * enter(em) gives from→to keyframes, exit(em) gives targets; origin is the pivot;
   * pace scales the per-letter stagger. */
  function flipLike({ enter, exit, origin = '', pace = 1 }) {
    return ({ record, entering, leaving, em, stagger }) => {
      entering.forEach(({ span }, i) => {
        span.style.transformOrigin = origin
        run(record, span, { opacity: [0, 1], ...enter(em) }, transition(i * stagger * pace))
      })
      leaving.forEach((item, i) => {
        const element = ghost(record, item)
        element.style.transformOrigin = origin
        run(record, element, { opacity: 0, ...exit(em) }, transition(i * stagger * pace * 0.5)).then(() => element.remove())
      })
    }
  }
  const FLIP_FAMILY = {
    // Letters swing up from the baseline like a flap; old ones fall back.
    Hinge: flipLike({ origin: '50% 100%', enter: () => ({ rotateX: [-100, 0] }), exit: () => ({ rotateX: 100 }) }),
    // Letters turn sideways like cards.
    Turn: flipLike({ enter: () => ({ rotateY: [90, 0] }), exit: () => ({ rotateY: -90 }) }),
    // Letters spin around their vertical axis like flipped coins.
    Coin: flipLike({ enter: () => ({ rotateY: [-540, 0] }), exit: () => ({ rotateY: 360 }), pace: 0.6 }),
    // Letters roll forward over the top, a full turn.
    Barrel: flipLike({ enter: () => ({ rotateX: [-360, 0] }), exit: () => ({ rotateX: 180 }) }),
    // Letters open in from the left edge like doors, one by one.
    Domino: flipLike({ origin: '0% 50%', enter: () => ({ rotateY: [-100, 0] }), exit: () => ({ rotateY: 100 }), pace: 2 }),
    // Letters spin in flat and grow; old ones spin out and shrink.
    Spin: flipLike({ enter: () => ({ rotate: [-180, 0], scale: [0.2, 1] }), exit: () => ({ rotate: 180, scale: 0.2 }) }),
    // Letters tumble down into place; old ones tumble out below.
    Tumble: flipLike({ enter: (em) => ({ y: [-em * 0.6, 0], rotate: [-120, 0] }), exit: (em) => ({ y: em * 0.6, rotate: 120 }) }),
    // Letters swing in on a pivot below them, like spokes of a wheel.
    Pinwheel: flipLike({ origin: '50% 160%', enter: () => ({ rotate: [-80, 0] }), exit: () => ({ rotate: 80 }) }),
  }
  const LETTERS = {
    ...MORPH_FAMILY,
    ...FLIP_FAMILY,
    // Morph whose shared letters hop over to their new places.
    Arc({ record, entering, leaving, em }) {
      for (const { span, old, dx } of entering) {
        if (old) {
          run(record, span, { x: [dx, 0] })
          if (dx) run(record, span, { y: [0, -em * Math.min(0.4, 0.12 + Math.abs(dx) / em * 0.08), 0] }, { duration: seconds() * 1.1, ease: 'easeInOut' })
        } else run(record, span, { y: [em * 0.35, 0], opacity: [0, 1], filter: ['blur(3px)', 'blur(0px)'] })
      }
      for (const item of leaving) {
        const element = ghost(record, item)
        run(record, element, { y: -em * 0.35, opacity: 0, filter: 'blur(3px)' }).then(() => element.remove())
      }
    },
    Wave({ record, entering, leaving, em, stagger }) {
      entering.forEach(({ span, old, dx }, i) => {
        run(record, span, { x: [old ? dx : 0, 0], opacity: [old ? 1 : 0, 1] })
        run(record, span, { y: [0, -em * 0.32, 0] }, { duration: 0.46, ease: 'easeInOut', delay: i * stagger })
      })
      for (const item of leaving) {
        const element = ghost(record, item)
        run(record, element, { y: em * 0.4, opacity: 0 }).then(() => element.remove())
      }
    },
    Cascade({ record, entering, leaving, em, stagger }) {
      entering.forEach(({ span }, i) => run(record, span, { y: [em * 0.6, 0], rotate: [10, 0], opacity: [0, 1], filter: ['blur(3px)', 'blur(0px)'] }, transition(i * stagger)))
      leaving.forEach((item, i) => {
        const element = ghost(record, item)
        run(record, element, { y: -em * 0.5, rotate: -10, opacity: 0 }, transition(i * stagger * 0.5)).then(() => element.remove())
      })
    },
    Slot({ record, entering, leaving, em, stagger }) {
      entering.forEach(({ span }, i) => run(record, span, { y: [em * 1.2, 0] }, transition(i * stagger)))
      leaving.forEach((item, i) => {
        const element = ghost(record, item)
        run(record, element, { y: -em * 1.2 }, transition(i * stagger)).then(() => element.remove())
      })
    },
    Flip({ record, entering, leaving, stagger }) {
      entering.forEach(({ span }, i) => run(record, span, { rotateX: [-90, 0], opacity: [0, 1] }, transition(i * stagger + 0.06)))
      leaving.forEach((item, i) => {
        const element = ghost(record, item)
        run(record, element, { rotateX: 90, opacity: 0 }, transition(i * stagger * 0.5)).then(() => element.remove())
      })
    },
    // Old letters burst outward from the middle; new ones gather in from it.
    Split({ record, entering, leaving, em, stagger }) {
      const middle = record.label.getBoundingClientRect()
      const center = middle.left + middle.width / 2
      for (const { span } of entering) {
        const box = span.getBoundingClientRect()
        const toCenter = center - (box.left + box.width / 2)
        run(record, span, { x: [toCenter, 0], opacity: [0, 1], scale: [0.6, 1] }, transition(Math.abs(toCenter) / em * stagger))
      }
      const oldCenter = leaving.reduce((max, item) => Math.max(max, item.x), 0) / 2
      for (const item of leaving) {
        const element = ghost(record, item)
        run(record, element, { x: item.x + Math.sign(item.x - oldCenter || 1) * em * 0.6, opacity: 0, scale: 0.6 }).then(() => element.remove())
      }
    },
    Zoom({ record, entering, leaving, stagger }) {
      entering.forEach(({ span }, i) => run(record, span, { scale: [1.9, 1], opacity: [0, 1], filter: ['blur(4px)', 'blur(0px)'] }, transition(i * stagger * 0.6)))
      for (const item of leaving) {
        const element = ghost(record, item)
        run(record, element, { scale: 0.3, opacity: 0, filter: 'blur(4px)' }).then(() => element.remove())
      }
    },
    Elastic({ record, entering, leaving, em, stagger }) {
      const spring = (delay) => ({ type: 'spring', visualDuration: seconds(), bounce: 0.62, delay })
      entering.forEach(({ span }, i) => run(record, span, { y: [em * 0.45, 0], scaleY: [0.2, 1], scaleX: [1.5, 1], opacity: [0, 1] }, spring(i * stagger)))
      for (const item of leaving) {
        const element = ghost(record, item)
        run(record, element, { scaleY: 0, scaleX: 1.4, opacity: 0 }, { duration: seconds() * 0.5, ease: 'easeIn' }).then(() => element.remove())
      }
    },
    // Deletes the old word from its end, then types the new one, letter by letter.
    Typewriter({ record, entering, leaving, stagger }) {
      const step = Math.max(stagger, 0.012) * 1.6
      const erase = [...leaving].sort((a, b) => b.x - a.x)
      erase.forEach((item, i) => {
        const element = ghost(record, item)
        run(record, element, { opacity: 0 }, { duration: 0.01, delay: i * step * 0.6 }).then(() => element.remove())
      })
      const start = erase.length * step * 0.6
      entering.forEach(({ span }, i) => run(record, span, { opacity: [0, 1] }, { duration: 0.01, delay: start + i * step }))
    },
    Scramble({ record, entering, leaving, stagger }) {
      for (const { element } of leaving) element.remove()
      const glyphs = 'abcdefghijklmnopqrstuvwxyz'
      const items = entering.filter(({ span }) => span.textContent.trim()).map(({ span }, i) => {
        const final = span.textContent
        span.style.width = `${span.getBoundingClientRect().width}px`
        span.style.textAlign = 'center'
        return { span, final, revealAt: 0.1 + i * Math.max(stagger, 0.012) * 2.2, scramble: true }
      })
      const started = performance.now()
      let frame = 0
      const tick = (now) => {
        const elapsed = (now - started) / 1000
        let pending = false
        for (const item of items) {
          if (!item.scramble) continue
          if (elapsed >= item.revealAt) {
            item.span.textContent = item.final
            item.span.style.width = ''
            item.span.style.textAlign = ''
            item.scramble = false
            continue
          }
          pending = true
          const glyph = glyphs[Math.floor(Math.random() * glyphs.length)]
          item.span.textContent = item.final === item.final.toUpperCase() ? glyph.toUpperCase() : glyph
        }
        if (pending) frame = requestAnimationFrame(tick)
      }
      frame = requestAnimationFrame(tick)
      record.animations.push({
        stop() {
          cancelAnimationFrame(frame)
          for (const item of items) { item.span.textContent = item.final; item.span.style.width = ''; item.span.style.textAlign = '' }
        },
      })
    },
    Fade({ record, entering, leaving, stagger }) {
      entering.forEach(({ span }, i) => run(record, span, { opacity: [0, 1], filter: ['blur(5px)', 'blur(0px)'] }, transition(i * stagger * 0.5)))
      for (const item of leaving) {
        const element = ghost(record, item)
        run(record, element, { opacity: 0, filter: 'blur(5px)' }).then(() => element.remove())
      }
    },
  }

  function hover(record, active) {
    const element = record.icon.lastElementChild
    if (!element || !record.values) return
    record.hoverAnimation?.stop()
    const p = getLook()
    const face = currentFace(record)
    const lifted = active && !reducedMotion.matches
    const em = lifted ? parseFloat(getComputedStyle(record.button).fontSize) : 0
    record.hoverAnimation = animate(element, {
      y: lifted ? -p.motion.lift - face.hoverY * em : 0,
      x: lifted ? face.hoverX * em : 0,
      rotateY: 0,
      scale: p.appearance.stickerScale * (lifted ? p.motion.hoverScale : 1),
      rotate: lifted ? face.hoverRotate : face.tilt,
    }, transition())
  }

  function render(record) {
    const values = record.values
    const faceIndex = faceOf(record)
    const face = values[`face${faceIndex}`]
    const text = face.label.trim() || (record.defaultLabel ? record.defaultLabel(faceIndex - 1) : face.label)
    record.button.setAttribute('aria-label', record.ariaLabel ? record.ariaLabel(text) : `${text}. Show next sticker`)
    if (record.titleFor) record.button.title = record.titleFor(text)
    record.onRender?.()
    // Including the face number makes every turn animate, even between look-alike faces.
    const imageKey = `${faceIndex}|${face.image}|${face.artwork}`
    const changed = record.current !== text || record.imageKey !== imageKey
    if (!changed) { paint(record); hover(record, record.button.matches(':hover, :focus-visible')); return }
    record.revision += 1
    const revision = record.revision
    record.animations.forEach(a => a.stop())
    record.animations = []
    record.hoverAnimation?.stop()
    record.button.querySelectorAll('.sticker-ghost').forEach(el => el.remove())
    const initial = !record.current
    const animated = !initial && !reducedMotion.matches
    const look = getLook()
    const motion = look.motion
    const letters = activePreset(face.motion.letters, motion.letters)
    const landing = LANDINGS[activePreset(face.motion.landing, motion.landing)] ?? LANDINGS.Pop
    const reuse = letters in MORPH_FAMILY || letters === 'Arc' || letters === 'Wave'
    record.label.dataset.letters = letters
    const previousWidth = record.button.getBoundingClientRect().width
    const previous = new Map()
    const oldOrigin = record.label.getBoundingClientRect()
    for (const span of record.label.children) {
      previous.set(span.dataset.key, { element: span, x: span.getBoundingClientRect().left - oldOrigin.left })
    }
    record.label.replaceChildren()
    const counts = new Map()
    const entering = []
    for (const char of Array.from(text)) {
      const n = counts.get(char) ?? 0
      counts.set(char, n + 1)
      const key = `${char}:${n}`
      const old = reuse ? previous.get(key) : undefined
      if (old) previous.delete(key)
      const span = old?.element ?? document.createElement('span')
      span.className = 'sticker-char'
      span.dataset.key = key
      span.textContent = char
      span.style.cssText = ''
      record.label.append(span)
      entering.push({ span, old })
    }
    // Apply the new face's gap before measuring, without the slider transition, so the pill resizes to its true width.
    record.button.style.transition = 'none'
    record.button.style.setProperty('--gap', `${face.gap}em`)
    record.button.style.setProperty('--ends', `${face.ends}em`)
    record.button.style.setProperty('--pill-height', `${face.height}em`)
    record.button.dataset.side = face.side.toLowerCase()
    record.button.style.width = ''
    const targetWidth = record.button.getBoundingClientRect().width
    record.button.style.transition = ''
    const { duration } = values.timing
    const letterSpeed = values.timing.letterSpeed * motion.letterSpeed
    turnSeconds = duration / letterSpeed
    lettersPhase = true
    if (animated) {
      const origin = record.label.getBoundingClientRect()
      for (const item of entering) item.dx = item.old ? item.old.x - (item.span.getBoundingClientRect().left - origin.left) : 0
      const em = parseFloat(getComputedStyle(record.button).fontSize)
      LETTERS[letters]({ record, entering, leaving: [...previous.values()], em, stagger: motion.letterStagger / letterSpeed })
      record.button.style.width = `${targetWidth}px`
      run(record, record.button, { width: [previousWidth, targetWidth] }).then(() => {
        if (record.revision === revision) record.button.style.width = ''
      })
    }
    lettersPhase = false
    turnSeconds = duration
    const oldArt = record.icon.lastElementChild
    const nextArt = document.createElement('span')
    nextArt.className = 'sticker-art'
    nextArt.append(createFaceArt(face))
    record.icon.replaceChildren(nextArt)
    paint(record)
    if (animated) {
      const scale = look.appearance.stickerScale
      if (oldArt) {
        oldArt.classList.add('sticker-ghost')
        record.icon.prepend(oldArt)
        run(record, oldArt, landing.exit(record.restTilt ?? face.tilt, scale)).then(() => oldArt.remove())
      }
      run(record, nextArt, landing.enter(face.tilt, scale))
    }
    turnSeconds = null
    record.current = text
    record.restTilt = face.tilt
    record.imageKey = imageKey
  }

  return { transition, run, seconds, LETTERS, MORPH_FAMILY, hover, render }
}
