/**
 * Small procedural 3D creature (Pikachu-style fan model) drawn into the grass field's own WebGL2
 * context, after the grass, so the blades' depth hides whatever is behind them. World units match
 * grassField.ts: one tile pitch = 1, y up, the camera in front (+z). The model's feet sit on y = 0,
 * it faces +z, and it is about 1 unit tall at scale 1. Fragments below the ground are discarded,
 * so it can rise out of (and dive back into) a patch.
 */

type Mat4 = Float32Array
type Vec3 = [number, number, number]

// ---------- Matrices (column-major, like WebGL) ----------

const identity = (): Mat4 => {
  const m = new Float32Array(16)
  m[0] = m[5] = m[10] = m[15] = 1
  return m
}

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

const chain = (...ms: Mat4[]) => ms.reduce(multiply)

const translate = (x: number, y: number, z: number) => {
  const m = identity()
  m[12] = x
  m[13] = y
  m[14] = z
  return m
}

const scale = (x: number, y: number, z: number) => {
  const m = identity()
  m[0] = x
  m[5] = y
  m[10] = z
  return m
}

const rotateX = (a: number) => {
  const m = identity()
  const c = Math.cos(a)
  const s = Math.sin(a)
  m[5] = c
  m[6] = s
  m[9] = -s
  m[10] = c
  return m
}

const rotateY = (a: number) => {
  const m = identity()
  const c = Math.cos(a)
  const s = Math.sin(a)
  m[0] = c
  m[2] = -s
  m[8] = s
  m[10] = c
  return m
}

const rotateZ = (a: number) => {
  const m = identity()
  const c = Math.cos(a)
  const s = Math.sin(a)
  m[0] = c
  m[1] = s
  m[4] = -s
  m[5] = c
  return m
}

/** Inverse-transpose of the model's 3x3 (up to its determinant, which the shader normalises away). */
function normalMatrix(m: Mat4) {
  const a = [m[0], m[1], m[2]]
  const b = [m[4], m[5], m[6]]
  const c = [m[8], m[9], m[10]]
  const cross = (u: number[], v: number[]) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]]
  return new Float32Array([...cross(b, c), ...cross(c, a), ...cross(a, b)])
}

// ---------- Geometry ----------

type Mesh = { positions: Float32Array; normals: Float32Array; indices: Uint16Array }

function sphere(rings = 18, segments = 28): Mesh {
  const positions: number[] = []
  const indices: number[] = []
  for (let r = 0; r <= rings; r++) {
    const phi = (r / rings) * Math.PI
    for (let s = 0; s <= segments; s++) {
      const theta = (s / segments) * Math.PI * 2
      positions.push(Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta))
    }
  }
  for (let r = 0; r < rings; r++)
    for (let s = 0; s < segments; s++) {
      const a = r * (segments + 1) + s
      const b = a + segments + 1
      indices.push(a, b, a + 1, b, b + 1, a + 1)
    }
  const p = new Float32Array(positions)
  return { positions: p, normals: p, indices: new Uint16Array(indices) }
}

function box(): Mesh {
  const positions: number[] = []
  const normals: number[] = []
  const indices: number[] = []
  const faces: [Vec3, Vec3, Vec3][] = [
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    [[-1, 0, 0], [0, 0, 1], [0, 1, 0]],
    [[0, 1, 0], [0, 0, 1], [1, 0, 0]],
    [[0, -1, 0], [1, 0, 0], [0, 0, 1]],
    [[0, 0, 1], [1, 0, 0], [0, 1, 0]],
    [[0, 0, -1], [0, 1, 0], [1, 0, 0]],
  ]
  faces.forEach(([n, u, v], f) => {
    for (const [su, sv] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ]) {
      positions.push(n[0] + u[0] * su + v[0] * sv, n[1] + u[1] * su + v[1] * sv, n[2] + u[2] * su + v[2] * sv)
      normals.push(...n)
    }
    const o = f * 4
    indices.push(o, o + 1, o + 2, o, o + 2, o + 3)
  })
  return { positions: new Float32Array(positions), normals: new Float32Array(normals), indices: new Uint16Array(indices) }
}

// ---------- Model ----------

const hex = (h: string): Vec3 => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as Vec3

const BLACK = hex('#1a1714')
const WHITE = hex('#ffffff')

