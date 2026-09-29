/**
 * Momo (the Unwind cloud) floating in the middle of the Unwind card.
 *
 * Transparency: each clip is a plain H.264 MP4 with the colour (premultiplied)
 * in the top half and the alpha mask in the bottom half. A tiny WebGL shader
 * recombines them on a <canvas>. Every browser decodes H.264, so this never
 * depends on codec alpha support (WebM alpha is lost on iOS; HEVC alpha is
 * fragile there too and showed a white box).
 *
 * `clip` picks one looping clip, or both played back to back: each clip plays
 * once, then hands over to the other.
 *
 * The hand-over overlaps: the next clip starts `fadeMs` before the current one
 * ends and the two blend (opacity, blur, scale — compositor-only) so the loop
 * reads as one continuous animation.
 */
import { useEffect, useRef, type CSSProperties } from 'react'
import { useTuningController } from '../tuning/useTuning'

type Tuple = [number, number, number, number]
type Clip = 'listening' | 'floating'

const CLIPS: Clip[] = ['listening', 'floating']

const clipUrl = (clip: Clip) => `/work/unwind/momo-${clip}.mp4`

const VERT = `attribute vec2 p;varying vec2 uv;void main(){uv=vec2((p.x+1.)*.5,(1.-p.y)*.5);gl_Position=vec4(p,0.,1.);}`
const FRAG = `precision mediump float;varying vec2 uv;uniform sampler2D t;
void main(){vec3 c=texture2D(t,vec2(uv.x,uv.y*.5)).rgb;float a=texture2D(t,vec2(uv.x,.5+uv.y*.5)).r;
a=clamp((a-.03)/.94,0.,1.);gl_FragColor=vec4(min(c,vec3(a)),a);}`

/** Draws `video` (stacked colour/alpha) into `canvas` on every new frame. Returns a stop function. */
function stackedAlpha(video: HTMLVideoElement, canvas: HTMLCanvasElement): () => void {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false })
  if (!gl) return () => {}
  const shader = (type: number, src: string) => {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    return sh
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.clearColor(0, 0, 0, 0)

  const draw = () => {
    if (video.readyState < 2 || !video.videoWidth) return
    const w = video.videoWidth
    const h = video.videoHeight / 2
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  let stopped = false
  let handle = 0
  const rvfc = 'requestVideoFrameCallback' in video
  const loop = () => {
    if (stopped) return
    draw()
    handle = rvfc ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop)
  }
  // Paint the first frame even before playback (and for reduced motion).
  video.addEventListener('loadeddata', draw)
  video.addEventListener('seeked', draw)
  loop()
  return () => {
    stopped = true
    if (rvfc) video.cancelVideoFrameCallback(handle)
    else cancelAnimationFrame(handle)
    video.removeEventListener('loadeddata', draw)
    video.removeEventListener('seeked', draw)
  }
}

const CONFIG = {
  clip: { type: 'select' as const, options: ['listening', 'floating', 'both'], default: 'both' },
  /** Video height as % of the card height. */
  size: [40, 5, 120, 0.5] as Tuple,
  /** Offset from the card centre, % of card width / height. */
  x: [0, -50, 50, 0.5] as Tuple,
  y: [0, -50, 50, 0.5] as Tuple,
  /** Per-clip fine-tune on top of the shared size/x/y: line the two clips up so the blend is seamless. */
  listening: {
    scale: [1, 0.3, 2, 0.01] as Tuple,
    x: [0, -30, 30, 0.1] as Tuple,
    y: [0, -30, 30, 0.1] as Tuple,
    _collapsed: false,
  },
  floating: {
    scale: [1, 0.3, 2, 0.01] as Tuple,
    x: [0, -30, 30, 0.1] as Tuple,
    y: [0, -30, 30, 0.1] as Tuple,
    _collapsed: false,
  },
  /** How "both" hands one clip over to the other. */
  transition: {
    preset: {
      type: 'select' as const,
      options: ['cut', 'crossfade', 'soft blur', 'breathe', 'dip', 'custom'],
      default: 'breathe',
    },
    /** Blend length; the next clip starts this long before the current one ends. */
    fadeMs: [700, 0, 2500, 10] as Tuple,
    /** Blur at the ends of the blend (px). */
    blur: [4, 0, 20, 0.5] as Tuple,
    /** Scale the outgoing clip shrinks/grows to. */
    outScale: [0.94, 0.7, 1.3, 0.01] as Tuple,
    /** Scale the incoming clip starts from. */
    inScale: [1.06, 0.7, 1.3, 0.01] as Tuple,
    /** Fade fully out before fading in (no overlap). */
    dip: false,
    _collapsed: false,
  },
}

type Blend = { fadeMs: number; blur: number; outScale: number; inScale: number; dip: boolean }
const PRESETS: Record<string, Blend> = {
  cut: { fadeMs: 0, blur: 0, outScale: 1, inScale: 1, dip: false },
  crossfade: { fadeMs: 500, blur: 0, outScale: 1, inScale: 1, dip: false },
  'soft blur': { fadeMs: 700, blur: 6, outScale: 1, inScale: 1, dip: false },
  breathe: { fadeMs: 700, blur: 4, outScale: 0.94, inScale: 1.06, dip: false },
  dip: { fadeMs: 600, blur: 2, outScale: 0.97, inScale: 0.97, dip: true },
}

