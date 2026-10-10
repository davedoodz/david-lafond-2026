/**
 * WebGL2 grass field for the contribution graph: one rounded ground tile per day and,
 * on days with contributions, a patch of instanced grass blades whose height follows the
 * day's count. Blades sway on a shared wind field and part around the pointer.
 *
 * World units: one tile pitch = 1. x = week column, z = weekday row (Sunday at the back),
 * y = up. No dependencies: the camera, fit and picking maths live here.
 */

export type GrassDay = { count: number; level: number } | null
export type Palette = 'green' | 'mono'

type Mat4 = Float32Array

/** Root and tip colours per GitHub level (0 is the bare tile colour). */
const PALETTES: Record<Palette, { root: string[]; tip: string[]; ground: string }> = {
  green: {
    root: ['#232323', '#0b3a20', '#0a4d25', '#0f6128', '#137a2d'],
    tip: ['#232323', '#2a8a4e', '#2bb350', '#47d062', '#74f487'],
    ground: '#232323',
  },
  mono: {
    root: ['#232323', '#262626', '#2e2e2e', '#383838', '#444444'],
    tip: ['#232323', '#545454', '#858585', '#b8b8b8', '#f5f5f5'],
    ground: '#232323',
  },
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)

// ---------- Matrices (column-major, like WebGL) ----------

function multiply(a: Mat4, b: Mat4): Mat4 {
  const out = new Float32Array(16)
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++) {
      let sum = 0
      for (let k = 0; k < 4; k++) sum += a[k * 4 + r] * b[c * 4 + k]
      out[c * 4 + r] = sum
    }
  return out
}

function perspective(fovy: number, near: number, far: number): Mat4 {
  const f = 1 / Math.tan(fovy / 2)
  const out = new Float32Array(16)
  out[0] = f
  out[5] = f
  out[10] = (far + near) / (near - far)
  out[11] = -1
  out[14] = (2 * far * near) / (near - far)
  return out
}

function lookAt(eye: number[], center: number[], up: number[]): Mat4 {
  const sub = (a: number[], b: number[]) => a.map((v, i) => v - b[i])
  const norm = (v: number[]) => {
    const l = Math.hypot(...v)
    return v.map((x) => x / l)
  }
  const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
  const dot = (a: number[], b: number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
  const z = norm(sub(eye, center))
  const x = norm(cross(up, z))
  const y = cross(z, x)
  return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1])
}

function invert(m: Mat4): Mat4 {
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m
  const b00 = a00 * a11 - a01 * a10
  const b01 = a00 * a12 - a02 * a10
  const b02 = a00 * a13 - a03 * a10
  const b03 = a01 * a12 - a02 * a11
  const b04 = a01 * a13 - a03 * a11
  const b05 = a02 * a13 - a03 * a12
  const b06 = a20 * a31 - a21 * a30
  const b07 = a20 * a32 - a22 * a30
  const b08 = a20 * a33 - a23 * a30
  const b09 = a21 * a32 - a22 * a31
  const b10 = a21 * a33 - a23 * a31
  const b11 = a22 * a33 - a23 * a32
  const det = 1 / (b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06)
  return new Float32Array([
    (a11 * b11 - a12 * b10 + a13 * b09) * det,
    (a02 * b10 - a01 * b11 - a03 * b09) * det,
    (a31 * b05 - a32 * b04 + a33 * b03) * det,
    (a22 * b04 - a21 * b05 - a23 * b03) * det,
    (a12 * b08 - a10 * b11 - a13 * b07) * det,
    (a00 * b11 - a02 * b08 + a03 * b07) * det,
    (a32 * b02 - a30 * b05 - a33 * b01) * det,
    (a20 * b05 - a22 * b02 + a23 * b01) * det,
    (a10 * b10 - a11 * b08 + a13 * b06) * det,
    (a01 * b08 - a00 * b10 - a03 * b06) * det,
    (a30 * b04 - a31 * b02 + a33 * b00) * det,
    (a21 * b02 - a20 * b04 - a23 * b00) * det,
    (a11 * b07 - a10 * b09 - a12 * b06) * det,
    (a00 * b09 - a01 * b07 + a02 * b06) * det,
    (a31 * b01 - a30 * b03 - a32 * b00) * det,
    (a20 * b03 - a21 * b01 + a22 * b00) * det,
  ])
}

function apply(m: Mat4, x: number, y: number, z: number, w = 1) {
  return [0, 1, 2, 3].map((r) => m[r] * x + m[4 + r] * y + m[8 + r] * z + m[12 + r] * w)
}

// ---------- Camera fit ----------