/** Everything the animation drives; 0 / 1 is the resting pose. */
export type CreaturePose = {
  x: number
  y: number
  z: number
  /** Facing around y (rad); 0 looks at the camera. */
  yaw: number
  /** Forward lean (rad). */
  pitch: number
  /** Side wobble (rad). */
  roll: number
  /** Vertical stretch (>1) or squash (<1), volume kept. */
  squash: number
  headTurn: number
  headTilt: number
  /** Extra outward ear angle (rad); negative pricks them straight up. */
  earSpread: number
  eyeScale: number
  tailWag: number
}

export const RESTING_POSE: CreaturePose = {
  x: 0,
  y: 0,
  z: 0,
  yaw: 0,
  pitch: 0,
  roll: 0,
  squash: 1,
  headTurn: 0,
  headTilt: 0,
  earSpread: 0,
  eyeScale: 1,
  tailWag: 0,
}

type Part = { mesh: 'sphere' | 'box'; model: Mat4; color: Vec3; tipFrom?: number; tipColor?: Vec3; gloss?: number }

/** Height (model units) of the top of the head at default proportions, for placing things above it. */
export const HEAD_TOP = 0.92

/** Everything about how it looks; multipliers are 1 at the default model. Colours are hex. */
export type CreatureLook = {
  bodyColor: string
  bodyWidth: number
  bodyHeight: number
  headSize: number
  earLength: number
  earWidth: number
  /** Resting outward angle of the ears (rad). */
  earSpread: number
  earTipColor: string
  /** Where the dark tip starts, -1 (whole ear) to 1 (none). */
  earTip: number
  eyeColor: string
  eyeSize: number
  eyeSpacing: number
  eyeHighlight: boolean
  cheekColor: string
  /** 0 hides the cheeks. */
  cheekSize: number
  tail: boolean
  tailSize: number
  stripes: boolean
  stripeColor: string
  gloss: number
  rim: number
  /** Brightness at the roots, so it sits in the patch's shade (1 = no darkening). */
  groundShade: number
}

export const DEFAULT_LOOK: CreatureLook = {
  bodyColor: '#f6cf3c',
  bodyWidth: 1,
  bodyHeight: 1,
  headSize: 1,
  earLength: 1,
  earWidth: 1,
  earSpread: 0.42,
  earTipColor: '#1a1714',
  earTip: 0.42,
  eyeColor: '#1a1714',
  eyeSize: 1,
  eyeSpacing: 1,
  eyeHighlight: true,
  cheekColor: '#e2432e',
  cheekSize: 1,
  tail: true,
  tailSize: 1,
  stripes: true,
  stripeColor: '#7c4a1e',
  gloss: 0.12,
  rim: 0.22,
  groundShade: 0.55,
}

