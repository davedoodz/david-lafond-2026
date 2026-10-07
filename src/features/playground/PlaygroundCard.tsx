import { useCallback, useEffect, useRef, useState } from 'react'
import type { PlaygroundItem } from '../../data/playground'

type Props = {
  item: PlaygroundItem
  title: string
  isActive: boolean
  canReorder: boolean
  isDragging: boolean
  isDropTarget: boolean
  onOpen: (id: string, el: HTMLButtonElement, scrollY: number) => void
  onReorderStart: (id: string) => void
  onReorderOver: (id: string) => void
  onReorderDrop: (sourceId: string, targetId: string) => void
  onReorderEnd: () => void
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
export function PlaygroundCard({
  item,
  title,
  isActive,
  canReorder,
  isDragging,
  isDropTarget,
  onOpen,
  onReorderStart,
  onReorderOver,
  onReorderDrop,
  onReorderEnd,
  cardRef,
  mediaHostRef,
}: Props) {
  const [pressed, setPressed] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)
  const ignoreClickUntilRef = useRef(0)
  const pointerDownScrollRef = useRef<number | null>(null)
  const dragRef = useRef<{ pointerId: number; startX: number; startY: number; dragging: boolean; targetId: string } | null>(null)

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
    const handleClick = () => {
      const scrollY = pointerDownScrollRef.current ?? window.scrollY
      pointerDownScrollRef.current = null
      if (performance.now() < ignoreClickUntilRef.current) return
      onOpen(item.id, el, scrollY)
    }
    const handleDown = (event: PointerEvent) => {
      if (event.pointerType === 'touch') setPressed(true)
      pointerDownScrollRef.current = window.scrollY
      if (!canReorder || event.button !== 0) return
      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        dragging: false,
        targetId: item.id,
      }
    }
    const handleMove = (event: PointerEvent) => {
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      if (!drag.dragging && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) >= 6) {
        drag.dragging = true
        ignoreClickUntilRef.current = Number.POSITIVE_INFINITY
        el.setPointerCapture(event.pointerId)
        onReorderStart(item.id)
      }
      if (!drag.dragging) return
      event.preventDefault()
      const target = document.elementFromPoint(event.clientX, event.clientY)?.closest<HTMLElement>('.pg-card')
      const targetId = target?.dataset.pgId
      if (targetId && targetId !== drag.targetId) {
        drag.targetId = targetId
        onReorderOver(targetId)
      }
    }
    const finishPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') setPressed(false)
      const drag = dragRef.current
      if (!drag || drag.pointerId !== event.pointerId) return
      if (drag.dragging) {
        event.preventDefault()
        ignoreClickUntilRef.current = performance.now() + 250
        onReorderDrop(item.id, drag.targetId)
        onReorderEnd()
      }
      dragRef.current = null
      if (el.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId)
    }
    const cancelPointer = (event: PointerEvent) => {
      if (event.pointerType === 'touch') setPressed(false)
      if (dragRef.current?.pointerId === event.pointerId) {
        dragRef.current = null
        ignoreClickUntilRef.current = performance.now() + 250
        onReorderEnd()
      }
    }
    const handleLeave = (event: PointerEvent) => {
      if (event.pointerType === 'touch' && !dragRef.current?.dragging) setPressed(false)
    }
    el.addEventListener('click', handleClick)
    el.addEventListener('pointerdown', handleDown)
    el.addEventListener('pointermove', handleMove)
    el.addEventListener('pointerup', finishPointer)
    el.addEventListener('pointerleave', handleLeave)
    el.addEventListener('pointercancel', cancelPointer)
    return () => {
      el.removeEventListener('click', handleClick)
      el.removeEventListener('pointerdown', handleDown)
      el.removeEventListener('pointermove', handleMove)
      el.removeEventListener('pointerup', finishPointer)
      el.removeEventListener('pointerleave', handleLeave)
      el.removeEventListener('pointercancel', cancelPointer)
    }
  }, [canReorder, item.id, onOpen, onReorderDrop, onReorderEnd, onReorderOver, onReorderStart])

  return (
    <button
      type="button"
      ref={setButtonEl}
      data-pg-id={item.id}
      className="pg-card"
      data-reorderable={canReorder || undefined}
      data-presentation={item.presentation}
      data-dragging={isDragging || undefined}
      data-drop-target={isDropTarget || undefined}
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
