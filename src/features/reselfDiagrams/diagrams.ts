/**
 * Re:Self diagrams as SVG markup: the five-step product flow (story strip), the
 * vision line and the signals baseline. Ink is static; every Momo-blue element
 * carries a `b-*` class so ReselfFigure.css can animate the blue layer only.
 * Studio twin: studio/momo-product-flow.html.
 */
const INK = '#171717'
const STONE = '#6f6b68'
const BLUE = '#53bffe'
const FONT = 'Beatrice, system-ui, sans-serif'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;')
const text = (x: number, y: number, t: string, o: { size?: number; weight?: number; fill?: string; anchor?: string; cls?: string } = {}) =>
  `<text x="${x}" y="${y}" font-size="${o.size ?? 20}" font-weight="${o.weight ?? 400}" fill="${o.fill ?? INK}" text-anchor="${o.anchor ?? 'middle'}"${o.cls ? ` class="${o.cls}"` : ''}>${esc(t)}</text>`
const use = (body: string, x: number, y: number, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})">${body}</g>`
const chevron = (id: string, c: string) =>
  `<marker id="${id}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M1 1L8 5L1 9" fill="none" stroke="${c}" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></marker>`

// ---------- Product flow (illustrations from the Re:Self onboarding in Paper) ----------
const HEAD = `<path fill="${INK}" d="M0 52C0 50.2 0 48.3 0 46.4C.1 46.1.2 45.8.2 45.5C1.2 34.3 5.7 24.7 13.5 16.7C21.9 8 32.5 3.2 44.4 1.1C46.9.6 49.5.4 52 0C54.7 0 57.4 0 60.1 0C63 .4 66 .7 68.9 1.4C81.4 4.1 92.3 9.5 100.6 19.4C108.2 28.4 111 38.9 109.1 50.5C108.7 53.3 107.5 55.9 106.7 58.6C106.1 60.4 106.2 62.1 107.2 63.7C108.8 66.2 110.4 68.8 112 71.2C114.3 74.7 116.9 78.1 118 82.2V84.3C117.1 87.4 114.7 88.7 111.8 89.6C110.5 90 109.1 90.5 107.8 90.9C106.5 91.4 105.9 92.2 106 93.6C106.2 95.8 106.2 97.9 106.3 100.1C106.5 104.2 106.9 108.3 106.9 112.5C107 117.3 104.6 120.7 100.5 122.1C99.2 122.6 97.7 122.9 96.2 123C89.6 123.5 83.2 122.4 76.7 121C75.7 120.8 75.1 121 74.4 121.7C71.5 125.1 69.1 128.8 67 132.8C66.6 133.6 66 134.3 65.4 135H13.4C11.8 133.8 11.7 133.2 12.5 131.2C12.9 130.1 13.4 128.9 13.8 127.8C16.7 119.5 18 111.1 16.9 102.4C16.1 95.3 13.6 88.9 10.1 82.7C6.1 75.6 2.9 68.1 1.2 60C.7 57.4.4 54.7 0 52ZM17.7 130.7C17.8 130.7 18 130.7 18.3 130.7C33 130.7 47.6 130.7 62.3 130.8C63.1 130.8 63.5 130.5 63.8 129.8C66.2 125.2 69.1 121.1 72.7 117.3C73.6 116.4 74.5 116.1 75.7 116.4C79.1 117 82.5 117.8 85.9 118.3C89.8 118.9 93.8 119.2 97.7 118.5C101 117.9 102.5 116.2 102.7 112.8C102.7 111.5 102.6 110.2 102.6 108.8C102.3 103.8 101.9 98.7 101.8 93.6C101.6 90.2 103 88.3 106.2 87C108 86.2 109.9 85.8 111.8 85.1C113.7 84.3 114.1 83.6 113.3 81.7C112.5 80 111.6 78.4 110.6 76.8C108.1 72.9 105.6 69.1 103.2 65.2C101.8 63 101.6 60.6 102.4 58.2C102.7 56.9 103.1 55.7 103.5 54.5C106.2 47.4 106 40.3 103.6 33.3C100.5 23.9 93.9 17.2 85.5 12.3C72.6 4.8 58.8 2.7 44.2 5.4C34.7 7.2 25.9 10.9 18.7 17.6C5.7 29.8 1.7 44.7 6.1 61.8C8 69.3 11.4 76.2 15.1 83C21.2 94.1 23 105.9 20.7 118.3C19.9 122.4 18.7 126.5 17.7 130.7Z"/>`
const BRAIN = `<path fill="${BLUE}" fill-rule="evenodd" d="M0 23.2C.5 14.9 3.3 8.1 10 3.2C17 -1.9 27.5 -.9 33.1 6.2C33.4 6.7 33.7 6.6 34.1 6.6C39.4 6.4 43.1 8.6 45.3 13.4C45.9 14.7 46.3 16.1 46.6 17.5C47.6 23.2 46.7 28.5 42.8 33C38.3 38.2 32.5 40.2 25.6 39.2C25.1 39.1 24.7 39.1 24.2 39.5C19.2 42.8 14 42.7 8.9 39.8C4.3 37.1 1.8 32.8.6 27.8C.3 26.2.2 24.5 0 23.2ZM30.6 7C29.7 6.2 28.7 5.3 27.7 4.7C21.9 1.1 14.4 2 9.4 6.8C5.4 10.7 3.2 15.5 2.7 21C2.2 25.7 3.2 30.1 6.1 33.9C8.9 37.7 12.7 39.8 17.5 39.4C19 39.3 20.4 38.9 21.8 38.1C21.2 37.8 20.7 37.6 20.3 37.3C16.8 35.3 14.5 32.6 14.9 28.3C14.9 28 14.7 27.7 14.5 27.5C13.6 26.6 12.6 25.8 11.7 24.8C9.4 22.2 8 19.3 8 15.8C8 11.3 10.6 7.9 14.6 6.9C16.5 6.4 18.6 6.4 20.5 7.2C22.1 7.9 23.7 8.8 25.3 9.6C26.9 8.8 28.7 7.9 30.6 7ZM27.1 36.9C27.2 36.9 27.3 37 27.4 37C34.4 37.7 41.5 33.3 43.7 26.6C44.5 24.1 44.7 21.5 44.4 18.9C44 16.3 43.2 13.8 41.4 11.8C39.8 9.9 37.6 9.1 35.1 9.1C35.7 10.5 36.3 11.8 36.8 13.2C37.6 15.8 38.1 18.3 37.4 21C37.3 21.6 37.4 22.1 37.7 22.7C40.4 27.1 38.4 32.3 33.4 33.7C32.2 34.1 30.8 34 29.4 34.1C29.1 34.1 28.8 34.2 28.6 34.4C28.1 35.2 27.6 36 27.1 36.9ZM15.8 25.3C16.7 23.4 17.9 21.8 19.5 20.5C19.7 20.4 19.7 20.1 19.7 19.9C19.7 17 20.7 14.5 22.6 12.3C22.8 12 23 11.8 23.3 11.5C22 10.4 20.7 9.7 19.1 9.3C14.1 8 10.1 11.2 10.4 16.4C10.7 20.2 13 22.9 15.8 25.3ZM35.2 19.8C35.2 19.2 35.3 18.9 35.3 18.5C35.2 15.3 34.1 12.4 32.5 9.7C32.4 9.5 32 9.4 31.8 9.4C30.1 9.9 28.5 10.6 27 11.6C28.3 13.3 29.3 15.2 30.1 17.2C30.1 17.3 30.3 17.5 30.4 17.5C32.1 17.9 33.7 18.6 35.2 19.8ZM20.5 23C19.3 24 18.5 25.2 17.9 26.7C17.9 26.8 18.1 27.1 18.3 27.2C19.4 27.9 20.5 28.6 21.6 29.2C23.4 30.2 25.3 30.9 27.4 31.3C27.7 30 28 28.8 28.4 27.5C25 27.2 22.3 26 20.5 23ZM35.8 24.4C34.5 25.9 33 26.8 31.2 27.2C31.1 27.3 30.8 27.4 30.8 27.6C30.5 28.9 30.2 30.2 29.9 31.7C32.1 31.8 34.1 31.3 35.5 29.5C36.7 28 36.7 26.2 35.8 24.4ZM26.4 33.6C23 32.8 20.2 31.4 17.4 29.8C17.5 30.5 17.6 31.2 18 31.8C19.2 34.2 21.4 35.4 23.9 36.2C24.1 36.3 24.4 36.2 24.5 36C25.1 35.3 25.7 34.5 26.4 33.6ZM22.6 21.4C23.3 23.5 26.3 25.3 28.6 25C28.7 23.2 28.6 21.4 28.2 19.7C26.1 19.7 24.3 20.4 22.6 21.4ZM25.1 13.1C23.6 14.8 22.5 16.5 22.3 18.5C24 18.1 25.7 17.6 27.5 17C26.7 15.8 25.9 14.5 25.1 13.1ZM31.2 24.7C32.5 24.2 33.5 23.5 34.3 22.3C33.3 21.3 32.2 20.6 30.9 20.2C31 21.7 31.1 23.2 31.2 24.7Z"/>`
const WAVES = `<g fill="${INK}"><path transform="translate(11.774 0)" d="M10.1 16.5C9.9 17.6 9.7 18.7 9.5 19.7C8.5 23.6 6.4 26.8 3.4 29.5C2.4 30.3 1.3 30.3.5 29.4C-.3 28.6-.1 27.4.8 26.5C4.4 23.3 6.3 19.4 6.1 14.6C6 10.2 4.2 6.6 1 3.7C.5 3.3.1 2.8 0 2.1C0 1.3.3.6 1 .3C1.8-.2 2.6-.1 3.3.5C5.2 2.1 6.7 4 7.9 6.2C9 8.4 9.7 10.7 10 13.2C10 13.3 10 13.5 10.1 13.6V16.5Z"/><path transform="translate(6.471 5.246)" d="M7.6 10C7.5 13.5 6.2 16.5 3.4 19C2.4 19.8 1.2 19.8.5 18.9C-.3 18.1-.1 16.9.8 16.1C4.6 12.6 4.6 7 .8 3.6C-.1 2.7-.3 1.5.5.7C1.2-.2 2.4-.2 3.4.6C6.1 2.9 7.6 6.3 7.6 10Z"/><path transform="translate(0 9.169)" d="M5.8 5.9C5.7 8 4.9 9.8 3.3 11.2C2.5 12 1.3 11.9.5 11.1C-.2 10.3-.2 9.2.7 8.3C2.2 6.8 2.2 5 .7 3.5C-.2 2.6-.2 1.4.5.6C1.3-.2 2.5-.2 3.4.6C4.9 2 5.7 3.8 5.8 5.9Z"/></g>`
const PULSE = `<polyline class="b-pulse" pathLength="1" fill="none" stroke="${BLUE}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" points="0 9 4.3 9 6.5 3.5 9.5 19 16.5 1.5 18 14 22 6.5 24 9 28.2 9"/>`
const PHONE = `<g fill="none" stroke="${INK}" stroke-width="2.2"><rect x="1.2" y="1.2" width="37.6" height="67.6" rx="4.5"/><circle cx="20" cy="61.2" r="2.6"/><path d="M16.5 6.2h7" stroke-linecap="round"/></g>${use(PULSE, 5.8, 24)}`
const WATCH = `<g fill="${INK}"><path d="M21 1.5Q21 0 22.5 0H41.5Q43 0 43 1.5L44.6 11H19.4Z"/><path d="M19.4 53H44.6L43 62.5Q43 64 41.5 64H22.5Q21 64 21 62.5Z"/><rect x="48.5" y="22" width="3.2" height="8" rx="1"/><rect x="48.5" y="34" width="3.2" height="8" rx="1"/></g><rect x="14.5" y="14" width="34" height="36" rx="8" fill="#fff" stroke="${INK}" stroke-width="4"/>`
const SPARK = `<path class="b-spark" fill="none" stroke="${BLUE}" stroke-width="3" stroke-linejoin="round" d="M32 2C33 22 35 30 62 32C35 34 33 42 32 62C31 42 29 34 2 32C29 30 31 22 32 2Z"/>`
const dot = (x: number, y: number) => `<circle class="b-dot" cx="${x}" cy="${y}" r="7" fill="${BLUE}"/>`

