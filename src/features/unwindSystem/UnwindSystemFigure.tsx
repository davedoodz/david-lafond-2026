import { useEffect, useRef, useState } from 'react'
import { mountUnwindSystem, type UnwindSystemHandle } from './mountUnwindSystem'

/** Below this width the diagram switches to the diamond layout. */
const NARROW = '(max-width: 720px)'

/**
 * The case study's system figure: the studio walkthrough's exact timed sequence,
 * without its caption, controls or step navigation.
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
    mountUnwindSystem(root, { mode: 'sequence', narrow }).then((mounted) => {
      if (cancelled) return mounted.destroy()
      handle = mounted
      observer = new IntersectionObserver(([entry]) => {
        if (entry.isIntersecting) mounted.start()
        else mounted.pause()
      }, { threshold: 0.35 })
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
