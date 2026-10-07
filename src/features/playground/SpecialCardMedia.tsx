import { useEffect, useRef, type CSSProperties } from 'react'
import {
  ShaderFitOptions,
  ShaderMount,
  getShaderColorFromString,
  meshGradientFragmentShader,
} from '@paper-design/shaders'
import { releaseShader } from '../../lib/releaseShader'
import { CardVideo } from './CardVideo'

type JournalMediaProps = {
  src: string
  poster?: string
  playbackRate: number
  shouldPlay: boolean
  desktopZoom: number
  desktopX: number
  desktopY: number
  desktopCropLeft: number
  desktopCropRight: number
  desktopCropTop: number
  desktopCropBottom: number
  desktopRadius: number
  phoneX: number
  phoneY: number
}

export function JournalMedia({
  src,
  poster,
  playbackRate,
  shouldPlay,
  desktopZoom,
  desktopX,
  desktopY,
  desktopCropLeft,
  desktopCropRight,
  desktopCropTop,
  desktopCropBottom,
  desktopRadius,
  phoneX,
  phoneY,
}: JournalMediaProps) {
  const style = {
    '--pg-journal-desktop-zoom': desktopZoom,
    '--pg-journal-desktop-x': `${desktopX}%`,
    '--pg-journal-desktop-y': `${desktopY}%`,
    '--pg-journal-desktop-crop-left': `${desktopCropLeft}%`,
    '--pg-journal-desktop-crop-right': `${desktopCropRight}%`,
    '--pg-journal-desktop-crop-top': `${desktopCropTop}%`,
    '--pg-journal-desktop-crop-bottom': `${desktopCropBottom}%`,
    '--pg-journal-desktop-radius': `${desktopRadius}px`,
    '--pg-journal-phone-x': `${phoneX}%`,
    '--pg-journal-phone-y': `${phoneY}%`,
  } as CSSProperties

  return (
    <div className="pg-journal-media" style={style}>
      <div className="pg-journal-desktop-frame">
        <CardVideo
          src={src}
          poster={poster}
          playbackRate={playbackRate}
          shouldPlay={shouldPlay}
          className="pg-journal-desktop"
        />
      </div>
      <img
        className="pg-journal-phone"
        src="/about/playground/davids-journal-phone.webp"
        alt=""
        draggable={false}
        aria-hidden="true"
      />
    </div>
  )
}

const CRITICAL_ACTION_COLORS = ['#0D3937', '#0D504D', '#D33C36', '#DB6546'].map((color) =>
  getShaderColorFromString(color),
)

const CRITICAL_ACTION_UNIFORMS = {
  u_colors: CRITICAL_ACTION_COLORS,
  u_colorsCount: CRITICAL_ACTION_COLORS.length,
  u_distortion: 0,
  u_swirl: 0,
  u_grainMixer: 0,
  u_grainOverlay: 0,
  u_fit: ShaderFitOptions.contain,
  u_scale: 0.7,
  u_rotation: 0,
  u_offsetX: 0,
  u_offsetY: 0,
  u_originX: 0.5,
  u_originY: 0.5,
  u_worldWidth: 0,
  u_worldHeight: 0,
}

type CriticalActionMediaProps = {
  shouldPlay: boolean
  bookScale: number
  bookX: number
  bookY: number
}

export function CriticalActionMedia({ shouldPlay, bookScale, bookX, bookY }: CriticalActionMediaProps) {
  const shaderRef = useRef<HTMLDivElement>(null)
  const mountRef = useRef<ShaderMount | null>(null)

  useEffect(() => {
    const host = shaderRef.current
    if (!host) return
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const mount = new ShaderMount(
      host,
      meshGradientFragmentShader,
      CRITICAL_ACTION_UNIFORMS as never,
      undefined,
      reducedMotion || !shouldPlay ? 0 : 0.77,
      0,
      1,
    )
    mountRef.current = mount
    return () => {
      releaseShader(mount)
      mountRef.current = null
    }
  }, [])

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    mountRef.current?.setSpeed(reducedMotion || !shouldPlay ? 0 : 0.77)
  }, [shouldPlay])

  const style = {
    '--pg-critical-book-scale': bookScale,
    '--pg-critical-book-x': `${bookX}%`,
    '--pg-critical-book-y': `${bookY}%`,
  } as CSSProperties

  return (
    <div className="pg-critical-action-media" style={style}>
      <div ref={shaderRef} className="pg-critical-action-shader" aria-hidden="true" />
      <img
        className="pg-critical-action-book"
        src="/about/playground/critical-action-book.webp"
        alt=""
        draggable={false}
        aria-hidden="true"
      />
    </div>
  )
}