type Frame = { ai?: boolean; title: string; line: string; art: (x: number, y: number) => string }
const FRAMES: Frame[] = [
  { title: 'Your watch', line: 'notices your body change', art: (x, y) => use(WATCH, x + 52, y + 20, 1.5) + use(PULSE, x + 80, y + 58, 1.15) },
  {
    title: 'A gentle tap',
    line: 'asks how you feel',
    art: (x, y) =>
      use(WATCH, x + 52, y + 20, 1.5) +
      dot(x + 150, y + 22) +
      `<g class="b-buzz" fill="none" stroke="${BLUE}" stroke-width="2" stroke-linecap="round"><path d="M${x + 36} ${y + 50}q-10 20 0 40M${x + 24} ${y + 42}q-16 28 0 56M${x + 164} ${y + 50}q10 20 0 40M${x + 176} ${y + 42}q16 28 0 56"/></g>`,
  },
  { title: 'You speak', line: 'a short voice note', art: (x, y) => use(HEAD, x + 44, y + 12, 0.95) + `<g class="b-brain">${use(BRAIN, x + 70, y + 36, 0.9)}</g>` + use(WAVES, x + 160, y + 92, 0.95) },
  { ai: true, title: 'Re:Self AI', line: 'reads it with your body data', art: (x, y) => use(SPARK, x + 68, y + 38, 1) + use(PULSE, x + 14, y + 60, 1.4) + use(PULSE, x + 146, y + 60, 1.4) },
  { title: 'Your phone', line: 'name it, review your day', art: (x, y) => use(PHONE, x + 76, y + 14, 1.75) + dot(x + 164, y + 22) },
]

