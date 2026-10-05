/**
 * Momo clips are plain H.264 MP4s with the colour (premultiplied) in the top half and the alpha
 * mask in the bottom half. This recombines them on a WebGL canvas, so transparency never depends on
 * codec alpha support. Shared by the site's Momo component and the studio diagrams.
 */
const VERT = `attribute vec2 p;varying vec2 uv;void main(){uv=vec2((p.x+1.)*.5,(1.-p.y)*.5);gl_Position=vec4(p,0.,1.);}`
const FRAG = `precision mediump float;varying vec2 uv;uniform sampler2D t;
void main(){vec3 c=texture2D(t,vec2(uv.x,uv.y*.5)).rgb;float a=texture2D(t,vec2(uv.x,.5+uv.y*.5)).r;
a=clamp((a-.03)/.94,0.,1.);gl_FragColor=vec4(min(c,vec3(a)),a);}`

/** Draws `video` (stacked colour/alpha) into `canvas` on every new frame. Returns a stop function. */
export function stackedAlpha(video: HTMLVideoElement, canvas: HTMLCanvasElement): () => void {
  // preserveDrawingBuffer: the card open copies the current frame (projectOpen liftMomo).
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true })
  if (!gl) return () => {}
  const shader = (type: number, src: string) => {
    const sh = gl.createShader(type)!
    gl.shaderSource(sh, src)
    gl.compileShader(sh)
    return sh
  }
  const prog = gl.createProgram()!
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT))
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(prog)
  gl.useProgram(prog)
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer())
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const loc = gl.getAttribLocation(prog, 'p')
  gl.enableVertexAttribArray(loc)
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)
  gl.bindTexture(gl.TEXTURE_2D, gl.createTexture())
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.clearColor(0, 0, 0, 0)

  const draw = () => {
    if (video.readyState < 2 || !video.videoWidth) return
    const w = video.videoWidth
    const h = video.videoHeight / 2
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
      gl.viewport(0, 0, w, h)
    }
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  let stopped = false
  let handle = 0
  const rvfc = 'requestVideoFrameCallback' in video
  const loop = () => {
    if (stopped) return
    draw()
    handle = rvfc ? video.requestVideoFrameCallback(loop) : requestAnimationFrame(loop)
  }
  // Paint the first frame even before playback (and for reduced motion).
  video.addEventListener('loadeddata', draw)
  video.addEventListener('seeked', draw)
  loop()
  return () => {
    stopped = true
    if (rvfc) video.cancelVideoFrameCallback(handle)
    else cancelAnimationFrame(handle)
    video.removeEventListener('loadeddata', draw)
    video.removeEventListener('seeked', draw)
    // Once the canvas has left the page, free its context now rather than at GC:
    // lingering contexts push the header dither band over Chrome's live-context cap.
    setTimeout(() => {
      if (!canvas.isConnected) gl.getExtension('WEBGL_lose_context')?.loseContext()
    })
  }
}