export type View = {
  mvp: Mat4
  inverse: Mat4
  /** Canvas width / height that frames the field without distortion. */
  aspect: number
}

/**
 * Looks down at the field from the front at `tiltDeg` above the ground, then scales clip
 * space so the whole field (tiles plus the tallest, most bent grass) fills the canvas.
 */
export function fitView(weeks: number, tiltDeg: number, maxHeight: number): View {
  const center = [(weeks - 1) / 2, 0, 3]
  const tilt = (tiltDeg * Math.PI) / 180
  const distance = 30
  const eye = [center[0], center[1] + Math.sin(tilt) * distance, center[2] + Math.cos(tilt) * distance]
  const base = multiply(perspective((26 * Math.PI) / 180, 1, 200), lookAt(eye, center, [0, 1, 0]))

  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  // Bend margin: wind and the pointer can lean the tallest blades about half their height.
  const reach = 0.3 + maxHeight * 0.5
  for (const x of [-0.5 - reach, weeks - 0.5 + reach])
    for (const z of [-0.5 - reach * 0.5, 6.5 + reach * 0.5])
      for (const y of [0, maxHeight]) {
        const [cx, cy, , cw] = apply(base, x, y, z)
        minX = Math.min(minX, cx / cw)
        maxX = Math.max(maxX, cx / cw)
        minY = Math.min(minY, cy / cw)
        maxY = Math.max(maxY, cy / cw)
      }
  const sx = 2 / (maxX - minX)
  const sy = 2 / (maxY - minY)
  const fit = new Float32Array(16)
  fit[0] = sx
  fit[5] = sy
  fit[10] = 1
  fit[15] = 1
  fit[12] = -sx * ((minX + maxX) / 2)
  fit[13] = -sy * ((minY + maxY) / 2)
  const mvp = multiply(fit, base)
  return { mvp, inverse: invert(mvp), aspect: (maxX - minX) / (maxY - minY) }
}

/** World point to CSS pixels inside a canvas of `width` x `height`. */
export function project(view: View, width: number, height: number, x: number, y: number, z: number) {
  const [cx, cy, , cw] = apply(view.mvp, x, y, z)
  return { x: ((cx / cw + 1) / 2) * width, y: ((1 - cy / cw) / 2) * height }
}

/** CSS pixel to the ground plane (y = 0); returns world x/z or null when the ray misses. */
export function toGround(view: View, width: number, height: number, px: number, py: number) {
  const nx = (px / width) * 2 - 1
  const ny = 1 - (py / height) * 2
  const near = apply(view.inverse, nx, ny, -1)
  const far = apply(view.inverse, nx, ny, 1)
  const a = near.map((v) => v / near[3])
  const b = far.map((v) => v / far[3])
  const dy = b[1] - a[1]
  if (Math.abs(dy) < 1e-6) return null
  const t = -a[1] / dy
  if (t < 0) return null
  return { x: a[0] + (b[0] - a[0]) * t, z: a[2] + (b[2] - a[2]) * t }
}

// ---------- Blades ----------

