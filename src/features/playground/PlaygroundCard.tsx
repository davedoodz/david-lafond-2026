import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlaygroundItem } from '../../data/playground'

type Props = {
  item: PlaygroundItem
  title: string
  isActive: boolean
  onOpen: (id: string, el: HTMLButtonElement) => void
  cardRef: (id: string, el: HTMLButtonElement | null) => void
  mediaHostRef: (id: string, el: HTMLDivElement | null) => void
}

/**
 * One grid slot: placeholder/video fill + hover/focus title shade. Never layout-animates.
 *
 * The video, when present, is portal-rendered into this card from a different point in the
 * React tree (see Playground.tsx), so clicks/pointer events on it do NOT bubble through React's
 * synthetic event system to this button (React bubbles portaled events along the React tree,
 * not the DOM tree). Native `addEventListener` on the real button element sidesteps that.
 */
export function PlaygroundCard({ item, title, isActive, onOpen, cardRef, mediaHostRef }: Props) {
  const [pressed, setPressed] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)

  const setButtonEl = useCallback(
    (el: HTMLButtonElement | null) => {
      btnRef.current = el
      cardRef(item.id, el)
    },
    [item.id, cardRef],
  )
  const setMediaEl = useCallback((el: HTMLDivElement | null) => mediaHostRef(item.id, el), [item.id, mediaHostRef])

  useEffect(() => {
    const el = btnRef.current
    if (!el) return
    const handleClick = () => onOpen(item.id, el)
    const handleDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') setPressed(true)
    }
    const handleRelease = (e: PointerEvent) => {
      if (e.pointerType === 'touch') setPressed(false)
    }
    el.addEventListener('click', handleClick)
    el.addEventListener('pointerdown', handleDown)
    el.addEventListener('pointerup', handleRelease)
    el.addEventListener('pointerleave', handleRelease)
    el.addEventListener('pointercancel', handleRelease)
    return () => {
      el.removeEventListener('click', handleClick)
      el.removeEventListener('pointerdown', handleDown)
      el.removeEventListener('pointerup', handleRelease)
      el.removeEventListener('pointerleave', handleRelease)
      el.removeEventListener('pointercancel', handleRelease)
    }
  }, [item.id, onOpen])

  return (
    <button
      type="button"
      ref={setButtonEl}
      data-pg-id={item.id}
      className="pg-card"
      data-active={isActive || undefined}
      data-pressed={pressed || undefined}
      aria-label={`Open ${title}`}
    >
      <div className="pg-card-media" ref={setMediaEl} />
      <span className="card-shade" aria-hidden="true" />
      <p className="card-title">{title}</p>
    </button>
  )
}
