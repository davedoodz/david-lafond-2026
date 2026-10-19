/** Messages to an embedded Filo prototype (public/work/filo/*.html, driven by filo-app-flow/player.js). */
export type FlowCommand = 'play' | 'pause' | 'restart'

export const tellFlow = (frame: HTMLIFrameElement | null, command: FlowCommand) =>
  frame?.contentWindow?.postMessage({ filoAppFlow: command }, window.location.origin)

/** Playback rate of a prototype: player.js runs its clock and every animation at `rate` (1 = as authored). */
export const tellSpeed = (frame: HTMLIFrameElement | null, rate: number) =>
  frame?.contentWindow?.postMessage({ filoAppFlow: 'speed', rate }, window.location.origin)

/** How filo-phone-glimpse.html closes its App Clip at the end of each lap (one of CLOSE_PRESETS in caseStudyContent.ts). */
export const tellClose = (frame: HTMLIFrameElement | null, preset: string) =>
  frame?.contentWindow?.postMessage({ filoAppFlow: 'close', preset }, window.location.origin)
