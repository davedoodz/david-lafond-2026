export const PHONE_TIMELINE: { meet: number; luck: number; skip: number; k: [number, number, number]; det: number; risen: number; buzz: number; press: number; ask: number; pick: number; talk: number; calm: number; hero: number; dur: number }
export function loadPhoneFilm(): Promise<void>
export function drawPhoneFilm(ctx: CanvasRenderingContext2D, t: number, m: [number, number, number], braidTarget: { x: number; y: number; width: number }, phonePosition: { lockScreenY: number; signalCheckY: number; reflectionChoiceY: number; voiceReflectionY: number }): void
