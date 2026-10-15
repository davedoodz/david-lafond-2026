/**
 * DialKit panel for the Momo thumbnail study (studio/momo-thumbnail.html). Every control lives in
 * MOMO_THUMB_CONFIG (src/features/momoThumb/config.ts); values save to "MomoThumbnail" in
 * src/data/tuning.json (useTuning), which the Selected Works card plays too.
 */
import { StrictMode, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import 'dialkit/styles.css'
import { DialRoot } from 'dialkit'
import { useTuning } from '../tuning/useTuning'
import { MOMO_THUMB_CONFIG, type MomoThumbValues } from '../features/momoThumb/config'

export type MomoThumbAction = 'replay' | 'pause'

function Dials({ onChange, onAction }: { onChange: (v: MomoThumbValues) => void; onAction: (a: MomoThumbAction) => void }) {
  const values = useTuning('MomoThumbnail', MOMO_THUMB_CONFIG, { onAction: (a) => onAction(a as MomoThumbAction) })
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  useEffect(() => onChangeRef.current(values), [values])
  return null
}

/** `onChange` gets every value change (and the saved values on load). */
export function mountDials(container: HTMLElement, onChange: (v: MomoThumbValues) => void, onAction: (a: MomoThumbAction) => void) {
  createRoot(container).render(
    <StrictMode>
      <Dials onChange={onChange} onAction={onAction} />
      <DialRoot position="top-right" theme="dark" defaultOpen />
    </StrictMode>,
  )
}
