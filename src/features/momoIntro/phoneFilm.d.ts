export const PHONE_TIMELINE: { meet: number; luck: number; skip: number; k: [number, number, number]; det: number; risen: number; buzz: number; press: number; voice: number; talk: number; calm: number; hero: number; dur: number }
export function loadPhoneFilm(): Promise<void>
/** VoiceBeam host: the phone screen's rect in film px (960×540), whether the voice is live, and its level 0–1. */
export type PhoneBeam = { x: number; y: number; w: number; h: number; active: boolean; level: number }
export function drawPhoneFilm(ctx: CanvasRenderingContext2D, t: number, m: [number, number, number], braidTarget: { x: number; y: number; width: number }, phonePosition: { lockScreenY: number; signalCheckY: number; voiceReflectionY: number }, momoFrames: { awake?: CanvasImageSource; asleep?: CanvasImageSource }, topCtx?: CanvasRenderingContext2D, topM?: [number, number, number]): PhoneBeam
