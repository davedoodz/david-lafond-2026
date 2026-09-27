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
  hover: {
    pullX: [18, 0, 60, 1] as [number, number, number, number],
    pullY: [-6, -40, 40, 1] as [number, number, number, number],
    extraRotate: [-4, -20, 20, 0.1] as [number, number, number, number],
    spring: { type: 'spring' as const, visualDuration: 0.4, bounce: 0.3 },
  },
  cycle: {
    pullOutX: [150, 0, 400, 1] as [number, number, number, number],
    liftY: [-10, -100, 100, 1] as [number, number, number, number],
    tiltLeft: [-18, -60, 0, 0.5] as [number, number, number, number],
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
