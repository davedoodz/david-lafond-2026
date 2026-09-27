/** POST to the dev-only save endpoint (see dev/devSavePlugin.ts). No-op in production builds. */
export async function devSave(body: { file: 'tuning' | 'signature'; key?: string; data: unknown }): Promise<boolean> {
  if (!import.meta.env.DEV) return false
  try {
    const res = await fetch('/__dev/save', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    })
    return res.ok
  } catch {
    return false
  }
}
