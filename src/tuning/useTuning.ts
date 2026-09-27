/**
 * Tuning = DialKit in development, frozen JSON in production.
 *
 * - Every panel's code config is the baseline. Anything David changes in the
 *   DialKit panel is diffed against that baseline and auto-saved (debounced)
 *   into `src/data/tuning.json` through the dev save endpoint, so tweaks land
 *   in git and ship.
 * - Production never loads DialKit: values resolve statically from
 *   `config + tuning.json`, and the DialKit import is tree-shaken away.
 */
import { useEffect, useMemo, useRef } from 'react'
import { useDialKitController, type DialConfig, type DialValue, type ResolvedValues } from 'dialkit'
import saved from '../data/tuning.json'
import { devSave } from './devSave'

type Json = unknown
type Overrides = Record<string, Json>
type AnyConfig = Record<string, unknown>

const SAVED = saved as Record<string, Overrides>

export type TuningOptions = {
  /** Called with the full dot path of an action control, e.g. `signature.open`. */
  onAction?: (action: string) => void
}

export type TuningController<T extends DialConfig> = {
  values: ResolvedValues<T>
  /** Write a value from app code (dev only; a no-op in production). */
  setValue: (path: string, value: DialValue) => void
}

const isObj = (v: unknown): v is AnyConfig => typeof v === 'object' && v !== null && !Array.isArray(v)
const isTuple = (v: unknown): v is number[] => Array.isArray(v) && typeof v[0] === 'number'

/** Resolve a DialKit config to the values DialKit would return for its defaults. */
export function resolveStatic<T extends DialConfig>(config: T): ResolvedValues<T> {
  return resolveNode(config) as ResolvedValues<T>
}

function resolveNode(node: unknown): unknown {
  if (isTuple(node)) return node[0]
  if (!isObj(node)) return node
  switch (node.type) {
    case 'color':
    case 'text':
      return node.default ?? ''
    case 'select': {
      const first = (node.options as Array<string | { value: string }>)[0]
      return node.default ?? (typeof first === 'string' ? first : first?.value)
    }
    case 'image': {
      const first = (node.options as Array<string | { value: string }> | undefined)?.[0]
      return node.default ?? (typeof first === 'string' ? first : (first?.value ?? ''))
    }
    case 'pad':
      return { x: (node.x as number[] | undefined)?.[0] ?? 0, y: (node.y as number[] | undefined)?.[0] ?? 0 }
    case 'spring':
    case 'easing':
      return node
    case 'action':
      return node
  }
  const out: AnyConfig = {}
  for (const [key, child] of Object.entries(node)) {
    if (key === '_collapsed') continue
    out[key] = resolveNode(child)
  }
  return out
}

/** Bake saved values into a config's defaults, keeping ranges and structure. */
function applyOverrides(node: unknown, value: unknown): unknown {
  if (value === undefined) return node
  if (isTuple(node)) return typeof value === 'number' ? [value, ...node.slice(1)] : node
  if (!isObj(node)) return typeof value === typeof node ? value : node
  switch (node.type) {
    case 'color':
    case 'text':
    case 'select':
    case 'image':
      return typeof value === 'string' ? { ...node, default: value } : node
    case 'pad': {
      if (!isObj(value)) return node
      const x = (node.x as number[] | undefined) ?? [0, -1, 1, 0.01]
      const y = (node.y as number[] | undefined) ?? [0, -1, 1, 0.01]
      return { ...node, x: [value.x, ...x.slice(1)], y: [value.y, ...y.slice(1)] }
    }
    case 'spring':
    case 'easing':
      return isObj(value) && (value.type === 'spring' || value.type === 'easing') ? value : node
    case 'action':
      return node
  }
  if (!isObj(value)) return node
  const out: AnyConfig = {}
  for (const [key, child] of Object.entries(node)) out[key] = applyOverrides(child, value[key])
  return out
}

/** Leaves of `values` that differ from `base`, as a nested partial object. */
function diff(values: unknown, base: unknown): unknown {
  if (isObj(values) && isObj(base) && !('type' in base && (base.type === 'spring' || base.type === 'easing' || base.type === 'action'))) {
    let out: AnyConfig | undefined
    for (const key of Object.keys(values)) {
      const d = diff(values[key], base[key])
      if (d !== undefined) (out ??= {})[key] = d
    }
    return out
  }
  if (isObj(base) && base.type === 'action') return undefined
  return JSON.stringify(values) === JSON.stringify(base) ? undefined : values
}

function useTuningControllerDev<T extends DialConfig>(name: string, config: T, options?: TuningOptions): TuningController<T> {
  const merged = useMemo(() => applyOverrides(config, SAVED[name]) as T, [name, config])
  const baseline = useMemo(() => resolveStatic(config), [config])
  const onActionRef = useRef(options?.onAction)
  onActionRef.current = options?.onAction
  const dial = useDialKitController(name, merged, {
    id: `tune:${name}`,
    defaultCollapsed: true,
    onAction: (action) => onActionRef.current?.(action),
  })

  const overrides = diff(dial.values, baseline) as Overrides | undefined
  const serialized = JSON.stringify(overrides ?? {})
  const lastSaved = useRef(JSON.stringify(SAVED[name] ?? {}))
  useEffect(() => {
    if (serialized === lastSaved.current) return
    const timer = window.setTimeout(() => {
      lastSaved.current = serialized
      void devSave({ file: 'tuning', key: name, data: JSON.parse(serialized) })
    }, 500)
    return () => window.clearTimeout(timer)
  }, [name, serialized])

  return { values: dial.values, setValue: dial.setValue }
}

const staticCache = new Map<string, unknown>()
const noop = () => {}

function useTuningControllerStatic<T extends DialConfig>(name: string, config: T): TuningController<T> {
  let values = staticCache.get(name) as ResolvedValues<T> | undefined
  if (!values) {
    values = resolveStatic(applyOverrides(config, SAVED[name]) as T)
    staticCache.set(name, values)
  }
  return { values, setValue: noop }
}

/**
 * Live-tunable values. `config` must be a module-level constant (stable identity).
 * Returns DialKit values in dev and frozen saved values in production.
 */
export const useTuningController: <T extends DialConfig>(name: string, config: T, options?: TuningOptions) => TuningController<T> =
  import.meta.env.DEV ? useTuningControllerDev : useTuningControllerStatic

export function useTuning<T extends DialConfig>(name: string, config: T, options?: TuningOptions): ResolvedValues<T> {
  return useTuningController(name, config, options).values
}
