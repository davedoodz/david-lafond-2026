/**
 * Live three.js scanner: Astra's GLB plus every motion, light and beam, computed against the DOM.
 *
 * One fixed, full-viewport, transparent canvas. A perspective camera maps the z = 0 plane to CSS
 * pixels, so the page sits on z = 0 and a pose of { x, y } lands on those client coordinates at any
 * depth. Renders only while something changes (run, light ramp, hover, idle float on screen).
 *
 * Run: rest beside the switch → travel to the page union center → 360° spin → descend to bottom
 * center, back to the viewer, visor aimed up → flip the diagram (`scan` preset) → the beam follows
 * that WAAPI clock, so it reverses with it → return to rest.
 */
import {
  AdditiveBlending,
  Box3,
  BufferAttribute,
  BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  NeutralToneMapping,
  Object3D,
  PerspectiveCamera,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  Vector3,
  WebGLRenderer,
  type Material,
} from 'three'
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'
import { SCAN_END, SCAN_START, type ScanSession } from '../useDiagramTransition'

export type ScannerLook = {
  /** Apparent height (px) beside the switch, and while scanning. */
  restSize: number
  scanSize: number
  /** Rest pose (degrees): yaw turns the visor sideways, pitch shows the top of the head. */
  restYaw: number
  restPitch: number
  /** Idle float, 0 = still. */
  idle: number
  travelMs: number
  spinMs: number
  descendMs: number
  returnMs: number
  /** Gap (px) between the scanner and the bottom of the scanned pages. */
  lockInset: number
  /** Distance (px) toward the viewer while scanning; gives the beam its depth. */
  lockDepth: number
  /** Visor tilt (degrees) up toward the page while scanning. */
  aimPitch: number
  /** Visor / grip light ramp, interruptible. */
  lightMs: number
  /** Light cone from the visor, and the scan line where it meets the page. */
  beamColor: string
  lineColor: string
  beamOpacity: number
  /** Half height (px) of the glow around the scan line. */
  lineGlow: number
}

/** Book mode: the pages turning under the beam. The scanner holds its pose until both this and the
 * diagram reveal finish. */
export type Riffle = {
  /** Scan line (0 top – 1 bottom of the pages) and beam strength now, or null once the hold after
   * the last view is over. */
  frame(now: number): { line: number; beam: number } | null
  cancel(): void
}

type Box = { top: number; bottom: number; left: number; right: number }
export type ScannerHost = {
  /** Rest slot: the trigger button beside the switch. */
  anchor(): DOMRect | null
  /** On-screen page union (viewport px), or null when nothing can be scanned. */
  stage(): Box | null
  /** The scan covers every page in the document: the scanner scrolls to the top first, keeps the
   * line on screen as it sweeps down, and scrolls back to the top on its way home. */
  follow(): boolean
  /** Called on click, before the flight: e.g. close the book onto its front cover. */
  prepare(): void
  /** Flip the diagram with the `scan` preset. */
  scan(): void
  /** Start turning pages under the beam, or null to scan in place. */
  riffle(): Riffle | null
  session(): ScanSession | null
  onBusy(busy: boolean): void
}
export type ScannerController = {
  setLook(look: ScannerLook): void
  setHover(hover: boolean): void
  setVisible(visible: boolean): void
  run(): void
  dispose(): void
}

type Pose = { x: number; y: number; z: number; size: number; yaw: number; pitch: number }
type PhaseName = 'travel' | 'spin' | 'descend' | 'scan' | 'return'
type Phase = { name: PhaseName; start: number; from: Pose }