export function MomoCard() {
  const { values: t, setValue } = useTuningController('Unwind Momo', CONFIG)
  const hostRef = useRef<HTMLDivElement>(null)
  const videos = useRef<Record<Clip, HTMLVideoElement | null>>({ listening: null, floating: null })
  const canvases = useRef<Record<Clip, HTMLCanvasElement | null>>({ listening: null, floating: null })

  useEffect(() => {
    const stops = CLIPS.map((c) => {
      const v = videos.current[c]
      const cv = canvases.current[c]
      return v && cv ? stackedAlpha(v, cv) : () => {}
    })
    return () => stops.forEach((stop) => stop())
  }, [])

  const tr = t.transition
  const blend: Blend = tr.preset === 'custom' ? tr : (PRESETS[tr.preset] ?? PRESETS.breathe)
  // Read by the playback loop without restarting it.
  const fadeRef = useRef(blend.fadeMs)
  fadeRef.current = blend.fadeMs

  // Moving a blend dial means "use my numbers": flip the preset to 'custom'.
  const blendKey = `${tr.fadeMs}|${tr.blur}|${tr.outScale}|${tr.inScale}|${tr.dip}`
  const blendKeyRef = useRef(blendKey)
  useEffect(() => {
    if (blendKeyRef.current === blendKey) return
    blendKeyRef.current = blendKey
    if (tr.preset !== 'custom') setValue('transition.preset', 'custom')
  }, [blendKey, tr.preset, setValue])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const order: Clip[] = t.clip === 'both' ? CLIPS : [t.clip as Clip]
    let active = 0
    let visible = false
    let handing = false
    let frame = 0
    let settle = 0

    // data-state: active (shown), out (blending away), idle (hidden, reset to its entry pose).
    const setState = (clip: Clip, state: 'active' | 'out' | 'idle') => {
      const cv = canvases.current[clip]
      if (cv) cv.dataset.state = state
    }
    const pauseAll = () => {
      cancelAnimationFrame(frame)
      frame = 0
      CLIPS.forEach((c) => videos.current[c]?.pause())
    }
    // Watch the playhead so the next clip can start `fadeMs` before this one ends.
    const tick = () => {
      frame = 0
      const v = videos.current[order[active]]
      if (!v || !visible) return
      if (!handing && v.duration && v.currentTime >= v.duration - fadeRef.current / 1000) handOver()
      frame = requestAnimationFrame(tick)
    }
    const play = () => {
      const v = videos.current[order[active]]
      if (!v || reduced || !visible) return
      void v.play().catch(() => {})
      if (order.length > 1 && !frame) frame = requestAnimationFrame(tick)
    }
    const handOver = () => {
      handing = true
      const from = order[active]
      active = (active + 1) % order.length
      const to = order[active]
      const next = videos.current[to]
      if (next) next.currentTime = 0
      setState(from, 'out')
      setState(to, 'active')
      play()
      window.clearTimeout(settle)
      settle = window.setTimeout(() => {
        const prev = videos.current[from]
        prev?.pause()
        if (prev) prev.currentTime = 0
        setState(from, 'idle')
        handing = false
      }, fadeRef.current + 20)
    }

    for (const c of CLIPS) {
      const v = videos.current[c]
      if (!v) continue
      v.pause()
      v.currentTime = 0
      // One clip loops natively; "both" hands over on `ended` instead.
      v.loop = order.length === 1
    }
    for (const c of CLIPS) setState(c, c === order[0] ? 'active' : 'idle')

    // Fallback for a zero-length blend (cut) or a missed frame near the end.
    const onEnded = () => {
      if (!handing) handOver()
    }
    const listeners = order.map((c) => {
      const v = videos.current[c]
      v?.addEventListener('ended', onEnded)
      return v
    })

    // Only decode while the card is on screen.
    const observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      if (visible) play()
      else pauseAll()
    })
    observer.observe(host)

    return () => {
      observer.disconnect()
      listeners.forEach((v) => v?.removeEventListener('ended', onEnded))
      window.clearTimeout(settle)
      pauseAll()
    }
  }, [t.clip])

  return (
    <div
      ref={hostRef}
      className="momo"
      aria-hidden="true"
      data-dip={blend.dip || undefined}
      style={
        {
          '--momo-size': `${t.size}%`,
          '--momo-x': `${t.x}%`,
          '--momo-y': `${t.y}%`,
          '--momo-fade': `${blend.fadeMs}ms`,
          '--momo-blur': `${blend.blur}px`,
          '--momo-out-scale': blend.outScale,
          '--momo-in-scale': blend.inScale,
        } as CSSProperties
      }
    >
      {CLIPS.map((clip) => (
        <canvas
          key={clip}
          ref={(el) => {
            canvases.current[clip] = el
          }}
          className="momo__clip"
          data-state={clip === CLIPS[0] ? 'active' : 'idle'}
          style={
            {
              '--clip-scale': t[clip].scale,
              '--clip-x': `${t[clip].x}%`,
              '--clip-y': `${t[clip].y}%`,
            } as CSSProperties
          }
        />
      ))}
      {/* Decoders only; the canvases show the pixels. Kept in the DOM (not display:none) so iOS decodes them. */}
      {CLIPS.map((clip) => (
        <video
          key={clip}
          ref={(el) => {
            videos.current[clip] = el
          }}
          className="momo__src"
          muted
          playsInline
          preload="auto"
          src={clipUrl(clip)}
        />
      ))}
    </div>
  )
}
