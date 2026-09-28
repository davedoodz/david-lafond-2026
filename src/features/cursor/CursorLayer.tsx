import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useRoute } from '../../lib/router'
import { useTuning } from '../../tuning/useTuning'
import { CURSOR_CONFIG, CURSOR_PANEL } from './cursorConfig'
import { allowsSelectionStart, createInkEngine, type InkEngine } from './inkEngine'
import './cursor.css'

/** Reactive to hover/pointer capability changes, e.g. a convertible laptop
 * docking/undocking a mouse. Fine-pointer-only, as required for a cursor
 * that assumes hover and precise positioning. */
function useFinePointer(): boolean {
  const [fine, setFine] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches,
  )
  useEffect(() => {
    const query = window.matchMedia('(hover: hover) and (pointer: fine)')
    const onChange = () => setFine(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])
  return fine
}

/** Anything the dot should treat as clickable (grows + turns translucent over it). */
const CLICKABLE_SELECTOR =
  'a[href], button:not(:disabled), [role="button"], summary, select, label[for], input[type="checkbox"], input[type="radio"], input[type="submit"], input[type="button"]'

/**
 * The white dot cursor and its click-drag ink trail — ported in spirit from
 * ditto's `public/app.js` (cursor dot) and `public/draw.js` (ink). Mount once
 * at the app root. Native cursor is hidden only while a fine pointer is
 * active; fully inert on touch.
 */
