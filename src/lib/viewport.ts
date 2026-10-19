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

/** Whether a CSS media query matches, kept live. */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (listener) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', listener)
      return () => mql.removeEventListener('change', listener)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export function usePrefersReducedMotion() {
  return useMedia('(prefers-reduced-motion: reduce)')
}
