/** Film seconds. Playback starts at `start` (the evening lock screen, the phone sliding up). */
export const PHONE_TIMELINE: { start: number; det: number; risen: number; buzz: number; press: number; voice: number; talk: number; calm: number; hero: number; dur: number }
export function loadPhoneFilm(): Promise<void>
/** App-launch dials in film seconds (see phoneFilm.js LAUNCH). */
export type AppLaunch = { duration: number; spring: number; face: number; press: number; zoom: number; blur: number; dim: number }
export function setAppLaunch(dials: AppLaunch): void
/** Size and centre Momo settles to once asleep, in the phone screen's 390-wide units. */
export function setMomoAsleep(dials: { size: number; y: number }): void
/** Freeform pill: label letter-spacing and x/y nudge, and the pill's corner radius, in screen px. */
export function setPillText(dials: { letterSpacing: number; x: number; y: number; radius: number }): void
/** Pause icon: corner radius of the two bars, in screen px. */
export function setPauseIcon(dials: { radius: number }): void
/** Status icon gaps in pt: signal → Wi-Fi and Wi-Fi → battery fill. */
export function setStatusGaps(dials: { wifi: number; battery: number }): void
/** VoiceBeam host: the phone screen's rect in film px (960×540), whether the voice is live, and its level 0–1.
 *  `rt` is the braid's phase clock this frame, for the page band to carry on from. */
export type PhoneBeam = { x: number; y: number; w: number; h: number; active: boolean; level: number; rt: number }
/** `braidTarget`: the page band's slot in film px, and its idle energy (`env`) for the film band to settle to.
 *  `phonePosition.fit`: on phones, the box (film px) the whole phone is fitted into, centred, for the
 *  whole film; it replaces the camera's lean-ins and the vertical offsets. */
export function drawPhoneFilm(ctx: CanvasRenderingContext2D, t: number, m: [number, number, number], braidTarget: { x: number; y: number; width: number; env?: number }, phonePosition: { lockScreenY: number; signalCheckY: number; voiceReflectionY: number; fit?: { w: number; h: number } }, momoFrames: { awake?: CanvasImageSource; asleep?: CanvasImageSource }, topCtx?: CanvasRenderingContext2D, topM?: [number, number, number]): PhoneBeam