export function CursorLayer() {
  const tuning = useTuning(CURSOR_PANEL, CURSOR_CONFIG)
  const tuningRef = useRef(tuning)
  tuningRef.current = tuning
  const fine = useFinePointer()
  const route = useRoute()

  const dotRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<InkEngine | null>(null)
  /** Re-reads the surface under a resting pointer; set while the cursor is mounted. */
  const resyncRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    document.documentElement.classList.toggle('cur-active', fine)
    return () => document.documentElement.classList.remove('cur-active')
  }, [fine])

  // Keep the ink engine's live options current without re-mounting listeners.
  useEffect(() => {
    engineRef.current?.setOptions({
      enabled: tuning.ink.enabled,
      width: tuning.ink.width,
      fadeMs: tuning.ink.fadeMs,
      colorDark: tuning.ink.colorDark,
      colorLight: tuning.ink.colorLight,
    })
  }, [tuning.ink])

  useEffect(() => {
    if (!fine) return
    const dot = dotRef.current
    const canvas = canvasRef.current
    if (!dot || !canvas) return

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const engine = createInkEngine(canvas, {
      enabled: tuningRef.current.ink.enabled,
      width: tuningRef.current.ink.width,
      fadeMs: tuningRef.current.ink.fadeMs,
      colorDark: tuningRef.current.ink.colorDark,
      colorLight: tuningRef.current.ink.colorLight,
    })
    engineRef.current = engine

    let rawX = window.innerWidth / 2
    let rawY = window.innerHeight / 2
    let curX = rawX
    let curY = rawY
    let frame = 0
    let visible = false
    let pressed = false
    let isLight = false
    let isHover = false

    const paint = (): void => {
      frame = 0
      const follow = reducedMotion ? 1 : 1 - tuningRef.current.dot.smoothing
      curX += (rawX - curX) * follow
      curY += (rawY - curY) * follow
      dot.style.transform = `translate3d(${curX.toFixed(2)}px, ${curY.toFixed(2)}px, 0) translate(-50%, -50%)`
      if (Math.abs(rawX - curX) > 0.05 || Math.abs(rawY - curY) > 0.05) frame = requestAnimationFrame(paint)
    }
    const request = (): void => {
      if (!frame) frame = requestAnimationFrame(paint)
    }

    const show = (): void => {
      if (visible) return
      visible = true
      dot.classList.add('is-visible')
    }
    const hide = (): void => {
      if (!visible) return
      visible = false
      dot.classList.remove('is-visible')
    }

    const applyOwner = (owner: HTMLElement | null): void => {
      const light = owner?.dataset.surface === 'light'
      if (light === isLight) return
      isLight = light
      dot.classList.toggle('is-light', light)
      canvas.classList.toggle('is-light', light)
    }
    const applySurface = (target: EventTarget | null): void => {
      applyOwner(target instanceof Element ? target.closest<HTMLElement>('[data-surface]') : null)
    }

    const applyHover = (target: EventTarget | null): void => {
      const hover = target instanceof Element && Boolean(target.closest(CLICKABLE_SELECTOR))
      if (hover === isHover) return
      isHover = hover
      dot.classList.toggle('is-hover', hover)
    }

    const onPointerMove = (event: PointerEvent): void => {
      if (event.pointerType !== 'mouse') return
      rawX = event.clientX
      rawY = event.clientY
      show()
      request()
      applySurface(event.target)
      applyHover(event.target)
      engine.move(event)
    }
    const onPointerOver = (event: PointerEvent): void => {
      if (event.pointerType !== 'mouse') return
      applySurface(event.target)
      applyHover(event.target)
    }
    const onPointerDown = (event: PointerEvent): void => {
      if (event.pointerType !== 'mouse' || event.button !== 0) return
      pressed = true
      dot.classList.add('is-pressed')
      engine.begin(event)
    }
    const endPress = (): void => {
      if (!pressed) return
      pressed = false
      dot.classList.remove('is-pressed')
      engine.finish()
    }
    const onPointerLeaveWindow = (event: PointerEvent): void => {
      if (event.relatedTarget !== null) return
      hide()
      endPress()
    }
    const onBlur = (): void => {
      hide()
      endPress()
    }
    // Highlighting may only start on the text itself; elsewhere the drag is ink.
    // Blocking the default also blocks the native click-away deselect, so clear
    // any highlight here — otherwise the ink sees a live selection and stops.
    const onMouseDown = (event: MouseEvent): void => {
      if (allowsSelectionStart(event)) return
      event.preventDefault()
      document.getSelection()?.removeAllRanges()
    }
    const onResize = (): void => {
      engine.resize()
      engine.refreshExclusions()
    }
    // A page switch swaps the surface under a pointer that has not moved, so no
    // pointer event fires. Hit-testing is useless here (during a View Transition
    // it lands on the transition overlay), so find the innermost visible surface
    // whose box holds the pointer. The style flush commits the new colour while
    // `is-instant` has the fade off.
    resyncRef.current = (): void => {
      if (!visible) return
      let owner: HTMLElement | null = null
      for (const el of document.querySelectorAll<HTMLElement>('[data-surface]')) {
        const r = el.getBoundingClientRect()
        if (rawX < r.left || rawX >= r.right || rawY < r.top || rawY >= r.bottom) continue
        if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) continue
        if (!owner || owner.contains(el)) owner = el
      }
      dot.classList.add('is-instant')
      applyOwner(owner)
      void getComputedStyle(dot, '::before').backgroundColor
      dot.classList.remove('is-instant')
    }

    window.addEventListener('pointermove', onPointerMove, { passive: true })
    window.addEventListener('pointerover', onPointerOver, { passive: true })
    window.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('mousedown', onMouseDown)
    window.addEventListener('pointerup', endPress)
    window.addEventListener('pointercancel', endPress)
    window.addEventListener('pointerout', onPointerLeaveWindow)
    window.addEventListener('blur', onBlur)
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('pointermove', onPointerMove)
      window.removeEventListener('pointerover', onPointerOver)
      window.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('pointerup', endPress)
      window.removeEventListener('pointercancel', endPress)
      window.removeEventListener('pointerout', onPointerLeaveWindow)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('resize', onResize)
      if (frame) cancelAnimationFrame(frame)
      engine.destroy()
      engineRef.current = null
      resyncRef.current = null
    }
  }, [fine])

  // Runs inside the route commit (also inside a View Transition's update), so the
  // colour is already right when the new page is first painted.
  useLayoutEffect(() => {
    resyncRef.current?.()
  }, [route])

  if (!fine) return null

  return (
    <>
      <canvas ref={canvasRef} className="cur-canvas" aria-hidden="true" />
      <div
        ref={dotRef}
        className="cur-dot"
        aria-hidden="true"
        style={{
          ['--cur-size' as string]: `${tuning.dot.size}px`,
          ['--cur-pressed-scale' as string]: tuning.dot.pressedScale,
          ['--cur-color-dark' as string]: tuning.ink.colorDark,
          ['--cur-color-light' as string]: tuning.ink.colorLight,
          ['--cur-hover-scale' as string]: tuning.hover.scale,
          ['--cur-hover-opacity' as string]: tuning.hover.opacity,
          ['--cur-hover-ms' as string]: `${tuning.hover.durationMs}ms`,
        }}
      />
    </>
  )
}