const MODEL_HEIGHT = 0.12
/** Visor opening width (m) on the model sheet; the beam leaves the full opening. */
const VISOR_WIDTH = 0.079
const FOV = 30
const TAU = Math.PI * 2
const rad = (deg: number) => (deg * Math.PI) / 180
const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
const mix = (a: number, b: number, t: number) => a + (b - a) * t
const inOut = (t: number) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2)
const smooth = (a: number, b: number, v: number) => {
  const t = clamp01((v - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const damp = (value: number, target: number, tau: number, dt: number) => (tau <= 0 ? target : value + (target - value) * (1 - Math.exp(-dt / tau)))
const center = (b: Box) => ({ x: (b.left + b.right) / 2, y: (b.top + b.bottom) / 2 })

/** `uvq`: (u·w, v, w) with w the width of the quad at that end. Dividing by w in the fragment keeps
 * u straight across a trapezoid; plain uv would bend along the diagonal between its two triangles. */
const BEAM_VERTEX = /* glsl */ `
  attribute vec3 uvq;
  varying vec3 vUvq;
  void main() {
    vUvq = uvq;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const FAN_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uTime;
  varying vec3 vUvq;
  void main() {
    vec2 uv = vec2(vUvq.x / vUvq.z, vUvq.y);
    float edge = smoothstep(0.0, 0.16, uv.x) * smoothstep(1.0, 0.84, uv.x);
    float along = mix(0.25, 1.0, uv.y * uv.y);
    float flicker = 0.97 + 0.03 * sin(uTime * 37.0 + uv.y * 90.0);
    gl_FragColor = vec4(uColor, uOpacity * edge * along * flicker * 0.55);
  }
`
const LINE_FRAGMENT = /* glsl */ `
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform float uGlow;
  varying vec3 vUvq;
  void main() {
    vec2 uv = vec2(vUvq.x / vUvq.z, vUvq.y);
    float d = abs(uv.y - 0.5) * 2.0 * uGlow;
    float core = 1.0 - smoothstep(0.6, 1.6, d);
    float halo = exp(-(d * d) / max(1.0, uGlow * uGlow * 0.18));
    float ends = smoothstep(0.0, 0.03, uv.x) * smoothstep(1.0, 0.97, uv.x);
    gl_FragColor = vec4(uColor, uOpacity * ends * (core + 0.55 * halo));
  }
`

/** Corners: 0, 1 = near end (left, right); 2, 3 = far end. */
function quad(material: ShaderMaterial) {
  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(12), 3))
  geometry.setAttribute('uvq', new BufferAttribute(new Float32Array([0, 0, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1]), 3))
  geometry.setIndex([0, 2, 1, 1, 2, 3])
  const mesh = new Mesh(geometry, material)
  mesh.frustumCulled = false
  mesh.renderOrder = 2
  return mesh
}

/** Rescale a quad's uvq for end widths `near` and `far` (any shared unit). */
function taper(mesh: Mesh, near: number, far: number) {
  const uvq = mesh.geometry.getAttribute('uvq') as BufferAttribute
  uvq.setXYZ(0, 0, 0, near)
  uvq.setXYZ(1, near, 0, near)
  uvq.setXYZ(2, 0, 1, far)
  uvq.setXYZ(3, far, 1, far)
  uvq.needsUpdate = true
}

function beamMaterial(fragmentShader: string, extra: Record<string, { value: unknown }> = {}) {
  return new ShaderMaterial({
    vertexShader: BEAM_VERTEX,
    fragmentShader,
    uniforms: { uColor: { value: new Color() }, uOpacity: { value: 0 }, uTime: { value: 0 }, ...extra },
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
    // Corners are rewritten every frame from screen space, so the winding can flip.
    side: DoubleSide,
  })
}

export async function createScanner(canvas: HTMLCanvasElement, host: ScannerHost, initial: ScannerLook, url: string, decoderPath: string): Promise<ScannerController> {
  const renderer = new WebGLRenderer({ canvas, alpha: true, antialias: true, powerPreference: 'low-power' })
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = NeutralToneMapping
  const scene = new Scene()
  const pmrem = new PMREMGenerator(renderer)
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture
  pmrem.dispose()
  scene.environment = environment
  scene.environmentIntensity = 0.75
  const key = new DirectionalLight(0xffffff, 1.6)
  key.position.set(-0.6, 1, 0.9)
  scene.add(key)
  const camera = new PerspectiveCamera(FOV, 1, 1, 10000)

  const draco = new DRACOLoader().setDecoderPath(decoderPath)
  const gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync(url)
  draco.dispose()
  const model = gltf.scene
  // Pose = bounding-box center, so the spin turns the scanner about itself rather than its grip.
  const middle = new Box3().setFromObject(model).getCenter(new Vector3())
  model.position.sub(middle)
  const pivot = new Group()
  pivot.add(model)
  scene.add(pivot)
  const emitter = model.getObjectByName('Emitter') ?? model

  // Hover lights come from the GLB's own extras; the browser only ramps them.
  type Lamp = { material: MeshStandardMaterial; on: number; fadeOpacity: boolean }
  const lamps: Lamp[] = []
  const materials = new Set<Material>()
  model.traverse((node: Object3D) => {
    if (!(node instanceof Mesh)) return
    for (const material of [node.material].flat() as Material[]) {
      materials.add(material)
      if (!(material instanceof MeshStandardMaterial)) continue
      // Transmission costs a second full-viewport pass every frame; over a black cavity a plain
      // transparent layer reads the same. The grid stays invisible until it lights.
      const glass = material instanceof MeshPhysicalMaterial && material.transmission > 0
      if (glass) {
        material.transmission = 0
        material.transparent = true
        material.depthWrite = false
        material.opacity = material.name === 'Mat_VisorGlass' ? 0.05 : 0
      }
      const on = Number(material.userData.hover_on_strength)
      if (on > 0) lamps.push({ material, on, fadeOpacity: glass })
    }
  })

  const fanMaterial = beamMaterial(FAN_FRAGMENT)
  const lineMaterial = beamMaterial(LINE_FRAGMENT, { uGlow: { value: 12 } })
  const fan = quad(fanMaterial)
  const line = quad(lineMaterial)
  scene.add(fan, line)

  let look = initial
  let width = 0
  let height = 0
  let depth = 1
  const resize = () => {
    width = innerWidth
    height = innerHeight
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2))
    renderer.setSize(width, height, false)
    depth = height / 2 / Math.tan(rad(FOV / 2))
    camera.aspect = width / height
    camera.position.set(0, 0, depth)
    camera.near = 1
    camera.far = depth * 3
    camera.updateProjectionMatrix()
  }
  resize()

  /** Client px at depth z → world. Objects keep their client position at any depth. */
  const toWorld = (x: number, y: number, z: number, target = new Vector3()) => {
    const k = (depth - z) / depth
    return target.set((x - width / 2) * k, (height / 2 - y) * k, z)
  }

  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)')
  let visible = true
  let hovered = false
  let hover = 0
  let light = 0
  let phase: Phase | null = null
  let pose: Pose = { x: -999, y: -999, z: 0, size: initial.restSize, yaw: rad(initial.restYaw), pitch: rad(initial.restPitch) }
  /** Page union, re-measured every frame of a run and eased, so the scanner follows the book as it
   * closes onto its cover or opens into spreads. */
  let stage: Box | null = null
  let riffle: Riffle | null = null
  /** Eased riffle beam strength, so on/off at the riffle's ends never pops. */
  let riffleBeam = 0
  let session: ScanSession | null = null
  let sessionBefore = 0
  let scanStart = 0
  /** Follow run (see `ScannerHost.follow`) and the scroll position each phase started from. */
  let follow = false
  let scrollFrom = 0
  const scrollTo = (top: number) => {
    if (Math.abs(scrollY - top) > 0.5) window.scrollTo({ top, behavior: 'instant' })
  }
  let flash = 0
  let last = performance.now()
  let raf = 0

  const restPose = (now: number): Pose | null => {
    const rect = host.anchor()
    if (!rect) return null
    const float = look.idle * Math.sin((now / 4000) * TAU)
    return {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2 - float * 1.5 - hover * 2,
      z: 0,
      size: look.restSize * (1 + hover * 0.06),
      yaw: rad(mix(look.restYaw, look.restYaw * 0.35, hover) + look.idle * 4 * Math.sin((now / 4000) * TAU + 1.3)),
      pitch: rad(look.restPitch + hover * 6),
    }
  }
  const viewStage = (dt: number): Box | null => {
    const live = host.stage()
    if (!live || !stage) return (stage = live ?? stage)
    const ease = (key: keyof Box) => damp(stage![key], live[key], 90, dt)
    stage = { top: ease('top'), bottom: ease('bottom'), left: ease('left'), right: ease('right') }
    return stage
  }
  const lockPose = (box: Box): Pose => {
    const { x } = center(box)
    const y = Math.min(box.bottom - look.lockInset - look.scanSize / 2, height - look.scanSize / 2 - 12)
    return { x, y, z: look.lockDepth, size: look.scanSize, yaw: Math.PI * 3, pitch: rad(look.aimPitch) }
  }

  /** Pass progress 0–1 on the diagram's own timeline, or null once it has settled. */
  const progress = (now: number): number | null => {
    const current = host.session()
    if (current && current.id > sessionBefore) session = current
    if (!session) return now - scanStart > 400 ? null : 0
    const { clock, duration, forward } = session
    if (clock) {
      if (clock.playState === 'idle') return null
      const time = Number(clock.currentTime ?? 0)
      return clamp01(time / duration)
    }
    // Nothing animates (no page, Animate off): the beam still passes once on its own clock.
    const elapsed = (now - scanStart) / duration
    if (elapsed >= 1) return null
    return forward ? elapsed : 1 - elapsed
  }

  const begin = (name: PhaseName, now: number) => {
    phase = { name, start: now, from: { ...pose } }
    scrollFrom = scrollY
  }

  const update = (now: number, dt: number) => {
    hover = damp(hover, hovered && !phase ? 1 : 0, 120, dt)
    const active = phase !== null && phase.name !== 'return'
    light = damp(light, hovered || active || now < flash ? 1 : 0, look.lightMs / 3, dt)
    let beam = 0
    const rest = restPose(now)

    if (!phase) {
      if (rest) pose = rest
    } else {
      const box = viewStage(dt)
      const elapsed = now - phase.start
      const { from } = phase
      if (phase.name === 'travel' || phase.name === 'return') {
        const back = phase.name === 'return'
        const t = clamp01(elapsed / (back ? look.returnMs : look.travelMs))
        const e = inOut(t)
        const to: Pose | null = back
          ? rest && { ...rest, yaw: rest.yaw + TAU * 2 }
          : box && { ...center(box), z: look.lockDepth * 0.5, size: look.scanSize * 1.08, yaw: 0, pitch: 0 }
        if (!to) {
          phase = null
        } else {
          // Arc sideways off the straight line, so the scanner swoops rather than slides.
          const dx = to.x - from.x
          const dy = to.y - from.y
          const bend = (back ? -0.22 : 0.22) * Math.hypot(dx, dy)
          const length = Math.hypot(dx, dy) || 1
          const cx = (from.x + to.x) / 2 + (-dy / length) * bend
          const cy = (from.y + to.y) / 2 + (dx / length) * bend
          const u = 1 - e
          // Follow runs start and end at the top of the document, where the scanner rests.
          if (follow) scrollTo(mix(scrollFrom, 0, e))
          pose = {
            x: u * u * from.x + 2 * u * e * cx + e * e * to.x,
            y: u * u * from.y + 2 * u * e * cy + e * e * to.y,
            z: mix(from.z, to.z, e),
            size: mix(from.size, to.size, e),
            yaw: mix(from.yaw, to.yaw, e),
            pitch: mix(from.pitch, to.pitch, e),
          }
          if (t >= 1) {
            if (back) {
              pose = { ...to, yaw: to.yaw - TAU * 2 }
              phase = null
              host.onBusy(false)
            } else begin('spin', now)
          }
        }
      } else if (phase.name === 'spin') {
        const t = clamp01(elapsed / look.spinMs)
        const e = inOut(t)
        const lift = Math.sin(t * Math.PI)
        pose = { ...from, yaw: from.yaw + TAU * e, z: from.z + lift * look.lockDepth * 0.4, size: from.size * (1 + lift * 0.05) }
        if (t >= 1) begin('descend', now)
      } else if (phase.name === 'descend') {
        const t = clamp01(elapsed / look.descendMs)
        const e = inOut(t)
        const to = box ? lockPose(box) : from
        pose = {
          x: mix(from.x, to.x, e),
          y: mix(from.y, to.y, e),
          z: mix(from.z, to.z, e),
          size: mix(from.size, to.size, e),
          yaw: mix(from.yaw, to.yaw, e),
          pitch: mix(from.pitch, to.pitch, e),
        }
        if (t >= 1) {
          sessionBefore = host.session()?.id ?? 0
          session = null
          scanStart = now
          begin('scan', now)
          host.scan()
          riffle = host.riffle()
          riffleBeam = 0
        }
      } else {
        const p = progress(now)
        const r = riffle?.frame(now) ?? null
        const lock = box ? lockPose(box) : from
        // A faint hum while the beam runs.
        pose = { ...lock, y: lock.y + Math.sin(now / 38) * 0.35 }
        if (riffle) {
          // Each view (cover, spread, back cover) gets its own full pass; the riffle drives the line.
          riffleBeam = damp(riffleBeam, r?.beam ?? 0, 70, dt)
          if (r === null && p === null) {
            riffle = null
            begin('return', now)
          } else if (box) {
            beam = riffleBeam
            placeBeam(box, box.top + (r?.line ?? 1) * (box.bottom - box.top))
          }
        } else {
          if (p === null || (!session?.bounds && !box)) {
            begin('return', now)
          } else {
            const share = clamp01((p - SCAN_START) / (SCAN_END - SCAN_START))
            beam = smooth(0.02, SCAN_START, p) * (1 - smooth(SCAN_END, SCAN_END + 0.06, p))
            // A follow scan turning the diagram off plays mirrored keyframes in reverse, so it too runs down.
            const line = session?.follow && !session.forward ? 1 - share : share
            if (session?.follow && session.bounds) {
              // The page scrolls in step with the line, so the line glides down the screen as the
              // pages pass under it, from the top of the first page to the bottom of the last.
              const end = Math.min(document.documentElement.scrollHeight - innerHeight, session.bounds.bottom + 24 - innerHeight)
              scrollTo(mix(scrollFrom, Math.max(scrollFrom, end), line))
            }
            // Document px from the toggle when the reveal animates, so a scroll keeps it on the pages.
            const bounds = session?.bounds ? { ...session.bounds, top: session.bounds.top - scrollY, bottom: session.bounds.bottom - scrollY } : box!
            placeBeam(bounds, bounds.top + line * (bounds.bottom - bounds.top))
            // Leave once the beam is out rather than through the long settle of a whole-document run.
            if (session?.follow && (session.forward ? p >= SCAN_END + 0.06 : p <= 0.02)) begin('return', now)
          }
        }
      }
    }

    const k = (depth - pose.z) / depth
    toWorld(pose.x, pose.y, pose.z, pivot.position)
    pivot.scale.setScalar((pose.size * k) / MODEL_HEIGHT)
    pivot.rotation.set(pose.pitch, pose.yaw, 0, 'XYZ')

    for (const lamp of lamps) {
      lamp.material.emissiveIntensity = lamp.on * light
      if (lamp.fadeOpacity) lamp.material.opacity = light
    }
    ;(fanMaterial.uniforms.uColor.value as Color).set(look.beamColor)
    ;(lineMaterial.uniforms.uColor.value as Color).set(look.lineColor)
    fanMaterial.uniforms.uOpacity.value = beam * look.beamOpacity
    lineMaterial.uniforms.uOpacity.value = beam * look.beamOpacity
    lineMaterial.uniforms.uGlow.value = look.lineGlow
    fanMaterial.uniforms.uTime.value = now / 1000
    fan.visible = line.visible = beam > 0.001
  }

  const corner = new Vector3()
  const axis = new Vector3()
  const origin = new Vector3()
  const placeBeam = (bounds: Box, y: number) => {
    pivot.updateMatrixWorld(true)
    emitter.getWorldPosition(origin)
    // The beam leaves the full visor opening, along the scanner's own width.
    axis.set(1, 0, 0).applyQuaternion(pivot.quaternion).multiplyScalar((VISOR_WIDTH / 2) * pivot.scale.x)
    const fanPositions = fan.geometry.getAttribute('position') as BufferAttribute
    corner.copy(origin).sub(axis)
    fanPositions.setXYZ(0, corner.x, corner.y, corner.z)
    corner.copy(origin).add(axis)
    fanPositions.setXYZ(1, corner.x, corner.y, corner.z)
    toWorld(bounds.left, y, 0, corner)
    fanPositions.setXYZ(2, corner.x, corner.y, 0)
    toWorld(bounds.right, y, 0, corner)
    fanPositions.setXYZ(3, corner.x, corner.y, 0)
    fanPositions.needsUpdate = true
    taper(fan, axis.length() * 2, Math.abs(fanPositions.getX(3) - fanPositions.getX(2)))

    const glow = look.lineGlow
    const linePositions = line.geometry.getAttribute('position') as BufferAttribute
    const points: [number, number][] = [[bounds.left, y + glow], [bounds.right, y + glow], [bounds.left, y - glow], [bounds.right, y - glow]]
    points.forEach(([px, py], index) => {
      toWorld(px, py, 0, corner)
      linePositions.setXYZ(index, corner.x, corner.y, 0)
    })
    linePositions.needsUpdate = true
  }

  const anchorOnScreen = () => {
    const rect = host.anchor()
    return !!rect && rect.bottom > 0 && rect.top < innerHeight
  }
  const settling = () => Math.abs(hover - (hovered && !phase ? 1 : 0)) > 0.002 || Math.abs(light - (hovered || performance.now() < flash ? 1 : 0)) > 0.002

  const frame = (time: number) => {
    raf = 0
    const dt = Math.min(64, time - last)
    last = time
    if (!visible) return
    update(time, dt)
    renderer.render(scene, camera)
    if (phase || settling() || (look.idle > 0 && anchorOnScreen() && !reduceMotion.matches)) kick()
  }
  const kick = () => {
    if (raf || !visible) return
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }
  const onResize = () => {
    resize()
    kick()
  }
  addEventListener('resize', onResize)
  addEventListener('scroll', kick, { passive: true })
  kick()

  const abort = () => {
    if (!phase) return
    phase = null
    session = null
    riffle?.cancel()
    riffle = null
    host.onBusy(false)
  }

  return {
    setLook(next) {
      look = next
      kick()
    },
    setHover(next) {
      hovered = next
      kick()
    },
    setVisible(next) {
      visible = next
      if (!next) {
        abort()
        cancelAnimationFrame(raf)
        raf = 0
        renderer.clear()
      } else kick()
    },
    run() {
      if (phase || !visible) return
      const box = host.stage()
      if (!box || reduceMotion.matches) {
        // Nothing to fly over, or motion reduced: flip in place and blink the lights once.
        host.scan()
        flash = performance.now() + look.lightMs * 2
        kick()
        return
      }
      host.prepare()
      stage = box
      follow = host.follow()
      host.onBusy(true)
      begin('travel', performance.now())
      kick()
    },
    dispose() {
      cancelAnimationFrame(raf)
      removeEventListener('resize', onResize)
      removeEventListener('scroll', kick)
      fan.geometry.dispose()
      line.geometry.dispose()
      fanMaterial.dispose()
      lineMaterial.dispose()
      model.traverse((node: Object3D) => { if (node instanceof Mesh) node.geometry.dispose() })
      materials.forEach((material) => material.dispose())
      environment.dispose()
      renderer.dispose()
    },
  }
}
