/**
 * Fetches a turntable sprite sheet and decodes it at the requested size. In Chrome, createImageBitmap's
 * resize step runs on the calling thread (~70 ms for a 4608px sheet), so it runs here instead of on the
 * page. The bitmap is transferred back, not copied.
 */
export type SheetRequest = { id: number; src: string; size: number }
export type SheetReply = { id: number; bitmap: ImageBitmap } | { id: number; error: string }

addEventListener('message', (event: MessageEvent<SheetRequest>) => {
  const { id, src, size } = event.data
  void fetch(src)
    .then((response) => response.blob())
    .then((blob) => createImageBitmap(blob, { resizeWidth: size, resizeHeight: size, resizeQuality: 'high' }))
    .then((bitmap) => postMessage({ id, bitmap } satisfies SheetReply, { transfer: [bitmap] }))
    .catch((error: unknown) => postMessage({ id, error: String(error) } satisfies SheetReply))
})
