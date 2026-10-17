import { forwardRef, type CSSProperties } from 'react'
import { VoiceBeam } from 'voice-glow'

/*
 * The voice glow from the Freeform prototype (reself-voice-prototypes recorder.jsx): the same
 * `voice-glow` VoiceBeam with the prototype's Voice beam defaults, on a 390px-wide screen. MomoIntro
 * lays it over the film's phone screen each frame and feeds it the film's voice level.
 */

/** The beam's blue, deeper than the UI accent so the brightened glow still reads blue (brand.js BEAM_BLUE). */
const BEAM_BLUE = [0x1d, 0x80, 0xe7]
const BRIGHTNESS = 3
const rgb = (c: number[]) => `rgb(${c.map(v => Math.round(Math.max(0, Math.min(255, v)))).join(', ')})`
const mix = (a: number[], b: number[], t: number) => a.map((v, i) => v + (b[i] - v) * t)
// brand.js beamColors: shades of one blue, divided by the brightness filter the beam applies.
const base = BEAM_BLUE.map(v => v / BRIGHTNESS), deep = mix(base, [0, 0, 0], 0.25), soft = mix(base, [255 / BRIGHTNESS, 255 / BRIGHTNESS, 255 / BRIGHTNESS], 0.25)

/** Screen size of the film's phone (iPhone cut-out 784×1702 at 390px wide). */
export const BEAM_SCREEN = { w: 390, h: (1702 / 784) * 390 }

type Props = { active: boolean; level: () => number }

export const MomoVoiceBeam = forwardRef<HTMLDivElement, Props>(function MomoVoiceBeam({ active, level }, ref) {
  return <div ref={ref} className="momo-intro__beam" aria-hidden="true">
    <VoiceBeam
      level={level}
      active={active}
      type="mobile"
      sensitivity={4}
      threshold={0.3}
      attack={0.105}
      release={0.42}
      breatheDuration={8}
      colorVariant="ice"
      colors={[base, deep, soft, base, deep, soft, base].map(rgb)}
      bandColors={{ core: rgb(base), above: rgb(soft), mid: rgb(deep), below: rgb(base) }}
      theme="light"
      borderRadius={38}
      scale={3}
      glowSize={3}
      idle={1}
      reach={0.85}
      spread={0.8}
      flow={48}
      bend={3}
      bandStrength={2.65}
      bandWidth={0.3}
      bandPosition={0.1}
      bandCurve={4}
      bandOffset={-40}
      bandTail={1}
      bandTailPosition={0}
      bandTailCurve={1}
      bandTailOverflow={13}
      bandAberration={1}
      distortion={1}
      distortionDetail={3}
      rangeWidth={0.59}
      softness={3}
      coreSize={3}
      coreLight={3}
      strokeScale={1.65}
      brightness={BRIGHTNESS}
      saturation={4}
      hueRange={0}
      hueDuration={2}
      style={{
        width: BEAM_SCREEN.w,
        height: BEAM_SCREEN.h,
        '--voice-hue-base': '0deg',
        '--voice-stroke-opacity': '2',
        '--voice-inner-opacity': '2',
        '--voice-bloom-opacity': '2',
      } as CSSProperties}
    >
      {/* The screen content is the film canvas underneath; the beam only needs the screen's box. */}
      <div style={{ width: '100%', height: '100%' }} />
    </VoiceBeam>
  </div>
})