export function productFlowSvg(): string {
  const W = 1400, H = 560, CW = 236, GAP = 30, TOP = 64, CH = 360
  const X0 = (W - (FRAMES.length * CW + (FRAMES.length - 1) * GAP)) / 2
  let b = `<defs>${chevron('rf-a', STONE)}${chevron('rf-b', BLUE)}</defs>`
  FRAMES.forEach((f, i) => {
    const x = X0 + i * (CW + GAP), cx = x + CW / 2
    b += `<g style="--i:${i}"><rect x="${x}" y="${TOP}" width="${CW}" height="${CH}" rx="24" fill="${f.ai ? '#eef8ff' : '#fff'}"/>`
    b += text(x + 24, TOP + 42, `0${i + 1}`, { size: 14, fill: STONE, anchor: 'start' })
    b += f.art(cx - 100, TOP + 70)
    b += text(cx, TOP + 278, f.title, { size: 21, weight: 500 }) + text(cx, TOP + 306, f.line, { size: 16, fill: STONE }) + '</g>'
    if (i < FRAMES.length - 1) b += `<path d="M${x + CW + 6} ${TOP + CH / 2}H${x + CW + GAP - 6}" stroke="${STONE}" stroke-width="1.5" marker-end="url(#rf-a)"/>`
  })
  // Loop back: every named moment teaches the model this person's baseline.
  const last = X0 + (FRAMES.length - 1) * (CW + GAP) + CW / 2, first = X0 + CW / 2, ly = TOP + CH + 56
  b += `<path class="b-loop" d="M${last} ${TOP + CH + 12}V${ly - 12}Q${last} ${ly} ${last - 12} ${ly}H${first + 12}Q${first} ${ly} ${first} ${ly - 12}V${TOP + CH + 14}" fill="none" stroke="${BLUE}" stroke-width="1.8" stroke-dasharray="3 7" stroke-linecap="round" marker-end="url(#rf-b)"/>`
  b += `<rect x="${W / 2 - 128}" y="${ly - 16}" width="256" height="32" fill="var(--paper, #f5f5f5)"/>` + text(W / 2, ly + 6, 'and learns you over time', { size: 16, fill: BLUE })
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}" letter-spacing="-0.02em" role="img" aria-label="How Re:Self works: your watch notices your body change, a gentle tap asks how you feel, you speak a short voice note, Re:Self AI reads it with your body data, your phone lets you name it and review your day, and it learns you over time.">${b}</svg>`
}

