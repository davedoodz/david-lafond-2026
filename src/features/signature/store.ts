/**
 * Tiny in-memory store for the currently active signature data.
 *
 * The hero subscribes to this so that saving in the dev-only studio updates the live signing
 * animation immediately, with no reload. It starts out seeded from the committed JSON.
 */
import initialData from '../../data/signature.json'
import type { SignatureData } from './types'

let current = initialData as SignatureData
const listeners = new Set<() => void>()

export function getSignatureData(): SignatureData {
  return current
}

export function setSignatureData(data: SignatureData) {
  current = data
  for (const listener of listeners) listener()
}

export function subscribeSignatureData(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}
