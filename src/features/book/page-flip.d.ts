/** Types for the parts of `page-flip` 2.0.7 used here; the package ships none. */
declare module 'page-flip' {
  export type FlipCorner = 'top' | 'bottom'
  export type Orientation = 'portrait' | 'landscape'
  export type FlipState = 'user_fold' | 'fold_corner' | 'flipping' | 'read'

  export interface PageFlipSettings {
    startPage?: number
    size?: 'fixed' | 'stretch'
    width: number
    height: number
    minWidth?: number
    maxWidth?: number
    minHeight?: number
    maxHeight?: number
    drawShadow?: boolean
    flippingTime?: number
    usePortrait?: boolean
    startZIndex?: number
    autoSize?: boolean
    maxShadowOpacity?: number
    showCover?: boolean
    mobileScrollSupport?: boolean
    swipeDistance?: number
    clickEventForward?: boolean
    useMouseEvents?: boolean
    showPageCorners?: boolean
    disableFlipByClick?: boolean
  }

  type EventMap = {
    flip: number
    changeOrientation: Orientation
    changeState: FlipState
    init: { page: number; mode: Orientation }
    update: { page: number; mode: Orientation }
  }

  export class PageFlip {
    constructor(element: HTMLElement, settings: PageFlipSettings)
    loadFromHTML(items: HTMLElement[] | NodeListOf<HTMLElement>): void
    on<K extends keyof EventMap>(event: K, callback: (event: { data: EventMap[K]; object: PageFlip }) => void): PageFlip
    off(event: keyof EventMap): void
    flip(page: number, corner?: FlipCorner): void
    flipNext(corner?: FlipCorner): void
    flipPrev(corner?: FlipCorner): void
    turnToPage(page: number): void
    turnToNextPage(): void
    turnToPrevPage(): void
    getFlipController(): unknown
    getRender(): unknown
    getPage(index: number): unknown
    getCurrentPageIndex(): number
    getPageCount(): number
    getOrientation(): Orientation
    getState(): FlipState
    getSettings(): PageFlipSettings
    update(): void
    destroy(): void
  }
}
