/**
 * Touch landing: phones and tablets (narrow screens or touch-only pointers) land on the same
 * Selected works sheet tip whatever the screen's ratio. The edge is a circular arc spanning the full
 * screen width, its height 0.18 × the width (so every screen gets the same gentle curve, scaled),
 * never over 0.85 × the peek, so the curve meets the screen's sides above the fold.
 * The peek is 0.216 × width (reference: 440 px wide, 95 px) plus 0.11 × the screen height, so the
 * "Selected works" label, centred in it, clears a bottom browser toolbar (Safari, Chrome); it is
 * capped at 0.3 × the height for landscape tablets. SelectedWorks draws it; the Work hero compacts
 * its padding so the peek always stays on screen.
 */
export const TOUCH_LANDING = '(max-width: 640px), (pointer: coarse)'

export function touchDome(svh: number) {
  const width = document.documentElement.clientWidth
  const peek = Math.min(0.216 * width + 0.11 * svh, 0.3 * svh)
  return { side: 0, arch: Math.min(0.18 * width, 0.85 * peek), peek }
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