// ---------- Overview: the vision in one line (body → prompt → voice → plan) ----------
/**
 * A heart-rate trace that spikes, is caught (blue ring), and resolves into a calm line
 * with an if-then plan: the whole product in one gesture. Blue parts carry b-* classes.
 */
export function visionSvg(): string {
  const W = 640, H = 520
  const trace = 'M20 300 L120 300 L140 290 L160 300 L230 300 L250 250 L268 330 L290 200 L310 360 L330 300 L380 300'
  const calm = 'M380 300 C430 300 440 300 480 300 C520 300 540 300 620 300'
  let b = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}" role="img" aria-label="A stress spike is noticed, reflected on, and turned into a plan">`
  b += `<path d="${trace}" fill="none" stroke="${INK}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"/>`
  b += `<path class="b-calm" pathLength="1" d="${calm}" fill="none" stroke="${BLUE}" stroke-width="4" stroke-linecap="round"/>`
  b += `<circle class="b-ring" cx="290" cy="280" r="74" fill="none" stroke="${BLUE}" stroke-width="3" stroke-dasharray="6 9"/>`
  b += dot(290, 200)
  b += use(WATCH, 258, 98, 1)
  b += text(290, 86, 'Your watch notices', { size: 18, weight: 500 })
  b += use(WAVES, 360, 370, 1.4)
  b += text(290, 420, 'You say what happened', { size: 18, weight: 500 })
  b += text(290, 446, '30 seconds, out loud', { size: 15, fill: STONE })
  b += text(508, 262, 'If tired at dinner,', { size: 17, weight: 500 })
  b += text(508, 286, 'then pause.', { size: 17, weight: 500, fill: BLUE })
  b += text(508, 336, 'A plan for next time', { size: 15, fill: STONE })
  return b + '</svg>'
}

