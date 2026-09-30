import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { createPortal } from 'react-dom'
import { animate, motion, useMotionValue, useReducedMotion, type Transition } from 'motion/react'
import { useTuningController } from '../../tuning/useTuning'
import { PHOTO_STACK_CONFIG } from './photoStack.config'
import { toMotionTransition, estimateSeconds } from './toMotionTransition'
import './photoStack.css'

type Pose = { x: number; y: number; rotate: number }
/** A pose plus scale; cards rest at scale 1. */
type FullPose = Pose & { scale: number }
type TopEffect = { x: number; y: number; rotate: number; scale: number }

/** Front-card hover looks. Offsets and rotation pivot on the card's centre. */
const TOP_PRESETS: Record<string, TopEffect> = {
  lift: { x: 0, y: -12, rotate: 0, scale: 1.03 },
  pop: { x: 0, y: 0, rotate: 0, scale: 1.07 },
  'tilt-left': { x: -4, y: -4, rotate: -4, scale: 1.02 },
  'tilt-right': { x: 4, y: -4, rotate: 4, scale: 1.02 },
  'nudge-left': { x: -28, y: 0, rotate: -2, scale: 1 },
  peel: { x: -10, y: -12, rotate: -6, scale: 1.04 },
  none: { x: 0, y: 0, rotate: 0, scale: 1 },
}

const toRad = (deg: number) => (deg * Math.PI) / 180

/**
 * Cards transform from their top-left corner. Returns the top-left pose that
 * moves the card's centre by (dx, dy) and rotates/scales it about that centre.
 */
function aroundCentre(base: Pose, fx: TopEffect, width: number, height: number): FullPose {
  const cx = width / 2
  const cy = height / 2
  const rotate = base.rotate + fx.rotate
  const a0 = toRad(base.rotate)
  const a1 = toRad(rotate)
  const restX = Math.cos(a0) * cx - Math.sin(a0) * cy
  const restY = Math.sin(a0) * cx + Math.cos(a0) * cy
  const nextX = fx.scale * (Math.cos(a1) * cx - Math.sin(a1) * cy)
  const nextY = fx.scale * (Math.sin(a1) * cx + Math.cos(a1) * cy)
  return { x: base.x + restX - nextX + fx.x, y: base.y + restY - nextY + fx.y, rotate, scale: fx.scale }
}

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

const IMAGES = ['/about/image1.webp', '/about/image2.webp', '/about/image3.webp', '/about/image4.webp', '/about/image5.webp']
const IMAGE_ALT = ['David outdoors in the city, wearing red sunglasses', 'David speaking into a microphone, black and white', 'David skiing in the mountains', 'David smiling in front of a workshop tool wall', 'David in sunglasses standing in a tulip garden']
const CARD_COUNT = 5

function useCardMotionValues(initial: Pose) {
  const x = useMotionValue(initial.x)
  const y = useMotionValue(initial.y)
  const rotate = useMotionValue(initial.rotate)
  const scale = useMotionValue(1)
  // Cards start hidden so their below-slot start pose never sits over the heading.
  const opacity = useMotionValue(0)
  return useMemo(() => ({ x, y, rotate, scale, opacity }), [x, y, rotate, scale, opacity])
}

