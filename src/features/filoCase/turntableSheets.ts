import type { SheetReply, SheetRequest } from './turntableSheet.worker'

/** Turntable sprite sheets: 36 transparent views of one product in a 6 × 6 grid, row by row. */
export const SHEET_GRID = 6
export const SHEET_VIEWS = SHEET_GRID * SHEET_GRID

/** One shared worker decodes every sheet (see turntableSheet.worker.ts), started on first use. */
let sheetWorker: Worker | undefined
let sheetRequests = 0
const sheetReplies = new Map<number, (reply: SheetReply) => void>()

/** Decodes `src` off the page thread at `size` px square (the whole sheet). */
export function decodeSheet(src: string, size: number) {
  if (!sheetWorker) {
    sheetWorker = new Worker(new URL('./turntableSheet.worker.ts', import.meta.url), { type: 'module' })
    sheetWorker.addEventListener('message', (event: MessageEvent<SheetReply>) => {
      sheetReplies.get(event.data.id)?.(event.data)
      sheetReplies.delete(event.data.id)
    })
  }
  const request: SheetRequest = { id: ++sheetRequests, src, size }
  const worker = sheetWorker
  return new Promise<ImageBitmap>((resolve, reject) => {
    sheetReplies.set(request.id, (reply) => 'bitmap' in reply ? resolve(reply.bitmap) : reject(new Error(`${src}: ${reply.error}`)))
    worker.postMessage(request)
  })
}
