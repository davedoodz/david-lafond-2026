import { useEffect, useState, useSyncExternalStore, type RefObject } from 'react'

/**
 * Entry-path replacements for Motion's `useInView` / `useReducedMotion`, so the
 * landing chunk does not pull in Motion. Lazy chunks keep using Motion.
 */
export function useInView(ref: RefObject<Element | null>, { once = false, amount = 0 }: { once?: boolean; amount?: number } = {}) {
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting)
        if (once && entry.isIntersecting) observer.disconnect()
      },
      { threshold: amount },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [ref, once, amount])
  return inView
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeReducedMotion(listener: () => void) {
  const mql = window.matchMedia(REDUCED_MOTION)
  mql.addEventListener('change', listener)
  return () => mql.removeEventListener('change', listener)
}

export function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  )
}
