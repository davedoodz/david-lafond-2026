/**
 * Shared by the per-case-study phone layout panels ("Momo · phone layout", "Filo · phone layout").
 * A panel is a table of folder → dial label → [CSS variable, default, min, max, step, unit]; every dial
 * sets its CSS variable on the case study's <main>, and the page's phone stylesheet reads it inside its
 * phone media query, so desktop never changes.
 *
 * DialKit spaces out capitals that follow another letter ("MIT" → "M I T") and treats "." as a key
 * path, so labels use capitals only at word starts, no dots, and stay short enough to show beside
 * their value.
 */
import { useEffect, useMemo, type RefObject } from 'react'
import { useTuning } from '../tuning/useTuning'

type Tuple = [number, number, number, number]
export type PhoneDialTable = Record<string, Record<string, [string, number, number, number, number, 'px' | '']>>

const configOf = (dials: PhoneDialTable) =>
  Object.fromEntries(
    Object.entries(dials).map(([folder, rows]) => [
      folder,
      Object.fromEntries(Object.entries(rows).map(([label, [, ...range]]) => [label, range.slice(0, 4) as Tuple])),
    ]),
  ) as Record<string, Record<string, Tuple>>

/** Registers the panel and writes its dials to `target`. A passive effect: the panel sits inside
 *  <main>, whose ref attaches after children's layout effects run. `dials` must be a module constant. */
export function usePhoneLayoutDials(panel: string, dials: PhoneDialTable, target: RefObject<HTMLElement | null>) {
  const config = useMemo(() => configOf(dials), [dials])
  const t = useTuning(panel, config) as unknown as Record<string, Record<string, number>>
  useEffect(() => {
    const el = target.current
    if (!el) return
    const set: string[] = []
    for (const [folder, rows] of Object.entries(dials)) {
      for (const [label, [name, , , , , unit]] of Object.entries(rows)) {
        el.style.setProperty(name, `${t[folder][label]}${unit}`)
        set.push(name)
      }
    }
    return () => set.forEach((name) => el.style.removeProperty(name))
  }, [t, dials, target])
}