export function PhotoStack({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion()
  const playEntranceRef = useRef<() => void>(() => {})
  const { values, setValue } = useTuningController('Photo stack', PHOTO_STACK_CONFIG, {
    onAction: (action) => {
      if (action === 'entrance.replay') playEntranceRef.current()
    },
  })

  // Moving a front-card dial means "use my numbers": flip the preset to 'custom'.
  const { x: topX, y: topY, rotate: topRotate, scale: topScale } = values.topHover
  const topKey = `${topX}|${topY}|${topRotate}|${topScale}`
  const topKeyRef = useRef(topKey)
  useEffect(() => {
    if (topKeyRef.current === topKey) return
    topKeyRef.current = topKey
    if (values.topHover.preset !== 'custom') setValue('topHover.preset', 'custom')
  }, [topKey, values.topHover.preset, setValue])

  const slotPoses = useMemo<Pose[]>(
    () => [values.slots.slot0, values.slots.slot1, values.slots.slot2, values.slots.slot3, values.slots.slot4],
    [values.slots],
  )
  const imagePos = useMemo(
    () => [values.images.image1, values.images.image2, values.images.image3, values.images.image4, values.images.image5],
    [values.images],
  )

  // Starting order from the Order dials: first pick wins, unpicked photos fill the gaps.
  const { order: picks } = values
  const startKey = [picks.front, picks.second, picks.third, picks.fourth, picks.back].join('|')
  const startOrder = useMemo(() => {
    const out: number[] = []
    for (const pick of startKey.split('|')) {
      const id = Number(pick.replace('photo ', '')) - 1
      if (id >= 0 && id < CARD_COUNT && !out.includes(id)) out.push(id)
    }
    for (let id = 0; id < CARD_COUNT; id++) if (!out.includes(id)) out.push(id)
    return out
  }, [startKey])
  const zForOrder = (next: number[]) => {
    const z: number[] = []
    next.forEach((id, slot) => {
      z[id] = 40 - slot * 10
    })
    return z
  }

  // `order[slot] = cardId`.
  const [order, setOrder] = useState<number[]>(startOrder)
  const orderRef = useRef(order)
  orderRef.current = order

  const [zIndices, setZIndices] = useState<number[]>(() => zForOrder(startOrder))
  const zIndicesRef = useRef(zIndices)
  zIndicesRef.current = zIndices

  // Re-stack when an Order dial changes (not on mount: state already starts there).
  const startKeyRef = useRef(startKey)
  useEffect(() => {
    if (startKeyRef.current === startKey) return
    startKeyRef.current = startKey
    orderRef.current = startOrder
    zIndicesRef.current = zForOrder(startOrder)
    setOrder(startOrder)
    setZIndices(zIndicesRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startKey, startOrder])

  const [cyclingIds, setCyclingIds] = useState<Set<number>>(() => new Set())
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [finePointer, setFinePointer] = useState(false)
  const [entered, setEntered] = useState(false)

  const initialPoseFor = (cardId: number): Pose => {
    const base = slotPoses[startOrder.indexOf(cardId)]
    return { x: base.x, y: base.y + values.entrance.startOffsetY, rotate: base.rotate }
  }

  const mv = [
    useCardMotionValues(initialPoseFor(0)),
    useCardMotionValues(initialPoseFor(1)),
    useCardMotionValues(initialPoseFor(2)),
    useCardMotionValues(initialPoseFor(3)),
    useCardMotionValues(initialPoseFor(4)),
  ]
  const rootRef = useRef<HTMLDivElement>(null)
  const mvRef = useRef(mv)
  mvRef.current = mv

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setFinePointer(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const moveTo = useCallback((cardId: number, target: FullPose, transition: Transition) => {
    const { x, y, rotate, scale } = mvRef.current[cardId]
    animate(x, target.x, transition)
    animate(y, target.y, transition)
    animate(rotate, target.rotate, transition)
    animate(scale, target.scale, transition)
  }, [])

  const settle = useCallback(
    (cardId: number, transition: Transition) => {
      moveTo(cardId, { ...slotPoses[orderRef.current.indexOf(cardId)], scale: 1 }, transition)
    },
    [moveTo, slotPoses],
  )

  // Entrance: jump every card below its slot, then spring up into place, staggered back-to-front.
  const playEntrance = useCallback(() => {
    setEntered(false)
    const tuckSpring = toMotionTransition(values.entrance.spring)
    for (let cardId = 0; cardId < CARD_COUNT; cardId++) {
      const slot = orderRef.current.indexOf(cardId)
      const base = slotPoses[slot]
      const { x, y, rotate, opacity } = mvRef.current[cardId]
      if (reducedMotion) {
        x.set(base.x)
        y.set(base.y)
        rotate.set(base.rotate)
        opacity.set(1)
        continue
      }
      x.set(base.x)
      y.set(base.y + values.entrance.startOffsetY)
      rotate.set(base.rotate)
      opacity.set(0)
      const delay = values.entrance.delay + (CARD_COUNT - 1 - slot) * values.entrance.stagger
      animate(x, base.x, { ...tuckSpring, delay })
      animate(y, base.y, { ...tuckSpring, delay })
      animate(rotate, base.rotate, { ...tuckSpring, delay })
      animate(opacity, 1, { duration: values.entrance.fade, ease: 'easeOut', delay })
    }
    const totalMs = reducedMotion
      ? 0
      : 1000 * (values.entrance.delay + CARD_COUNT * values.entrance.stagger + estimateSeconds(values.entrance.spring))
    window.setTimeout(() => setEntered(true), totalMs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, slotPoses, values.entrance])

  playEntranceRef.current = playEntrance

  // Start once the page wipe is `wipeStart` of the way in (so the cards carry on its upward
  // motion) and every photo is decoded (decoding mid-spring drops frames).
  const wipeStartRef = useRef(values.entrance.wipeStart)
  wipeStartRef.current = values.entrance.wipeStart
  useEffect(() => {
    let cancelled = false
    const transitionDone = () =>
      new Promise<void>((resolve) => {
        const check = () => {
          const root = document.documentElement
          if (!root.dataset.vt) return resolve()
          const wipe = root
            .getAnimations({ subtree: true })
            .find((a) => (a.effect as KeyframeEffect | null)?.pseudoElement === '::view-transition-new(root)')
          const progress = wipe?.effect?.getComputedTiming().progress
          if (wipe && wipe.playState !== 'idle' && (progress ?? 0) >= wipeStartRef.current) return resolve()
          requestAnimationFrame(check)
        }
        check()
      })
    const decoded = Array.from(rootRef.current?.querySelectorAll('img') ?? [], (img) => img.decode().catch(() => {}))
    void Promise.all([transitionDone(), ...decoded]).then(() => {
      // One extra frame so the first animated frame is not the one that paints the decoded images.
      requestAnimationFrame(() => {
        if (!cancelled) playEntrance()
      })
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep resting cards aligned with their current slot when dial values change or the pointer leaves.
  useEffect(() => {
    if (!entered) return
    for (let cardId = 0; cardId < CARD_COUNT; cardId++) {
      if (cyclingIds.has(cardId) || cardId === hoveredId) continue
      settle(cardId, toMotionTransition(values.cycle.springTuck))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, entered])

  const runCycle = useCallback(async () => {
    const currentOrder = orderRef.current
    const frontId = currentOrder[0]
    const newOrder = [...currentOrder.slice(1), frontId]
    setOrder(newOrder)
    orderRef.current = newOrder

    const zFor = (slot: number) => 40 - slot * 10
    const nextZ = zIndicesRef.current.slice()
    for (const id of newOrder.slice(0, CARD_COUNT - 1)) {
      nextZ[id] = zFor(newOrder.indexOf(id))
    }
    nextZ[frontId] = 999
    setZIndices(nextZ.slice())
    zIndicesRef.current = nextZ

    setCyclingIds((prev) => new Set(prev).add(frontId))

    const { x, y, rotate, scale } = mvRef.current[frontId]
    const frontPose = slotPoses[0]
    const backSlot = CARD_COUNT - 1
    const backPose = slotPoses[backSlot]
    // Leaves by the chosen side, leaning the same way (negative rotation leans left).
    const side = values.cycle.direction === 'right' ? 1 : -1
    if (reducedMotion) {
      x.set(backPose.x)
      y.set(backPose.y)
      rotate.set(backPose.rotate)
      scale.set(1)
    } else {
      const outSpring = toMotionTransition(values.cycle.springOut)
      const tuckSpring = toMotionTransition(values.cycle.springTuck)
      // Tuck starts before the pull-out settles, so the card arcs through the peak instead of stopping there.
      const outMs = 1000 * estimateSeconds(values.cycle.springOut) * values.cycle.handoff
      const tuckMs = 1000 * estimateSeconds(values.cycle.springTuck)
      const totalMs = outMs + tuckMs
      const peak = {
        x: frontPose.x + side * values.cycle.pullOutX,
        y: frontPose.y + values.cycle.liftY,
        rotate: frontPose.rotate + side * values.cycle.tilt,
      }
      // Sequence on the springs' visual durations, never on their promises: an
      // interrupted Motion animation never resolves, which would stall the queue.
      // Retargeting mid-flight keeps velocity, so the out→tuck handoff stays fluid.
      moveTo(frontId, { ...peak, scale: 1 }, outSpring)
      await sleep(outMs)
      moveTo(frontId, { ...backPose, scale: 1 }, tuckSpring)
      await sleep(Math.max(0, totalMs * values.cycle.swapAt - outMs))
      setZIndices((prev) => {
        const next = prev.slice()
        next[frontId] = zFor(orderRef.current.indexOf(frontId)) // later taps may already have moved it up a slot
        return next
      })
      await sleep(Math.max(0, totalMs - Math.max(outMs, totalMs * values.cycle.swapAt)))
    }
    if (reducedMotion) {
      setZIndices((prev) => {
        const next = prev.slice()
        next[frontId] = zFor(orderRef.current.indexOf(frontId)) // later taps may already have moved it up a slot
        return next
      })
    }

    setCyclingIds((prev) => {
      const next = new Set(prev)
      next.delete(frontId)
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moveTo, reducedMotion, slotPoses, values.cycle])

  // Every tap starts right away (order updates synchronously), so rapid taps overlap instead of waiting in line.
  const cycle = useCallback(() => {
    void runCycle()
  }, [runCycle])

  // Clicking a card behind the front one brings it straight to the front; the
  // cards that were ahead of it each drop back one slot (via the order effect).
  const runBringToFront = useCallback(
    async (cardId: number) => {
      const currentOrder = orderRef.current
      if (currentOrder.indexOf(cardId) <= 0) return
      const newOrder = [cardId, ...currentOrder.filter((id) => id !== cardId)]
      setOrder(newOrder)
      orderRef.current = newOrder

      // Above everything while it travels, then settles to the front slot's z.
      const nextZ = zIndicesRef.current.slice()
      newOrder.forEach((id, slot) => {
        nextZ[id] = 40 - slot * 10
      })
      nextZ[cardId] = 999
      setZIndices(nextZ.slice())
      zIndicesRef.current = nextZ
      setCyclingIds((prev) => new Set(prev).add(cardId))

      const front = { ...slotPoses[0], scale: 1 }
      if (reducedMotion) {
        const { x, y, rotate, scale } = mvRef.current[cardId]
        x.set(front.x)
        y.set(front.y)
        rotate.set(front.rotate)
        scale.set(1)
      } else {
        moveTo(cardId, front, toMotionTransition(values.cycle.springTuck))
        await sleep(1000 * estimateSeconds(values.cycle.springTuck))
      }

      setZIndices((prev) => {
        const next = prev.slice()
        next[cardId] = 40
        return next
      })
      setCyclingIds((prev) => {
        const next = new Set(prev)
        next.delete(cardId)
        return next
      })
    },
    [moveTo, reducedMotion, slotPoses, values.cycle.springTuck],
  )

  const bringToFront = useCallback(
    (cardId: number) => {
      void runBringToFront(cardId)
    },
    [runBringToFront],
  )

  const handleHoverStart = (cardId: number) => {
    if (!finePointer || reducedMotion || cyclingIds.has(cardId)) return
    setHoveredId(cardId)
    const slot = orderRef.current.indexOf(cardId)
    const base = slotPoses[slot]
    if (slot === 0) {
      const { preset } = values.topHover
      const fx = preset === 'custom' ? values.topHover : (TOP_PRESETS[preset] ?? TOP_PRESETS.lift)
      moveTo(cardId, aroundCentre(base, fx, values.card.width, values.card.height), toMotionTransition(values.topHover.spring))
      return
    }
    const { second, third, fourth, back, spring } = values.backHover
    const peek = [second, third, fourth, back][slot - 1]
    moveTo(
      cardId,
      { x: base.x + peek.pullX, y: base.y + peek.pullY, rotate: base.rotate + peek.rotate, scale: 1 },
      toMotionTransition(spring),
    )
  }

  const handleHoverEnd = (cardId: number) => {
    if (hoveredId !== cardId) return
    setHoveredId(null)
    // A cycling card owns its motion values until the choreography ends.
    if (cyclingIds.has(cardId)) return
    const wasTop = orderRef.current.indexOf(cardId) === 0
    settle(cardId, toMotionTransition(wasTop ? values.topHover.spring : values.backHover.spring))
  }

  // Cards slide under a still pointer while they move, and hover events fired mid-move are
  // ignored (the card is cycling); no new event comes once it settles. So when a move ends,
  // re-check which card is under the last pointer position and hover that one.
  const pointerRef = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    const p = pointerRef.current
    if (!p || !finePointer || reducedMotion) return
    const card = document.elementFromPoint(p.x, p.y)?.closest<HTMLElement>('.ps-card')
    const id = card && rootRef.current?.contains(card) ? Number(card.dataset.card) : null
    if (id === hoveredId || (id !== null && cyclingIds.has(id))) return
    if (hoveredId !== null) handleHoverEnd(hoveredId)
    if (id !== null) handleHoverStart(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cyclingIds])

  const width = values.card.width
  const height = values.card.height
  const containerWidth = Math.max(...slotPoses.map((p) => p.x)) + width
  const containerHeight = Math.max(...slotPoses.map((p) => p.y)) + height

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 640px)')
    const update = () => setIsMobile(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])
  const scale = isMobile ? values.layout.mobileScale : values.layout.desktopScale
  const topOffset = isMobile ? values.layout.mobileTopOffset : values.layout.desktopTopOffset

  // Caption for the hovered card. The last hovered id is kept so the text stays
  // put while the caption fades out.
  // Photo 5 colour correction; no filter at all when every dial is at its neutral value.
  const grade = values.images.image5
  const gradeFilter =
    grade.brightness === 1 && grade.contrast === 1 && grade.saturation === 1 && grade.warmth === 0 && grade.hue === 0
      ? undefined
      : `brightness(${grade.brightness}) contrast(${grade.contrast}) saturate(${grade.saturation}) sepia(${grade.warmth}) hue-rotate(${grade.hue}deg)`

  const captionStyle = values.caption.style
  const { image1, image2, image3, image4, image5 } = values.caption.text
  const captions = [image1, image2, image3, image4, image5]
  const shownId = hoveredId !== null && !cyclingIds.has(hoveredId) && captions[hoveredId].trim() ? hoveredId : null
  const lastCaptionIdRef = useRef(0)
  if (shownId !== null) lastCaptionIdRef.current = shownId
  const captionText = captions[lastCaptionIdRef.current]
  const onCard = captionStyle === 'overlay' || captionStyle === 'chip'
  const below = captionStyle === 'pill' || captionStyle === 'line'

  // `cursor` style: position the label from pointermove directly, no re-render per move.
  const followRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (captionStyle !== 'cursor') return
    const onMove = (event: PointerEvent) => {
      const el = followRef.current
      if (el) el.style.transform = `translate3d(${event.clientX}px, ${event.clientY}px, 0)`
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    return () => window.removeEventListener('pointermove', onMove)
  }, [captionStyle])

  return (
    <div
      ref={rootRef}
      className={['ps-root', className].filter(Boolean).join(' ')}
      style={{ boxSizing: 'content-box', paddingTop: topOffset, height: containerHeight * scale, ['--ps-caption-gap' as string]: `${values.caption.gap}px` } as CSSProperties}
      data-testid="photo-stack"
      onPointerMove={(event) => {
        if (event.pointerType === 'mouse') pointerRef.current = { x: event.clientX, y: event.clientY }
      }}
      onPointerLeave={() => {
        pointerRef.current = null
      }}
    >
      <div
        className="ps-scale"
        style={{
          width: containerWidth * scale,
          height: containerHeight * scale,
        }}
      >
        <div style={{ width: containerWidth, height: containerHeight, transform: `scale(${scale})`, transformOrigin: '0 0' }}>
          {Array.from({ length: CARD_COUNT }, (_, cardId) => {
            const isTop = order[0] === cardId && !cyclingIds.has(cardId)
            const { x, y, rotate, scale, opacity } = mv[cardId]
            // One element type for every card: swapping tags on cycle would remount
            // the node mid-flight. Only the top card is interactive to assistive tech.
            return (
              <motion.button
                key={cardId}
                className={`ps-card${isTop ? ' ps-card--active' : ''}`}
                data-card={cardId}
                data-surface={values.caption.cursor.whiteCursor ? 'dark' : undefined}
                style={{
                  width,
                  height,
                  borderRadius: values.card.radius,
                  boxShadow: `0 ${Math.round(height * 0.11)}px ${Math.round(height * 0.22)}px rgba(23, 23, 23, ${values.card.shadow})`,
                  zIndex: zIndices[cardId],
                  x,
                  y,
                  rotate,
                  scale,
                  opacity,
                }}
                type="button"
                aria-label={isTop ? 'Next photo' : undefined}
                aria-hidden={isTop ? undefined : true}
                tabIndex={isTop ? 0 : -1}
                onClick={isTop ? cycle : () => bringToFront(cardId)}
                onMouseEnter={() => handleHoverStart(cardId)}
                onMouseLeave={() => handleHoverEnd(cardId)}
              >
                <img
                  className="ps-card__img"
                  src={IMAGES[cardId]}
                  alt={IMAGE_ALT[cardId]}
                  width={width}
                  height={height}
                  decoding="async"
                  loading="eager"
                  fetchPriority={cardId === startOrder[0] ? 'high' : undefined}
                  style={{
                    objectPosition: `${imagePos[cardId].posX}% ${imagePos[cardId].posY}%`,
                    filter: cardId === 4 ? gradeFilter : undefined,
                  }}
                />
                {onCard && (
                  <span aria-hidden="true" className={`ps-caption ps-caption--${captionStyle}${cardId === shownId ? ' is-shown' : ''}`}>
                    {captions[cardId]}
                  </span>
                )}
              </motion.button>
            )
          })}
        </div>
      </div>
      {below && (
        <span aria-hidden="true" className={`ps-caption ps-caption--below ps-caption--${captionStyle}${shownId !== null ? ' is-shown' : ''}`}>
          {captionText}
        </span>
      )}
      {captionStyle === 'cursor' &&
        createPortal(
          <div
            ref={followRef}
            className="ps-caption-follow"
            aria-hidden="true"
            style={
              {
                '--ps-cur-x': `${values.caption.cursor.offsetX}px`,
                '--ps-cur-y': `${values.caption.cursor.offsetY}px`,
                '--ps-cur-size': `${values.caption.cursor.textSize}px`,
                '--ps-cur-pad-x': `${values.caption.cursor.padX}px`,
                '--ps-cur-pad-y': `${values.caption.cursor.padY}px`,
                '--ps-cur-text-y': `${values.caption.cursor.textY}px`,
                '--ps-cur-radius': `${values.caption.cursor.radius}px`,
              } as CSSProperties
            }
          >
            <span className={`ps-caption ps-caption--cursor${values.caption.cursor.theme === 'light' ? ' ps-caption--light' : ''}${shownId !== null ? ' is-shown' : ''}`}>{captionText}</span>
          </div>,
          document.body,
        )}
    </div>
  )
}
