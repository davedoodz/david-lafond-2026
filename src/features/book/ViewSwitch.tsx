/**
 * Video / Book / Grid switch with one indicator that travels between buttons.
 *
 * Presets (see SWITCH_PRESETS):
 *   fade     indicator jumps; colours cross-fade (the original look)
 *   glide    smooth ease-out slide
 *   spring   slide with overshoot (`bounce`)
 *   stretch  leading edge moves first, trailing edge catches up (`lag`)
 *   squish   glide + the indicator squashes mid-travel and pops on arrival
 *
 * The indicator is positioned by its left/right insets from the measured
 * active button, so width changes animate along with position.
 */
import { springEasing } from '../../lib/springEasing'
import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react'

type Tuple = [number, number, number, number]

export const SWITCH_PRESETS = ['fade', 'glide', 'spring', 'stretch', 'squish'] as const

export const switchDials = () => ({
  preset: { type: 'select' as const, options: [...SWITCH_PRESETS], default: 'spring' },
  durationMs: [520, 100, 1500, 10] as Tuple,
  /** spring: overshoot amount. */
  bounce: [0.35, 0, 0.9, 0.01] as Tuple,
  /** stretch: how long the trailing edge waits (share of duration). */
  lag: [0.35, 0, 0.9, 0.01] as Tuple,
  /** squish: how much the indicator flattens mid-travel. */
  squash: [0.18, 0, 0.5, 0.01] as Tuple,
  /** Buttons shrink to this while pressed. */
  pressScale: [0.94, 0.8, 1, 0.01] as Tuple,
  /** Icon pop on the newly active button (1 = off). */
  iconPop: [1.18, 1, 1.6, 0.01] as Tuple,
  _collapsed: false,
})

export type SwitchLook = {
  preset: string
  durationMs: number
  bounce: number
  lag: number
  squash: number
  pressScale: number
  iconPop: number
}

type Item = { key: string; label: string; icon: ReactNode }


export function ViewSwitch({
  items,
  active,
  onSelect,
  look,
}: {
  items: Item[]
  active: string
  onSelect: (key: string) => void
  look: SwitchLook
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLSpanElement>(null)
  const prevIndex = useRef<number | null>(null)
  const index = items.findIndex((item) => item.key === active)

  useLayoutEffect(() => {
    const root = rootRef.current
    const pill = pillRef.current
    const button = root?.querySelectorAll<HTMLButtonElement>('button')[index]
    if (!root || !pill || !button) return
    const place = () => {
      pill.style.setProperty('--pill-l', `${button.offsetLeft}px`)
      pill.style.setProperty('--pill-r', `${root.clientWidth - button.offsetLeft - button.offsetWidth}px`)
    }
    const from = prevIndex.current
    prevIndex.current = index
    // Direction decides which edge leads in `stretch`.
    root.dataset.dir = from === null || from === index ? 'none' : index > from ? 'right' : 'left'
    place()

    if (from !== null && from !== index && look.preset === 'squish' && look.squash > 0) {
      const s = look.squash
      pill.animate(
        [
          // Only ever shrinks, so the pill stays inside the track.
          { scale: '1 1' },
          { scale: `${1 - s * 0.25} ${1 - s}`, offset: 0.45 },
          { scale: `1 ${1 - s * 0.3}`, offset: 0.8 },
          { scale: '1 1' },
        ],
        { duration: look.durationMs, easing: 'ease-out' },
      )
    }
    if (from !== null && from !== index && look.preset === 'fade') {
      pill.animate([{ opacity: 0 }, { opacity: 1 }], { duration: look.durationMs, easing: 'ease-out' })
    }
    const icon = button.querySelector('svg')
    if (from !== null && from !== index && look.iconPop > 1 && icon) {
      icon.animate([{ scale: 1 }, { scale: look.iconPop }, { scale: 1 }], {
        duration: Math.min(look.durationMs, 480),
        easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      })
    }

    const observer = new ResizeObserver(place)
    observer.observe(root)
    return () => observer.disconnect()
  }, [index, look.preset, look.squash, look.durationMs, look.iconPop])

  const style = {
    '--sw-ms': `${look.durationMs}ms`,
    '--sw-lag': `${Math.round(look.durationMs * look.lag)}ms`,
    '--sw-spring': springEasing(look.bounce),
    '--sw-press': look.pressScale,
  } as CSSProperties

  return (
    <div ref={rootRef} className="viewer__switch" role="group" aria-label="View" data-preset={look.preset} style={style}>
      <span ref={pillRef} className="viewer__switch-pill" aria-hidden="true" />
      {items.map((item) => (
        <button key={item.key} type="button" aria-pressed={item.key === active} onClick={() => onSelect(item.key)}>
          {item.icon}
          {item.label}
        </button>
      ))}
    </div>
  )
}
