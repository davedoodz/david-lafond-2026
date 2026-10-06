import { useEffect, useRef, useState } from 'react'
import { mountUnwindSystem, type UnwindSystemHandle } from './mountUnwindSystem'

/** Below this width the diagram switches to the diamond layout. */
const NARROW = '(max-width: 720px)'

/**
 * The Unwind system walkthrough on the case study: you, the watch, the phone, Momo and the experts,
 * one exchange at a time. It plays the tuning baked in ./settings.json (edit it in
 * studio/unwind-system-design.html) and starts when it scrolls into view.
 */
export function UnwindSystemFigure() {
  const ref = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(() => matchMedia(NARROW).matches)

  useEffect(() => {
    const query = matchMedia(NARROW)
    const onChange = () => setNarrow(query.matches)
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [])

  // The layout is built once per mount, so a width change across NARROW remounts the diagram.
  useEffect(() => {
    const host = ref.current
    if (!host) return
    // Each mount gets its own box, so an earlier mount still resolving can't clear a newer one.
    const root = host.appendChild(document.createElement('div'))
    let cancelled = false
    let handle: UnwindSystemHandle | undefined
    let observer: IntersectionObserver | undefined
    mountUnwindSystem(root, { mode: 'embed', narrow }).then((h) => {
      if (cancelled) return h.destroy()
      handle = h
      observer = new IntersectionObserver(
        ([entry]) => {
          if (!entry.isIntersecting) return
          h.start()
          observer?.disconnect()
        },
        { threshold: 0.35 },
      )
      observer.observe(root)
    })
    return () => {
      cancelled = true
      observer?.disconnect()
      handle?.destroy()
      root.remove()
    }
  }, [narrow])

  return <div ref={ref} className="case__figure unwind-system" />
}
