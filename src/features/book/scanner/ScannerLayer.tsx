/**
 * Dev experiment: the scanner beside the Book / Grid switch. Clicking it flies the 3D scanner over
 * the visible pages and flips the skeleton diagram with a beam that tracks the reveal.
 *
 * The button is the real control (focus, keyboard, hover); the model is drawn on a fixed canvas
 * portalled to <body> (an ancestor's entrance transform would otherwise trap position: fixed).
 * Loaded lazily, dev only, so three.js never reaches the public bundle.
 */
import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { pageUnion, visibleLayoutPages, type ScanSession } from '../useDiagramTransition'
import { createScanner, type Riffle, type ScannerController, type ScannerLook } from './scannerScene'
import './scanner.css'

const MODEL_URL = `${import.meta.env.BASE_URL}work/harvard-mit/scanner/scanner.glb`
const DECODER_PATH = `${import.meta.env.BASE_URL}draco/`
/** Gap between the switch and the scanner slot. */
const GAP = 14

export default function ScannerLayer({ visible, active, look, onPrepare, onScan, onRiffle, session }: {
  visible: boolean
  /** Diagram currently shown: the next scan turns it back into the pages. */
  active: boolean
  look: ScannerLook
  onPrepare: () => void
  onScan: () => void
  onRiffle: () => Riffle | null
  session: RefObject<ScanSession | null>
}) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const controller = useRef<ScannerController | null>(null)
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(false)
  const latest = useRef({ look, onPrepare, onScan, onRiffle, visible })
  latest.current = { look, onPrepare, onScan, onRiffle, visible }

  // Sit just right of the switch; the switch's width changes with its labels and the viewport.
  const size = look.restSize
  useLayoutEffect(() => {
    const button = buttonRef.current
    const switcher = button?.parentElement?.querySelector<HTMLElement>('.viewer__switch')
    if (!button || !switcher) return
    const place = () => {
      button.style.left = `${switcher.offsetLeft + switcher.offsetWidth + GAP}px`
      button.style.top = `${switcher.offsetTop + switcher.offsetHeight / 2 - size / 2}px`
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(switcher)
    observer.observe(document.documentElement)
    return () => observer.disconnect()
  }, [size])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    let cancelled = false
    void createScanner(canvas, {
      anchor: () => buttonRef.current?.getBoundingClientRect() ?? null,
      stage: () => pageUnion(visibleLayoutPages().map(({ rect }) => rect)),
      prepare: () => latest.current.onPrepare(),
      scan: () => latest.current.onScan(),
      riffle: () => latest.current.onRiffle(),
      session: () => session.current,
      onBusy: setBusy,
    }, latest.current.look, MODEL_URL, DECODER_PATH).then((scanner) => {
      if (cancelled) { scanner.dispose(); return }
      controller.current = scanner
      scanner.setVisible(latest.current.visible)
      setReady(true)
    }).catch((error: unknown) => console.error('Scanner failed to load', error))
    return () => {
      cancelled = true
      controller.current?.dispose()
      controller.current = null
    }
  }, [session])

  useEffect(() => { controller.current?.setLook(look) }, [look, ready])
  useEffect(() => { controller.current?.setVisible(visible) }, [visible, ready])

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className="viewer__scanner"
        style={{ width: size, height: size }}
        data-ready={ready && visible}
        aria-label={active ? 'Scan back to the pages' : 'Scan the pages into a skeleton grid'}
        aria-pressed={active}
        aria-disabled={busy || undefined}
        tabIndex={visible ? 0 : -1}
        onPointerEnter={() => controller.current?.setHover(true)}
        onPointerLeave={() => controller.current?.setHover(false)}
        onFocus={(event) => { if (event.currentTarget.matches(':focus-visible')) controller.current?.setHover(true) }}
        onBlur={() => controller.current?.setHover(false)}
        onClick={() => controller.current?.run()}
      />
      {createPortal(<canvas ref={canvasRef} className="scanner-canvas" data-visible={visible} aria-hidden="true" />, document.body)}
    </>
  )
}
