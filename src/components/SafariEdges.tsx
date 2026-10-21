import { useLayoutEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useRoute } from '../lib/router'
import { isLightUnder } from '../lib/surface'
import './SafariEdges.css'

/** Fixed sampling strips outside the page/transition transforms (joshpuckett.me/seamless-mobile-safari). */
export function SafariEdges() {
  const ref = useRef<HTMLDivElement>(null)
  const route = useRoute()

  useLayoutEffect(() => {
    const host = ref.current
    const mobile = matchMedia('(hover: none) and (pointer: coarse)')
    if (!host || !mobile.matches || !CSS.supports('-webkit-touch-callout', 'none')) return
    const root = document.documentElement
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
    const originalTheme = meta?.content
    const previous = ['--edge-top-background', '--edge-bottom-background'].map((name) => [name, root.style.getPropertyValue(name)])
    let frame = 0
    let topColor = ''
    let bottomColor = ''
    const sample = () => {
      frame = 0
      const viewport = window.visualViewport
      const y = viewport?.offsetTop ?? 0
      const height = viewport?.height ?? innerHeight
      const x = document.documentElement.clientWidth / 2
      const palette = getComputedStyle(root)
      const color = (light: boolean) => palette.getPropertyValue(light ? '--paper' : '--ink-900').trim()
      const fallback = route === 'about' || route === 'momo' || route === 'filo'
      // Read both edges before writing styles. Ignore foreground cards and navigation chrome.
      const pass = '.nav, .works__card, .pg-card, .footer__inner'
      const top = isLightUnder(host, x, Math.max(0, Math.min(innerHeight - 1, y + 5)), pass)
      const bottom = isLightUnder(host, x, Math.max(0, Math.min(innerHeight - 1, y + height - 6)), pass)
      const nextTop = top === null && topColor ? topColor : color(top ?? fallback)
      const nextBottom = bottom === null && bottomColor ? bottomColor : color(bottom ?? fallback)
      if (nextTop !== topColor) {
        root.style.setProperty('--edge-top-background', nextTop)
        if (meta) meta.content = nextTop
        topColor = nextTop
      }
      if (nextBottom !== bottomColor) {
        root.style.setProperty('--edge-bottom-background', nextBottom)
        bottomColor = nextBottom
      }
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(sample) }
    root.dataset.safariEdges = ''
    sample()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    window.addEventListener('pageshow', schedule)
    window.visualViewport?.addEventListener('resize', schedule)
    window.visualViewport?.addEventListener('scroll', schedule)
    // The spring reveal and page transitions can move a surface without a scroll event.
    const timer = window.setInterval(schedule, 250)
    return () => {
      cancelAnimationFrame(frame)
      clearInterval(timer)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      window.removeEventListener('pageshow', schedule)
      window.visualViewport?.removeEventListener('resize', schedule)
      window.visualViewport?.removeEventListener('scroll', schedule)
      delete root.dataset.safariEdges
      for (const [name, value] of previous) {
        if (value) root.style.setProperty(name, value)
        else root.style.removeProperty(name)
      }
      if (meta && originalTheme !== undefined) meta.content = originalTheme
    }
  }, [route])

  return createPortal(
    <div ref={ref} className="safari-edges" aria-hidden="true">
      <div className="edge-top" />
      <div className="edge-bottom" />
    </div>,
    document.body,
  )
}
