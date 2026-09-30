import type { ShaderMount } from '@paper-design/shaders'

/**
 * Disposes a ShaderMount and frees its WebGL context right away. `dispose()` alone leaves the
 * context alive until garbage collection; Chrome caps live contexts (~16) and, past the cap,
 * kills the oldest one — the header dither band, which lives for the whole visit.
 */
export function releaseShader(mount: ShaderMount) {
  const gl = (mount as unknown as { gl?: WebGL2RenderingContext | null }).gl
  mount.dispose()
  gl?.getExtension('WEBGL_lose_context')?.loseContext()
}
