import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, type Transition } from 'motion/react'
import { useTuning } from '../../tuning/useTuning'
import { PHOTO_STACK_CONFIG } from './photoStack.config'
import { toMotionTransition, estimateSeconds } from './toMotionTransition'
import './photoStack.css'

type Pose = { x: number; y: number; rotate: number }

const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms))

const IMAGES = ['/about/image1.webp', '/about/image2.webp', '/about/image3.webp', '/about/image4.webp']
const IMAGE_ALT = ['David outdoors in the city, wearing red sunglasses', 'David speaking into a microphone, black and white', 'David skiing in the mountains', 'David smiling in front of a workshop tool wall']
const CARD_COUNT = 4

function useCardMotionValues(initial: Pose) {
  const x = useMotionValue(initial.x)
  const y = useMotionValue(initial.y)
  const rotate = useMotionValue(initial.rotate)
  // Cards start hidden so their below-slot start pose never sits over the heading.
  const opacity = useMotionValue(0)
  return useMemo(() => ({ x, y, rotate, opacity }), [x, y, rotate, opacity])
}

export function PhotoStack({ className }: { className?: string }) {
  const reducedMotion = useReducedMotion()
  const playEntranceRef = useRef<() => void>(() => {})
  const values = useTuning('Photo stack', PHOTO_STACK_CONFIG, {
    onAction: (action) => {
      if (action === 'entrance.replay') playEntranceRef.current()
    },
  })

  const slotPoses = useMemo<Pose[]>(
    () => [values.slots.slot0, values.slots.slot1, values.slots.slot2, values.slots.slot3],
    [values.slots],
  )
  const imagePos = useMemo(
    () => [values.images.image1, values.images.image2, values.images.image3, values.images.image4],
    [values.images],
  )

  // `order[slot] = cardId`. Card 0 starts front, card 3 starts back, matching the design.
  const [order, setOrder] = useState<number[]>([0, 1, 2, 3])
  const orderRef = useRef(order)
  orderRef.current = order

  const [zIndices, setZIndices] = useState<number[]>(() => order.map((_, slot) => 40 - slot * 10))
  const zIndicesRef = useRef(zIndices)
  zIndicesRef.current = zIndices

  const [cyclingIds, setCyclingIds] = useState<Set<number>>(() => new Set())
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [finePointer, setFinePointer] = useState(false)
  const [entered, setEntered] = useState(false)

  const initialPoseFor = (cardId: number): Pose => {
    const base = slotPoses[cardId]
    return { x: base.x, y: base.y + values.entrance.startOffsetY, rotate: base.rotate }
  }

  const mv = [
    useCardMotionValues(initialPoseFor(0)),
    useCardMotionValues(initialPoseFor(1)),
    useCardMotionValues(initialPoseFor(2)),
    useCardMotionValues(initialPoseFor(3)),
  ]
  const mvRef = useRef(mv)
  mvRef.current = mv

  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    const update = () => setFinePointer(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  const settle = useCallback(
    (cardId: number, extra?: { x: number; y: number; rotate: number }, transitionOverride?: Transition) => {
      const slot = orderRef.current.indexOf(cardId)
      const base = slotPoses[slot]
      const target = extra ? { x: base.x + extra.x, y: base.y + extra.y, rotate: base.rotate + extra.rotate } : base
      const transition = transitionOverride ?? toMotionTransition(values.hover.spring)
      const { x, y, rotate } = mvRef.current[cardId]
      animate(x, target.x, transition)
      animate(y, target.y, transition)
      animate(rotate, target.rotate, transition)
    },
    [slotPoses, values.hover.spring],
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
      animate(opacity, 1, { duration: 0.25, ease: 'easeOut', delay })
    }
    const totalMs = reducedMotion
      ? 0
      : 1000 * (values.entrance.delay + CARD_COUNT * values.entrance.stagger + estimateSeconds(values.entrance.spring))
    window.setTimeout(() => setEntered(true), totalMs)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, slotPoses, values.entrance])

  playEntranceRef.current = playEntrance

  useEffect(() => {
    playEntrance()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep resting cards aligned with their current slot when dial values change or the pointer leaves.
  useEffect(() => {
    if (!entered) return
    for (let cardId = 0; cardId < CARD_COUNT; cardId++) {
      if (cyclingIds.has(cardId) || cardId === hoveredId) continue
      settle(cardId, undefined, toMotionTransition(values.cycle.springTuck))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, entered])

  const queueRef = useRef<Promise<void>>(Promise.resolve())

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

    const { x, y, rotate } = mvRef.current[frontId]
    const frontPose = slotPoses[0]
    const backSlot = CARD_COUNT - 1
    const backPose = slotPoses[backSlot]

    if (reducedMotion) {
      x.set(backPose.x)
      y.set(backPose.y)
      rotate.set(backPose.rotate)
    } else {
      const outSpring = toMotionTransition(values.cycle.springOut)
      const tuckSpring = toMotionTransition(values.cycle.springTuck)
      const outMs = 1000 * estimateSeconds(values.cycle.springOut)
      const tuckMs = 1000 * estimateSeconds(values.cycle.springTuck)
      const totalMs = outMs + tuckMs
      const peak = {
        x: frontPose.x + values.cycle.pullOutX,
        y: frontPose.y + values.cycle.liftY,
        rotate: frontPose.rotate + values.cycle.tiltLeft,
      }
      // Sequence on the springs' visual durations, never on their promises: an
      // interrupted Motion animation never resolves, which would stall the queue.
      // Retargeting mid-flight keeps velocity, so the out→tuck handoff stays fluid.
      animate(x, peak.x, outSpring)
      animate(y, peak.y, outSpring)
      animate(rotate, peak.rotate, outSpring)
      await sleep(outMs)
      animate(x, backPose.x, tuckSpring)
      animate(y, backPose.y, tuckSpring)
      animate(rotate, backPose.rotate, tuckSpring)
      await sleep(Math.max(0, totalMs * values.cycle.swapAt - outMs))
      setZIndices((prev) => {
        const next = prev.slice()
        next[frontId] = zFor(backSlot)
        return next
      })
      await sleep(Math.max(0, totalMs - Math.max(outMs, totalMs * values.cycle.swapAt)))
    }
    if (reducedMotion) {
      setZIndices((prev) => {
        const next = prev.slice()
        next[frontId] = zFor(backSlot)
        return next
      })
    }

    setCyclingIds((prev) => {
      const next = new Set(prev)
      next.delete(frontId)
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion, slotPoses, values.cycle])

  const cycle = useCallback(() => {
    queueRef.current = queueRef.current.then(() => runCycle())
  }, [runCycle])

  const handleHoverStart = (cardId: number) => {
    if (!finePointer || reducedMotion || cyclingIds.has(cardId)) return
    setHoveredId(cardId)
    settle(
      cardId,
      { x: values.hover.pullX, y: values.hover.pullY, rotate: values.hover.extraRotate },
      toMotionTransition(values.hover.spring),
    )
  }

  const handleHoverEnd = (cardId: number) => {
    if (hoveredId !== cardId) return
    setHoveredId(null)
    // A cycling card owns its motion values until the choreography ends.
    if (cyclingIds.has(cardId)) return
    settle(cardId, undefined, toMotionTransition(values.hover.spring))
  }

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

  return (
    <div
      className={['ps-root', className].filter(Boolean).join(' ')}
      style={{ boxSizing: 'content-box', paddingTop: topOffset, height: containerHeight * scale }}
      data-testid="photo-stack"
    >
      <div
        className="ps-scale"
        style={{
          width: containerWidth * scale,
          height: containerHeight * scale,
        }}
      >
        <div style={{ width: containerWidth, height: containerHeight, transform: `scale(${scale})`, transformOrigin: 'top center' }}>
          {Array.from({ length: CARD_COUNT }, (_, cardId) => {
            const isTop = order[0] === cardId && !cyclingIds.has(cardId)
            const { x, y, rotate, opacity } = mv[cardId]
            // One element type for every card: swapping tags on cycle would remount
            // the node mid-flight. Only the top card is interactive to assistive tech.
            return (
              <motion.button
                key={cardId}
                className={`ps-card${isTop ? ' ps-card--active' : ''}`}
                style={{
                  width,
                  height,
                  borderRadius: values.card.radius,
                  boxShadow: `0 ${Math.round(height * 0.11)}px ${Math.round(height * 0.22)}px rgba(23, 23, 23, ${values.card.shadow})`,
                  zIndex: zIndices[cardId],
                  x,
                  y,
                  rotate,
                  opacity,
                }}
                type="button"
                aria-label={isTop ? 'Next photo' : undefined}
                aria-hidden={isTop ? undefined : true}
                tabIndex={isTop ? 0 : -1}
                onClick={isTop ? cycle : undefined}
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
                  fetchPriority={cardId === 0 ? 'high' : undefined}
                  style={{ objectPosition: `${imagePos[cardId].posX}% ${imagePos[cardId].posY}%` }}
                />
              </motion.button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
