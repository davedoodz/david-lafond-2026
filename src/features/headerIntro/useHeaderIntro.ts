/**
 * First-load entrance for the header: the dither shader, the Davebot ghost and
 * the four nav links, each with its own preset. Plays once per document load
 * (it is mounted in App, which never remounts, so page switches do not replay it);
 * "Replay" re-runs it.
 *
 * Only opacity / transform / filter / clip-path animate (WAAPI), on the
 * wrappers, so the ghost's hover `scale` and the links' colour transitions
 * keep working. The nav belongs to the page, which may still be a lazy chunk on
 * first paint, so its part waits for `.nav` and keeps the shared start time.
 */
import { useLayoutEffect, useState } from 'react'
import { springEasing } from '../../lib/springEasing'
import { useTuningController } from '../../tuning/useTuning'

type Tuple = [number, number, number, number]

const CONFIG = {
  replay: { type: 'action' as const, label: 'Replay' },
  shader: {
    /** fade · drop from above · unfold downward · sweep open from the centre · blur into focus */
    preset: { type: 'select' as const, options: ['none', 'fade', 'drop', 'unfold', 'sweep', 'blur'], default: 'fade' },
    delayMs: [0, 0, 2000, 10] as Tuple,
    durationMs: [1400, 150, 4000, 10] as Tuple,
  },
  ghost: {
    /** fade · pop on a spring · drop in with a bounce · spin in */
    preset: { type: 'select' as const, options: ['none', 'fade', 'pop', 'drop', 'spin'], default: 'pop' },
    delayMs: [200, 0, 2000, 10] as Tuple,
    durationMs: [800, 150, 2500, 10] as Tuple,
    bounce: [0.4, 0, 1, 0.01] as Tuple,
  },
  links: {
    /** fade · rise (hero entrance) · drop from above · slide in from the right · blur into focus */
    preset: { type: 'select' as const, options: ['none', 'fade', 'rise', 'drop', 'slide', 'blur'], default: 'rise' },
    delayMs: [300, 0, 2000, 10] as Tuple,
    durationMs: [800, 150, 2500, 10] as Tuple,
    staggerMs: [70, 0, 400, 5] as Tuple,
    distance: [12, 0, 80, 1] as Tuple,
  },
}

const EXPO_OUT = 'cubic-bezier(0.16, 1, 0.3, 1)'

/** `o` is the band's resting opacity (its own dial), so the intro lands on it without a jump. */
function shaderFrames(preset: string, o: string): Keyframe[] {
  switch (preset) {
    case 'drop':
      return [{ opacity: 0, transform: 'translateY(-40%)' }, { opacity: o, transform: 'none' }]
    case 'unfold':
      return [{ clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)' }]
    case 'sweep':
      return [{ clipPath: 'inset(0 50% 0 50%)' }, { clipPath: 'inset(0 0% 0 0%)' }]
    case 'blur':
      return [{ opacity: 0, filter: 'blur(12px)' }, { opacity: o, filter: 'blur(0px)' }]
    default:
      return [{ opacity: 0 }, { opacity: o }]
  }
}

function ghostFrames(preset: string): Keyframe[] {
  switch (preset) {
    case 'pop':
      return [{ opacity: 0, transform: 'scale(0.4)', easing: 'linear' }, { opacity: 1, offset: 0.2 }, { opacity: 1, transform: 'none' }]
    case 'drop':
      return [{ opacity: 0, transform: 'translateY(-28px)', easing: 'linear' }, { opacity: 1, offset: 0.2 }, { opacity: 1, transform: 'none' }]
    case 'spin':
      return [{ opacity: 0, transform: 'rotate(-120deg) scale(0.5)' }, { opacity: 1, transform: 'none' }]
    default:
      return [{ opacity: 0 }, { opacity: 1 }]
  }
}

function linkFrames(preset: string, d: number): Keyframe[] {
  switch (preset) {
    case 'rise':
      return [{ opacity: 0, transform: `translateY(${d}px)`, filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'blur(0px)' }]
    case 'drop':
      return [{ opacity: 0, transform: `translateY(${-d}px)` }, { opacity: 1, transform: 'none' }]
    case 'slide':
      return [{ opacity: 0, transform: `translateX(${d * 2}px)` }, { opacity: 1, transform: 'none' }]
    case 'blur':
      return [{ opacity: 0, filter: 'blur(8px)' }, { opacity: 1, filter: 'blur(0px)' }]
    default:
      return [{ opacity: 0 }, { opacity: 1 }]
  }
}

export function useHeaderIntro() {
  const [run, setRun] = useState(0)
  const { values: v } = useTuningController('Header intro', CONFIG, {
    onAction: (action) => {
      if (action === 'replay') setRun((n) => n + 1)
    },
  })

  useLayoutEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const start = performance.now()
    const animations: Animation[] = []
    // Delay is measured from the shared start, so a late-mounting nav still lines up.
    const play = (el: Element, frames: Keyframe[], delay: number, duration: number, easing = EXPO_OUT) => {
      animations.push(
        el.animate(frames, { delay: delay - (performance.now() - start), duration, easing, fill: 'backwards' }),
      )
    }

    const band = document.querySelector('.dither-band--header')
    if (band && v.shader.preset !== 'none') {
      play(band, shaderFrames(v.shader.preset, getComputedStyle(band).opacity), v.shader.delayMs, v.shader.durationMs, v.shader.preset === 'fade' ? 'ease-out' : EXPO_OUT)
    }

    const playNav = (nav: Element) => {
      const ghost = nav.querySelector('.nav__ghost')
      if (ghost && v.ghost.preset !== 'none') {
        const easing = v.ghost.preset === 'pop' || v.ghost.preset === 'drop' ? springEasing(v.ghost.bounce) : EXPO_OUT
        play(ghost, ghostFrames(v.ghost.preset), v.ghost.delayMs, v.ghost.durationMs, easing)
      }
      if (v.links.preset !== 'none') {
        nav.querySelectorAll('.nav__links a').forEach((link, i) => {
          play(link, linkFrames(v.links.preset, v.links.distance), v.links.delayMs + i * v.links.staggerMs, v.links.durationMs)
        })
      }
    }

    const nav = document.querySelector('.nav')
    let observer: MutationObserver | undefined
    if (nav) playNav(nav)
    else {
      observer = new MutationObserver(() => {
        const found = document.querySelector('.nav')
        if (!found) return
        observer?.disconnect()
        playNav(found)
      })
      observer.observe(document.body, { childList: true, subtree: true })
    }

    return () => {
      observer?.disconnect()
      animations.forEach((a) => a.cancel())
    }
    // App mounts once per document, so this is the first load; Replay bumps `run`.
    // Dial changes are picked up by the next Replay.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run])
}
