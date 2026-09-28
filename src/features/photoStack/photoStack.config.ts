/** DialKit config for the 'Photo stack' panel. Module-level constant per useTuning contract. */
export const PHOTO_STACK_CONFIG = {
  card: {
    width: [219, 120, 320, 1] as [number, number, number, number],
    height: [362.8, 150, 500, 0.1] as [number, number, number, number],
    radius: [20, 0, 40, 1] as [number, number, number, number],
    shadow: [0.22, 0, 1, 0.01] as [number, number, number, number],
  },
  images: {
    _collapsed: true,
    image1: {
      posX: [25.49, 0, 100, 0.01] as [number, number, number, number],
      posY: [50, 0, 100, 0.01] as [number, number, number, number],
    },
    image2: {
      posX: [59.67, 0, 100, 0.01] as [number, number, number, number],
      posY: [0, 0, 100, 0.01] as [number, number, number, number],
    },
    image3: {
      posX: [50, 0, 100, 0.01] as [number, number, number, number],
      posY: [50, 0, 100, 0.01] as [number, number, number, number],
    },
    image4: {
      posX: [47.88, 0, 100, 0.01] as [number, number, number, number],
      posY: [0, 0, 100, 0.01] as [number, number, number, number],
    },
  },
  slots: {
    _collapsed: true,
    slot0: {
      x: [0, -50, 200, 0.01] as [number, number, number, number],
      y: [29.74, -50, 200, 0.01] as [number, number, number, number],
      rotate: [0, -30, 30, 0.01] as [number, number, number, number],
    },
    slot1: {
      x: [47.73, -50, 200, 0.01] as [number, number, number, number],
      y: [18.46, -50, 200, 0.01] as [number, number, number, number],
      rotate: [5, -30, 30, 0.01] as [number, number, number, number],
    },
    slot2: {
      x: [84.18, -50, 200, 0.01] as [number, number, number, number],
      y: [8.9, -50, 200, 0.01] as [number, number, number, number],
      rotate: [7.48, -30, 30, 0.01] as [number, number, number, number],
    },
    slot3: {
      x: [127.1, -50, 200, 0.01] as [number, number, number, number],
      y: [0, -50, 200, 0.01] as [number, number, number, number],
      rotate: [12.9, -30, 30, 0.01] as [number, number, number, number],
    },
  },
  entrance: {
    spring: { type: 'spring' as const, visualDuration: 0.7, bounce: 0.45 },
    stagger: [0.09, 0, 0.3, 0.01] as [number, number, number, number],
    startOffsetY: [220, 0, 500, 1] as [number, number, number, number],
    delay: [0.1, 0, 1, 0.01] as [number, number, number, number],
    replay: { type: 'action' as const, label: 'Replay entrance' },
  },
  /** Hovering the front card. Offsets pivot on the card's centre; `preset` picks the effect, `custom` uses the dials. */
  topHover: {
    preset: {
      type: 'select' as const,
      options: ['lift', 'pop', 'tilt-left', 'tilt-right', 'nudge-left', 'peel', 'none', 'custom'],
      default: 'lift',
    },
    x: [0, -80, 80, 1] as [number, number, number, number],
    y: [-12, -80, 80, 1] as [number, number, number, number],
    rotate: [0, -20, 20, 0.1] as [number, number, number, number],
    scale: [1.03, 0.9, 1.2, 0.005] as [number, number, number, number],
    spring: { type: 'spring' as const, visualDuration: 0.35, bounce: 0.25 },
  },
  /**
   * Hovering a card behind the front one: it slides out of the stack to be seen.
   * One group per position behind the front (second, third, back), since photos
   * rotate through positions as the stack cycles.
   */
  backHover: {
    second: {
      pullX: [60, -100, 320, 1] as [number, number, number, number],
      pullY: [-1, -200, 200, 1] as [number, number, number, number],
      rotate: [5.2, -45, 45, 0.1] as [number, number, number, number],
    },
    third: {
      pullX: [97, -100, 320, 1] as [number, number, number, number],
      pullY: [-1, -200, 200, 1] as [number, number, number, number],
      rotate: [2.7, -45, 45, 0.1] as [number, number, number, number],
    },
    back: {
      pullX: [134, -100, 320, 1] as [number, number, number, number],
      pullY: [-1, -200, 200, 1] as [number, number, number, number],
      rotate: [0.2, -45, 45, 0.1] as [number, number, number, number],
    },
    spring: { type: 'spring' as const, visualDuration: 0.4, bounce: 0.3 },
  },
  /** One-line description shown while a card is hovered. Text stays with its photo as the stack cycles. */
  caption: {
    style: { type: 'select' as const, options: ['overlay', 'chip', 'pill', 'line', 'cursor', 'none'], default: 'cursor' },
    /** Space between the stack and the caption, for the `pill` and `line` styles. */
    gap: [16, 0, 80, 1] as [number, number, number, number],
    /** `cursor` style: pill placement relative to the pointer, and its size. */
    cursor: {
      theme: { type: 'select' as const, options: ['dark', 'light'], default: 'dark' },
      /** Cursor dot turns white over the photo cards (they count as a dark surface). */
      whiteCursor: false,
      offsetX: [18, -200, 200, 1] as [number, number, number, number],
      offsetY: [16, -200, 200, 1] as [number, number, number, number],
      /** Nudges the text inside the pill (+ = down) without changing the pill's size. */
      textY: [0, -10, 10, 0.25] as [number, number, number, number],
      textSize: [12, 9, 28, 0.5] as [number, number, number, number],
      padX: [11, 0, 40, 0.5] as [number, number, number, number],
      padY: [6, 0, 30, 0.5] as [number, number, number, number],
      radius: [999, 0, 999, 1] as [number, number, number, number],
    },
    text: {
      image1: { type: 'text' as const, default: 'City nights, red shades', placeholder: 'Caption for photo 1' },
      image2: { type: 'text' as const, default: 'On the mic', placeholder: 'Caption for photo 2' },
      image3: { type: 'text' as const, default: 'Up in the mountains', placeholder: 'Caption for photo 3' },
      image4: { type: 'text' as const, default: 'In the workshop', placeholder: 'Caption for photo 4' },
    },
  },
  cycle: {
    /** Which side the front card leaves by when clicked; it leans the same way. */
    direction: { type: 'select' as const, options: ['left', 'right'], default: 'left' },
    pullOutX: [150, 0, 400, 1] as [number, number, number, number],
    liftY: [-10, -100, 100, 1] as [number, number, number, number],
    tilt: [18, 0, 60, 0.5] as [number, number, number, number],
    springOut: { type: 'spring' as const, visualDuration: 0.3, bounce: 0.15 },
    springTuck: { type: 'spring' as const, visualDuration: 0.5, bounce: 0.35 },
    swapAt: [0.55, 0, 1, 0.01] as [number, number, number, number],
  },
  layout: {
    desktopScale: [1, 0.4, 1.6, 0.01] as [number, number, number, number],
    mobileScale: [0.62, 0.3, 1, 0.01] as [number, number, number, number],
    desktopTopOffset: [88, 0, 400, 1] as [number, number, number, number],
    mobileTopOffset: [72, 0, 300, 1] as [number, number, number, number],
  },
}
