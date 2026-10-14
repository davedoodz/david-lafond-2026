/**
 * Freeze page scroll (wheel, touch, keys, scrollbar) at the current position; returns the release.
 * Nothing scrolls while locked, so no scroll listeners or springs have to chase moving content.
 * `hold: false` blocks only the user: the caller drives `scrollTo` itself and keeps where it ends.
 */
export function lockScroll({ hold = true } = {}) {
  const root = document.documentElement
  const body = document.body
  const lockedY = window.scrollY
  const previous = {
    rootOverflow: root.style.overflow,
    rootOverscroll: root.style.overscrollBehavior,
    rootSnap: root.style.scrollSnapType,
    bodyOverflow: body.style.overflow,
    bodyOverscroll: body.style.overscrollBehavior,
  }
  const preventScroll = (event: Event) => event.preventDefault()
  const holdScrollPosition = () => {
    if (window.scrollY !== lockedY) window.scrollTo({ top: lockedY, behavior: 'instant' })
  }
  root.style.overflow = 'hidden'
  root.style.overscrollBehavior = 'none'
  root.style.scrollSnapType = 'none'
  body.style.overflow = 'hidden'
  body.style.overscrollBehavior = 'none'
  if (hold) window.addEventListener('scroll', holdScrollPosition, { passive: true })
  window.addEventListener('wheel', preventScroll, { passive: false, capture: true })
  window.addEventListener('touchmove', preventScroll, { passive: false, capture: true })
  return () => {
    window.removeEventListener('scroll', holdScrollPosition)
    window.removeEventListener('wheel', preventScroll, { capture: true })
    window.removeEventListener('touchmove', preventScroll, { capture: true })
    root.style.overflow = previous.rootOverflow
    root.style.overscrollBehavior = previous.rootOverscroll
    root.style.scrollSnapType = previous.rootSnap
    body.style.overflow = previous.bodyOverflow
    body.style.overscrollBehavior = previous.bodyOverscroll
    if (hold) window.scrollTo({ top: lockedY, behavior: 'instant' })
  }
}