// ---------- Context: a personal baseline with the signals it reads ----------
/**
 * Three stacked signal rows drawn against a shaded personal baseline band; one moment
 * leaves the band together across all three (blue), which is what gets flagged.
 */
export function signalsSvg(): string {
  const W = 620, H = 500, L = 140, R = 590
  const rows: Array<{ y: number; name: string; up: boolean }> = [
    { y: 110, name: 'Heart rate', up: true },
    { y: 250, name: 'HRV', up: false },
    { y: 390, name: 'Motion', up: false },
  ]
  let b = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}" role="img" aria-label="Heart rate, HRV and motion read against your own baseline">`
  b += `<rect class="b-moment" x="352" y="40" width="96" height="420" rx="14" fill="${BLUE}" fill-opacity="0.12"/>`
  for (const [i, r] of rows.entries()) {
    b += `<rect x="${L}" y="${r.y - 22}" width="${R - L}" height="44" rx="10" fill="${INK}" fill-opacity="0.05"/>`
    b += text(L - 18, r.y + 6, r.name, { size: 17, weight: 500, anchor: 'end' })
    const pts: string[] = []
    for (let x = L; x <= R; x += 10) {
      const wob = Math.sin(x * 0.07 + i) * 6 + Math.sin(x * 0.19 + i * 2) * 3
      const inMoment = x >= 360 && x <= 440
      const shift = inMoment ? (r.up ? -1 : 1) * (i === 2 ? 2 : 34) * Math.sin(((x - 360) / 80) * Math.PI) : 0
      pts.push(`${x} ${(r.y + wob + shift).toFixed(1)}`)
    }
    b += `<polyline points="${pts.join(' ')}" fill="none" stroke="${INK}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`
  }
  b += text(400, 486, 'Flagged: arousal without movement', { size: 15, fill: BLUE })
  b += text(L, 486, 'Your baseline', { size: 15, fill: STONE, anchor: 'start' })
  return b + '</svg>'
}