function buildParts(pose: CreaturePose, size: number, look: CreatureLook): Part[] {
  const fur = hex(look.bodyColor)
  const sy = pose.squash
  const sxz = 1 / Math.sqrt(sy)
  const root = chain(
    translate(pose.x, pose.y, pose.z),
    rotateY(pose.yaw),
    rotateX(pose.pitch),
    rotateZ(pose.roll),
    scale(size * sxz, size * sy, size * sxz),
  )
  const body = chain(root, scale(look.bodyWidth, look.bodyHeight, look.bodyWidth))
  // Head parts turn and tilt about the neck (on top of the body) and scale from it.
  const neck = 0.52
  const head = chain(
    root,
    translate(0, neck * look.bodyHeight, 0),
    rotateY(pose.headTurn),
    rotateZ(pose.headTilt),
    scale(look.headSize, look.headSize, look.headSize),
    translate(0, -neck, 0),
  )
  const blob = (parent: Mat4, p: Vec3, r: Vec3, color: Vec3, extra: Partial<Part> = {}, ...rot: Mat4[]): Part => ({
    mesh: 'sphere',
    model: chain(parent, translate(...p), ...rot, scale(...r)),
    color,
    ...extra,
  })

  const parts: Part[] = [
    // Body and feet
    blob(body, [0, 0.3, 0], [0.235, 0.27, 0.205], fur, { gloss: look.gloss }),
    blob(body, [-0.11, 0.035, 0.07], [0.075, 0.045, 0.1], fur),
    blob(body, [0.11, 0.035, 0.07], [0.075, 0.045, 0.1], fur),
    // Arms, raised a little in alarm
    blob(body, [-0.15, 0.38, 0.15], [0.05, 0.085, 0.05], fur, {}, rotateZ(-0.5), rotateX(-0.5)),
    blob(body, [0.15, 0.38, 0.15], [0.05, 0.085, 0.05], fur, {}, rotateZ(0.5), rotateX(-0.5)),
    // Head, nose and mouth
    blob(head, [0, 0.68, 0.01], [0.255, 0.225, 0.225], fur, { gloss: look.gloss }),
    blob(head, [0, 0.665, 0.226], [0.014, 0.01, 0.01], BLACK),
    blob(head, [0, 0.632, 0.218], [0.03, 0.012, 0.012], BLACK),
  ]

  if (look.stripes) {
    const stripe = hex(look.stripeColor)
    parts.push(blob(body, [0, 0.4, -0.17], [0.14, 0.024, 0.06], stripe, {}, rotateX(0.5)))
    parts.push(blob(body, [0, 0.29, -0.19], [0.15, 0.024, 0.06], stripe, {}, rotateX(0.25)))
  }

  if (look.cheekSize > 0) {
    const cheek = hex(look.cheekColor)
    const c = look.cheekSize
    for (const side of [-1, 1])
      parts.push(blob(head, [side * 0.175, 0.625, 0.135], [0.055 * c, 0.052 * c, 0.024], cheek, { gloss: 0.25 }, rotateY(side * 0.85)))
  }

  // Eyes with a highlight; they widen when startled.
  const eye = hex(look.eyeColor)
  for (const side of [-1, 1]) {
    const e = pose.eyeScale * look.eyeSize
    const x = side * 0.098 * look.eyeSpacing
    parts.push(blob(head, [x, 0.715, 0.19], [0.046 * e, 0.05 * e, 0.032 * e], eye, { gloss: 0.6 }))
    if (look.eyeHighlight) parts.push(blob(head, [x + 0.014 * e, 0.735, 0.218], [0.016 * e, 0.016 * e, 0.01], WHITE))
  }

  // Ears: long ellipsoids from the crown, dark tips.
  for (const side of [-1, 1]) {
    const ear = chain(
      head,
      translate(side * 0.13, 0.84, -0.02),
      rotateZ(-side * (look.earSpread + pose.earSpread)),
      rotateX(-0.12),
      translate(0, 0.19 * look.earLength, 0),
      scale(0.06 * look.earWidth, 0.215 * look.earLength, 0.038 * look.earWidth),
    )
    parts.push({ mesh: 'sphere', model: ear, color: fur, tipFrom: look.earTip, tipColor: hex(look.earTipColor) })
  }

  // Lightning-bolt tail: flat zigzag boards, darker at the base.
  if (look.tail) {
    const t = look.tailSize
    const tail = chain(body, translate(0, 0.2, -0.2), rotateY(pose.tailWag * 0.3), rotateZ(pose.tailWag), rotateX(-0.2), scale(t, t, t))
    parts.push({ mesh: 'box', model: chain(tail, translate(0, 0.02, -0.05), rotateX(-1.0), scale(0.02, 0.035, 0.07)), color: hex(look.stripeColor) })
    parts.push({ mesh: 'box', model: chain(tail, translate(0, 0.12, -0.12), rotateX(0.6), scale(0.022, 0.12, 0.045)), color: fur })
    parts.push({ mesh: 'box', model: chain(tail, translate(0, 0.32, -0.2), rotateX(-0.45), scale(0.022, 0.16, 0.085)), color: fur })
  }
  return parts
}

// ---------- Renderer ----------

const VS = `#version 300 es
in vec3 aPos;
in vec3 aNormal;
uniform mat4 uVP;
uniform mat4 uModel;
uniform mat3 uNormal;
out vec3 vWorld;
out vec3 vN;
out vec3 vLocal;
void main() {
  vec4 world = uModel * vec4(aPos, 1.0);
  vWorld = world.xyz;
  vN = uNormal * aNormal;
  vLocal = aPos;
  gl_Position = uVP * world;
}`

