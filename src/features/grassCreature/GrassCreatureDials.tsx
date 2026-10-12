/** Mounts the creature's DialKit panel on the studio page (studio/grass-pokemon.html). */
import { StrictMode, useEffect, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import 'dialkit/styles.css'
import { DialRoot } from 'dialkit'
import { useTuning } from '../../tuning/useTuning'
import { CREATURE_CONFIG, type CreatureAction, type CreatureValues } from './config'

function Dials({ onChange, onAction }: { onChange: (values: CreatureValues) => void; onAction: (action: CreatureAction) => void }) {
  const values = useTuning('GrassCreature', CREATURE_CONFIG, { onAction: (action) => onAction(action as CreatureAction) })
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange
  useEffect(() => onChangeRef.current(values), [values])
  return null
}

/** `onChange` gets every value change (and the saved values on load). */
export function mountDials(container: HTMLElement, onChange: (values: CreatureValues) => void, onAction: (action: CreatureAction) => void) {
  createRoot(container).render(
    <StrictMode>
      <Dials onChange={onChange} onAction={onAction} />
      <DialRoot position="top-right" theme="dark" defaultOpen />
    </StrictMode>,
  )
}