/** Deterministic per-tile randomness, so the field looks the same on every visit. */
function random(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const TILE_HALF = 0.42
const FLOATS_PER_BLADE = 8

/**
 * Two vec4s per blade: (x, z, normalised height, facing) and (phase, level, width, tone).
 * Height is 0.22 to 1 of the field's tallest grass, by the square root of the day's share of
 * the busiest day, so a single contribution still reads as grass.
 */
export function buildBlades(weeks: GrassDay[][], density: number) {
  const max = Math.max(1, ...weeks.flat().map((d) => d?.count ?? 0))
  const blades: number[] = []
  weeks.forEach((week, x) =>
    week.forEach((day, z) => {
      if (!day || day.count === 0) return
      const rand = random(x * 131 + z * 17 + 7)
      const share = 0.22 + 0.78 * Math.sqrt(day.count / max)
      const count = Math.round(density * (0.75 + 0.25 * (day.level / 4)))
      for (let i = 0; i < count; i++) {
        blades.push(
          x + (rand() * 2 - 1) * TILE_HALF * 0.92,
          z + (rand() * 2 - 1) * TILE_HALF * 0.92,
          share * (0.7 + rand() * 0.35),
          rand() * Math.PI,
          rand() * Math.PI * 2,
          Math.max(1, Math.min(4, day.level)),
          0.75 + rand() * 0.5,
          0.82 + rand() * 0.3,
        )
      }
    }),
  )
  return new Float32Array(blades)
}

/** One vec4 per tile: (x, z, level, has grass). */
export function buildTiles(weeks: GrassDay[][]) {
  const tiles: number[] = []
  weeks.forEach((week, x) =>
    week.forEach((day, z) => {
      if (day) tiles.push(x, z, day.level, day.count > 0 ? 1 : 0)
    }),
  )
  return new Float32Array(tiles)
}

// ---------- Shaders ----------

const BLADE_VS = `#version 300 es
in vec4 aBlade;
in vec4 aMeta;
uniform mat4 uMVP;
uniform float uTime, uHeight, uWidth, uWind, uRadius, uPush;
uniform vec3 uPointer;
uniform vec2 uHover;
uniform vec3 uRoot[5];
uniform vec3 uTip[5];
out vec3 vColor;
void main() {
  int id = gl_VertexID;
  float t = id >= 8 ? 1.0 : float(id / 2) / 4.0;
  float side = id >= 8 ? 0.0 : (id % 2 == 0 ? -1.0 : 1.0);
  vec2 base = aBlade.xy;
  float h = aBlade.z * uHeight;
  float phase = aMeta.x;

  // Wind: two travelling waves across the field plus a small resting lean per blade.
  float gust = sin(uTime * 1.3 + base.x * 0.45 + base.y * 0.3 + phase) * 0.55
             + sin(uTime * 2.9 - base.x * 1.1 + base.y * 0.7 + phase * 2.0) * 0.2;
  vec2 bend = vec2(0.55, 0.2) * uWind * (0.45 + gust) + vec2(cos(phase * 3.0), sin(phase * 3.0)) * 0.12;

  // Pointer: blades within uRadius part away from it, strongest at the centre.
  vec2 away = base - uPointer.xy;
  float dist = length(away);
  float push = uPointer.z * uPush * (1.0 - smoothstep(0.0, uRadius, dist));
  bend += (dist > 1e-4 ? away / dist : vec2(0.0, 1.0)) * push * 1.3;

  float k = t * t;
  vec2 offset = bend * k * h;
  float droop = 1.0 - 0.35 * min(dot(bend, bend), 1.0) * t;
  vec2 facing = vec2(cos(aBlade.w), sin(aBlade.w));
  float w = aMeta.z * uWidth * 0.07 * (1.0 - t * 0.92);
  vec3 pos = vec3(base.x + offset.x + facing.x * w * side, t * h * droop, base.y + offset.y + facing.y * w * side);
  gl_Position = uMVP * vec4(pos, 1.0);

  int level = int(aMeta.y);
  vec3 color = mix(uRoot[level], uTip[level], t);
  float hovered = all(lessThan(abs(round(base) - uHover), vec2(0.5))) ? 1.3 : 1.0;
  vColor = color * (0.45 + 0.55 * t) * aMeta.w * hovered * (0.9 + 0.1 * side * facing.x);
}`

const BLADE_FS = `#version 300 es
precision mediump float;
in vec3 vColor;
out vec4 outColor;
void main() { outColor = vec4(vColor, 1.0); }`

const TILE_VS = `#version 300 es
in vec4 aTile;
uniform mat4 uMVP;
uniform float uHalf;
uniform vec2 uHover;
uniform vec3 uRoot[5];
uniform vec3 uGround;
out vec2 vLocal;
out vec3 vColor;
void main() {
  vec2 corner = vec2(gl_VertexID % 2 == 0 ? -1.0 : 1.0, gl_VertexID < 2 ? -1.0 : 1.0);
  vLocal = corner;
  gl_Position = uMVP * vec4(aTile.x + corner.x * uHalf, 0.0, aTile.y + corner.y * uHalf, 1.0);
  vec3 soil = uRoot[int(aTile.z)] * 0.8;
  float hovered = all(lessThan(abs(aTile.xy - uHover), vec2(0.5))) ? 1.6 : 1.0;
  vColor = (aTile.w > 0.5 ? soil : uGround) * hovered;
}`

const TILE_FS = `#version 300 es
precision mediump float;
in vec2 vLocal;
in vec3 vColor;
uniform float uCorner;
out vec4 outColor;
void main() {
  vec2 q = abs(vLocal) - (1.0 - uCorner);
  if (length(max(q, 0.0)) > uCorner) discard;
  outColor = vec4(vColor, 1.0);
}`

function compile(gl: WebGL2RenderingContext, vs: string, fs: string) {
  const program = gl.createProgram()!
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ] as const) {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader')
    gl.attachShader(program, shader)
  }
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link')
  return program
}

export type FrameParams = {
  time: number
  height: number
  width: number
  wind: number
  radius: number
  push: number
  /** Pointer on the ground (x, z) and its strength 0-1. */
  pointer: [number, number, number]
  /** Hovered tile (week, row), or far away for none. */
  hover: [number, number]
}