const FS = `#version 300 es
precision highp float;
in vec3 vWorld;
in vec3 vN;
in vec3 vLocal;
uniform vec3 uColor;
uniform vec3 uTipColor;
uniform float uTipFrom;
uniform float uGloss;
uniform vec3 uEye;
uniform float uShade;
uniform float uRim;
out vec4 outColor;
void main() {
  // Nothing shows below the ground, so it can rise out of the grass and dive back in.
  if (vWorld.y < 0.0) discard;
  vec3 base = vLocal.y > uTipFrom ? uTipColor : uColor;
  vec3 n = normalize(vN);
  if (!gl_FrontFacing) n = -n;
  vec3 v = normalize(uEye - vWorld);
  vec3 l = normalize(vec3(-0.35, 0.85, 0.55));
  float diffuse = 0.42 + 0.58 * max(dot(n, l), 0.0);
  float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0) * uRim;
  float spec = pow(max(dot(n, normalize(l + v)), 0.0), 40.0) * uGloss;
  // Darker low down, so it sits in the shade of the patch like the blades' roots.
  float shade = mix(uShade, 1.0, smoothstep(0.0, 0.5, vWorld.y));
  outColor = vec4((base * diffuse + rim * vec3(1.0, 0.95, 0.8)) * shade + spec, 1.0);
}`

type GpuMesh = { vao: WebGLVertexArrayObject; buffers: WebGLBuffer[]; count: number }

export class CreatureRenderer {
  private gl: WebGL2RenderingContext
  private program: WebGLProgram
  private meshes: Record<Part['mesh'], GpuMesh>
  private uniforms: Record<string, WebGLUniformLocation | null>

  constructor(gl: WebGL2RenderingContext) {
    this.gl = gl
    const compile = (type: number, source: string) => {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'creature shader')
      return shader
    }
    const program = gl.createProgram()!
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VS))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FS))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'creature program')
    this.program = program
    this.uniforms = Object.fromEntries(
      ['uVP', 'uModel', 'uNormal', 'uColor', 'uTipColor', 'uTipFrom', 'uGloss', 'uEye', 'uShade', 'uRim'].map((name) => [name, gl.getUniformLocation(program, name)]),
    )
    this.meshes = { sphere: this.upload(sphere()), box: this.upload(box()) }
  }

  private upload(mesh: Mesh): GpuMesh {
    const { gl, program } = this
    const vao = gl.createVertexArray()!
    gl.bindVertexArray(vao)
    const buffers: WebGLBuffer[] = []
    for (const [name, data] of [
      ['aPos', mesh.positions],
      ['aNormal', mesh.normals],
    ] as const) {
      const buffer = gl.createBuffer()!
      buffers.push(buffer)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW)
      const loc = gl.getAttribLocation(program, name)
      gl.enableVertexAttribArray(loc)
      gl.vertexAttribPointer(loc, 3, gl.FLOAT, false, 0, 0)
    }
    const index = gl.createBuffer()!
    buffers.push(index)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, index)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW)
    gl.bindVertexArray(null)
    return { vao, buffers, count: mesh.indices.length }
  }

  /** Draws on top of the current frame, depth-tested against the grass already in it. */
  draw(viewProjection: Mat4, eye: Vec3, pose: CreaturePose, size: number, look: CreatureLook) {
    const { gl, uniforms: u } = this
    gl.useProgram(this.program)
    gl.enable(gl.DEPTH_TEST)
    gl.uniformMatrix4fv(u.uVP, false, viewProjection)
    gl.uniform3fv(u.uEye, eye)
    gl.uniform1f(u.uShade, look.groundShade)
    gl.uniform1f(u.uRim, look.rim)
    for (const part of buildParts(pose, size, look)) {
      const mesh = this.meshes[part.mesh]
      gl.bindVertexArray(mesh.vao)
      gl.uniformMatrix4fv(u.uModel, false, part.model)
      gl.uniformMatrix3fv(u.uNormal, false, normalMatrix(part.model))
      gl.uniform3fv(u.uColor, part.color)
      gl.uniform3fv(u.uTipColor, part.tipColor ?? part.color)
      gl.uniform1f(u.uTipFrom, part.tipFrom ?? 99)
      gl.uniform1f(u.uGloss, part.gloss ?? 0.05)
      gl.drawElements(gl.TRIANGLES, mesh.count, gl.UNSIGNED_SHORT, 0)
    }
    gl.bindVertexArray(null)
  }

  destroy() {
    const { gl } = this
    for (const mesh of Object.values(this.meshes)) {
      mesh.buffers.forEach((b) => gl.deleteBuffer(b))
      gl.deleteVertexArray(mesh.vao)
    }
    gl.deleteProgram(this.program)
  }
}
