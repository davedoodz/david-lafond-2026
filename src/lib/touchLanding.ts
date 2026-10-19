/**
 * Touch landing: phones and tablets (narrow screens or touch-only pointers) land on the same
 * Selected works sheet tip whatever the screen's ratio. The edge is a circular arc spanning the full
 * screen width, its height a fixed share of the width (TOUCH_ARCS, picked in DialKit's "Selected
 * works › touchArc"), so every screen gets the same curve, scaled. It never exceeds 0.85 × the
 * peek, so the curve meets the screen's sides above the fold.
 * The peek is 0.216 × width (reference: 440 px wide, 95 px) plus 0.11 × the screen height, so the
 * "Selected works" label, centred in it, clears a bottom browser toolbar (Safari, Chrome); it is
 * capped at 0.3 × the height for landscape tablets. SelectedWorks draws it; the Work hero compacts
 * its padding so the peek always stays on screen.
 */
export const TOUCH_LANDING = '(max-width: 640px), (pointer: coarse)'

/** Arc height as a share of the screen width. A half circle would be 0.5. */
export const TOUCH_ARCS = {
  Whisper: 0.08,
  Delicate: 0.12,
  Gentle: 0.15,
  Soft: 0.18,
  Round: 0.23,
  Bold: 0.3,
} as const

export function touchDome(svh: number, height: number = TOUCH_ARCS.Soft) {
  const width = document.documentElement.clientWidth
  const peek = Math.min(0.216 * width + 0.11 * svh, 0.3 * svh)
  return { side: 0, arch: Math.min(height * width, 0.85 * peek), peek }
}

/** 100svh in px: the viewport with the browser's toolbars shown, which the landing is sized against. */
export function smallViewportHeight() {
  const probe = document.createElement('div')
  probe.style.cssText = 'position:fixed;top:0;height:100svh;visibility:hidden;pointer-events:none'
  document.body.append(probe)
  const h = probe.offsetHeight
  probe.remove()
  return h
}