export class GrassRenderer {
  private gl: WebGL2RenderingContext
  private blade: WebGLProgram
  private tile: WebGLProgram
  private bladeVao: WebGLVertexArrayObject
  private tileVao: WebGLVertexArrayObject
  private bladeBuffer: WebGLBuffer
  private tileBuffer: WebGLBuffer
  private bladeCount = 0
  private tileCount = 0
  private palette: Palette = 'green'

  /** Throws when WebGL2 is unavailable; the caller falls back to flat tiles. */
  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext('webgl2', { antialias: true, premultipliedAlpha: true, alpha: true })
    if (!gl) throw new Error('webgl2 unavailable')
    this.gl = gl
    this.blade = compile(gl, BLADE_VS, BLADE_FS)
    this.tile = compile(gl, TILE_VS, TILE_FS)

    this.bladeBuffer = gl.createBuffer()!
    this.bladeVao = gl.createVertexArray()!
    gl.bindVertexArray(this.bladeVao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bladeBuffer)
    const stride = FLOATS_PER_BLADE * 4
    for (const [name, offset] of [
      ['aBlade', 0],
      ['aMeta', 16],
    ] as const) {
      const loc = gl.getAttribLocation(this.blade, name)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, stride, offset)
      gl.vertexAttribDivisor(loc, 1)
    }

    this.tileBuffer = gl.createBuffer()!
    this.tileVao = gl.createVertexArray()!
    gl.bindVertexArray(this.tileVao)
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tileBuffer)
    const loc = gl.getAttribLocation(this.tile, 'aTile')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 16, 0)
    gl.vertexAttribDivisor(loc, 1)
    gl.bindVertexArray(null)

    gl.enable(gl.DEPTH_TEST)
  }

  setBlades(data: Float32Array) {
    const { gl } = this
    gl.bindBuffer(gl.ARRAY_BUFFER, this.bladeBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
    this.bladeCount = data.length / FLOATS_PER_BLADE
  }

  setTiles(data: Float32Array) {
    const { gl } = this
    gl.bindBuffer(gl.ARRAY_BUFFER, this.tileBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
    this.tileCount = data.length / 4
  }

  setPalette(palette: Palette) {
    this.palette = palette
  }

  draw(view: View, frame: FrameParams) {
    const { gl } = this
    const colors = PALETTES[this.palette]
    const root = new Float32Array(colors.root.flatMap(rgb))
    const tip = new Float32Array(colors.tip.flatMap(rgb))

    gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

    gl.useProgram(this.tile)
    gl.uniformMatrix4fv(gl.getUniformLocation(this.tile, 'uMVP'), false, view.mvp)
    gl.uniform1f(gl.getUniformLocation(this.tile, 'uHalf'), TILE_HALF)
    gl.uniform1f(gl.getUniformLocation(this.tile, 'uCorner'), 0.22)
    gl.uniform2fv(gl.getUniformLocation(this.tile, 'uHover'), frame.hover)
    gl.uniform3fv(gl.getUniformLocation(this.tile, 'uRoot'), root)
    gl.uniform3fv(gl.getUniformLocation(this.tile, 'uGround'), rgb(colors.ground))
    gl.bindVertexArray(this.tileVao)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.tileCount)

    gl.useProgram(this.blade)
    const u = (name: string) => gl.getUniformLocation(this.blade, name)
    gl.uniformMatrix4fv(u('uMVP'), false, view.mvp)
    gl.uniform1f(u('uTime'), frame.time)
    gl.uniform1f(u('uHeight'), frame.height)
    gl.uniform1f(u('uWidth'), frame.width)
    gl.uniform1f(u('uWind'), frame.wind)
    gl.uniform1f(u('uRadius'), frame.radius)
    gl.uniform1f(u('uPush'), frame.push)
    gl.uniform3fv(u('uPointer'), frame.pointer)
    gl.uniform2fv(u('uHover'), frame.hover)
    gl.uniform3fv(u('uRoot'), root)
    gl.uniform3fv(u('uTip'), tip)
    gl.bindVertexArray(this.bladeVao)
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 9, this.bladeCount)
    gl.bindVertexArray(null)
  }

  destroy() {
    const { gl } = this
    gl.deleteBuffer(this.bladeBuffer)
    gl.deleteBuffer(this.tileBuffer)
    gl.deleteVertexArray(this.bladeVao)
    gl.deleteVertexArray(this.tileVao)
    gl.deleteProgram(this.blade)
    gl.deleteProgram(this.tile)
  }
}
