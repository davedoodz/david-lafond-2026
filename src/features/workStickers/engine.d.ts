/** Minimal ambient types for engine.js's public surface — just enough for WorkIntroStickers.tsx.
 * The studio (plain JS, untyped) is the engine's other consumer and isn't affected by this file. */

export interface StickerTiming {
  hold: number
  duration: number
  letterSpeed: number
}

export interface StickerValues {
  face: string
  timing: StickerTiming
  [face: string]: unknown
}

export interface StickerRecord {
  id: string
  button: HTMLButtonElement
  icon: HTMLElement
  label: HTMLElement
  values: StickerValues
  faceCount: number | (() => number)
  current: string
  imageKey: string
  animations: Array<{ stop(): void }>
  revision: number
  hoverAnimation?: { stop(): void } | null
  restTilt?: number
  defaultLabel?: (index: number) => string
  ariaLabel?: (text: string) => string
  titleFor?: (text: string) => string
  onRender?: () => void
}

export interface Look {
  appearance: { stickerScale: number; [key: string]: unknown }
  motion: {
    landing: string
    letters: string
    letterStagger: number
    letterSpeed: number
    lift: number
    hoverScale: number
    spring: Record<string, unknown>
    loop: boolean
    [key: string]: unknown
  }
  hop: Record<string, number>
}

export declare const art: Record<string, string>
export declare const iconOptions: string[]
export declare const LANDINGS: Record<string, { enter: (t: number, s: number) => Record<string, unknown>; exit: (t: number, s: number) => Record<string, unknown> }>
export declare const landingOptions: string[]
export declare const letterOptions: string[]

export declare function mixHex(hex: string, other: string, amount: number): string
export declare function toHex(color: string): string | null
export declare function activePreset<T>(value: T | 'Global', fallback: T): T

export declare function createArtSvg(name: string): SVGElement
export declare function paintArt(svg: SVGElement | null | undefined, values: { gradientAngle: number; color: string; fill: string; gradientEnd: string; outline: number }): void
export declare function createFaceArt(face: { image?: string; artwork?: string }): HTMLElement

export declare const NEUTRAL_TINT: string
export declare function imageTint(src: string): Promise<string | null>

export declare function faceOf(record: StickerRecord): number
export declare function currentFace(record: StickerRecord): Record<string, unknown>
export declare function paint(record: StickerRecord): void

export declare function turn(
  record: StickerRecord,
  setFace: (record: StickerRecord, label: string) => void,
  onBlocked?: (record: StickerRecord) => void,
): void

export declare function createLoopScheduler(options: {
  list: () => StickerRecord[]
  turn: (record: StickerRecord) => void
  skip?: (record: StickerRecord) => boolean
  getTiming: (record: StickerRecord) => StickerTiming
  loopEnabled: () => boolean
  reducedMotion: MediaQueryList
  isHidden: () => boolean
}): { schedule: (delay?: number) => void; stop: () => void }

export declare function createStickerEngine(options: {
  getLook: () => Look
  reducedMotion: MediaQueryList
}): {
  transition: (delay?: number) => Record<string, unknown>
  run: (record: StickerRecord, element: Element, values: Record<string, unknown>, options?: Record<string, unknown>) => { stop(): void; then: Promise<void>['then'] }
  seconds: () => number
  LETTERS: Record<string, (args: unknown) => void>
  MORPH_FAMILY: Record<string, unknown>
  hover: (record: StickerRecord, active: boolean) => void
  render: (record: StickerRecord) => void
}
