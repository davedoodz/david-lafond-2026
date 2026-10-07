/* eslint-disable */
/**
 * The Momo voice band (the "braid"): four soft ribbons that swell with the voice level.
 * Drawn in a 960×540 scene, centred on (480, 245). The glow is drawn at half resolution and
 * composited at full size, so it reads soft at any scale. Shared by the case-study intro
 * (src/features/momoIntro) and the studio pages.
 */
const W = 960, H = 540, TAU = Math.PI * 2
const GX = 480, GY = 245
const PALETTE = ['#53BFFE', '#00D0FF', '#B9A7F5', '#FFB3C7']
const BAND = { width: 320, thick: 9, thickReact: 20, amp: 18, ampReact: 44, freq: 0.02, speed: 0.9, phase: 2.4, blur: 2.5 }
const DRIFT = 0.5
/** Full length of the band at scale 1 (scene px). */
export const BRAID_W = 2 * BAND.width * 0.87

let RT = 0
/** Band clock (s): the ribbons travel with it. */
export const setRT = (v) => { RT = v }

const hexA = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})` }
const GW = 480, GH = 270
let glow = null, g = null

function drawGlow(ctx, env) {
  if (!glow) { glow = document.createElement('canvas'); glow.width = GW; glow.height = GH; g = glow.getContext('2d') }
  g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, GW, GH); g.setTransform(GW / W, 0, 0, GH / H, 0, 0)
  const half = BAND.width * 0.87, amp = BAND.amp + BAND.ampReact * env
  PALETTE.forEach((col, k) => {
    const a = (k / PALETTE.length) * TAU + RT * DRIFT * (1 + k * 0.15)
    const loud = env * (0.6 + 0.4 * Math.abs(Math.sin(a * 5.9 + RT * 3)))
    const th = BAND.thick + BAND.thickReact * loud + 4
    const alpha = k === 0 ? 0.78 : 0.62
    const lg = g.createLinearGradient(GX - half, 0, GX + half, 0)
    lg.addColorStop(0, hexA(col, 0)); lg.addColorStop(0.5, hexA(col, alpha)); lg.addColorStop(1, hexA(col, 0))
    const yAt = (x, o) => GY + o + amp * Math.exp(-(((x - GX) / (half * 0.55)) ** 2)) * Math.sin(x * BAND.freq * (1 + k * 0.25) + RT * BAND.speed * (1 + k * 0.35) + k * BAND.phase)
    g.save(); g.filter = `blur(${BAND.blur}px)`; g.fillStyle = lg; g.beginPath()
    for (let x = GX - half; x <= GX + half; x += 6) x === GX - half ? g.moveTo(x, yAt(x, -th / 2)) : g.lineTo(x, yAt(x, -th / 2))
    for (let x = GX + half; x >= GX - half; x -= 6) g.lineTo(x, yAt(x, th / 2) + th * 0.3 * Math.sin(x * 0.05 - RT * 1.5 * BAND.speed))
    g.closePath(); g.fill(); g.restore()
  })
  ctx.save(); ctx.imageSmoothingQuality = 'high'; ctx.drawImage(glow, 0, 0, W, H); ctx.restore()
}

/** The band alone. m = [scale, offsetX, offsetY] maps the 960×540 scene into ctx pixels. */
export function drawBraid(ctx, m, { env = 0.15, alpha = 1 } = {}) {
  if (alpha <= 0.01) return
  ctx.save()
  ctx.setTransform(m[0], 0, 0, m[0], m[1], m[2]); ctx.globalAlpha = alpha
  drawGlow(ctx, env)
  ctx.restore()
}
