export const PHONE_TIMELINE: { calm: number; hero: number; dur: number; talk: number; det: number; buzz: number; pick: number }
export function loadPhoneFilm(): Promise<void>
export function drawPhoneFilm(ctx: CanvasRenderingContext2D, t: number, m: [number, number, number], braidTarget?: { x: number; y: number; width: number }): void
