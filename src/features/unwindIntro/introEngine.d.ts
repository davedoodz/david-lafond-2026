export type Variant = { name: string; idea: string; dur: number }
export type Chapter = { id: 'listen' | 'connect' | 'restructure' | 'plan' | 'handoff'; title: string; variants: Variant[] }
export type Part = { sec: Variant; start: number; chapter: Chapter }
export const CHAPTERS: Chapter[]
export const OVER: number
export const SIZE: { W: number; H: number }
export const BANDS: Record<string, unknown>
export const G: { wave: string; band: string; speed: number; controls: boolean }
export const HERO_PHONE: { cx: number; cy: number; pw: number }
export const hooks: { page: boolean; reveal: number }
export function setRT(seconds: number): void
export function sequence(pick: Partial<Record<Chapter['id'], number>>): { parts: Part[]; total: number }
/** m = [scale, offsetX, offsetY] in device pixels. */
export function renderParts(ctx: CanvasRenderingContext2D, parts: Part[], t: number, m: [number, number, number], opts?: { bg?: boolean }): void
