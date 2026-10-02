export type Variant = { name: string; idea: string; dur: number }
export type Chapter = { id: 'listen' | 'connect' | 'restructure' | 'plan' | 'handoff'; title: string; variants: Variant[] }
export type Part = { sec: Variant; start: number; chapter: Chapter }
export const CHAPTERS: Chapter[]
export const OVER: number
export const SIZE: { W: number; H: number }
export const BANDS: Record<string, { width: number }>
export const G: { wave: string; band: string; speed: number; controls: boolean }
export const HERO_PHONE: { cx: number; cy: number; pw: number }
export const hooks: { page: boolean; reveal: number; landed: boolean }
export function setRT(seconds: number): void
export function sequence(pick: Partial<Record<Chapter['id'], number>>, ids?: Chapter['id'][]): { parts: Part[]; total: number }
/** The idle voice band alone, centred on the scene's glow point (480, 245). */
export function drawBraid(ctx: CanvasRenderingContext2D, m: [number, number, number], opts?: { env?: number; alpha?: number }): void
/** m = [scale, offsetX, offsetY] in device pixels. */
export function renderParts(ctx: CanvasRenderingContext2D, parts: Part[], t: number, m: [number, number, number], opts?: { bg?: boolean; alpha?: number; glowAlpha?: number; minGlow?: number }): void
