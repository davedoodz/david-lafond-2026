/** Hand-mapped from all 60 source scans. Geometry is percent of a single A4 page.
 * These are editable layout studies, not claims about the original author's grid.
 * Full-bleed art is a solid field; captions sit above it in the opposite color.
 */
export type Ink = 'black' | 'white'
export type LayoutBlock = { id: string; label: string; x: number; y: number; w: number; h: number; color: Ink }
export type PageLayout = { background: Ink; blocks: LayoutBlock[] }
type Box = [label: string, x: number, y: number, w: number, h: number]
const box = (label: string, x: number, y: number, w: number, h: number): Box => [label, x, y, w, h]
const folio = (): Box => box('Page number', 91, 94, 3, 2)
const running = (label: string): Box => box(label, 6, 4, 28, 1.5)
const matrix = (label: string, x: number, y: number, w: number, h: number, columns: number, rows: number, gapX = 3, gapY = 3): Box[] => {
  const bw = (w - gapX * (columns - 1)) / columns
  const bh = (h - gapY * (rows - 1)) / rows
  return Array.from({ length: columns * rows }, (_, i) => box(`${label} ${i + 1}`, x + (i % columns) * (bw + gapX), y + Math.floor(i / columns) * (bh + gapY), bw, bh))
}
const intro = (titleHeight: number, bodyY: number, bodyH: number, art: Box[]): Box[] => [
  box('Chapter number', 6, 4, 10, 3.5),
  ...[22, 43, 62, 78].map((x, i) => box(`Topic ${i + 1}`, x, 4.5, i === 3 ? 16 : 15, 1.5)),
  box('Project title', 6, 10, 87, titleHeight),
  box('Introduction', 22, bodyY, 71, bodyH), ...art,
  box('Metadata labels', 6, 90, 11, 6), box('Metadata values', 22, 90, 43, 6), folio(),
]
const page = (background: Ink, boxes: Box[]): PageLayout => ({ background, blocks: boxes.map(([label, x, y, w, h], i) => ({ id: `b${i + 1}`, label, x, y, w, h, color: background === 'black' ? 'white' : 'black' })) })
const white = (...boxes: Box[]) => page('white', boxes)
const black = (...boxes: Box[]) => page('black', boxes)

export const PAGE_LAYOUTS: Record<number, PageLayout> = {
  1: black(box('Name', 29, 45, 40, 2), box('Application', 29, 49, 40, 1.5), box('Program and year', 29, 53, 40, 1.5)),
  2: black(), // Full-bleed sketchbook collage.
  3: white(
    box('Year heading', 6, 10, 8, 2), box('Project heading', 22, 10, 14, 2), box('Page heading', 82, 10, 12, 2),
    ...Array.from({ length: 9 }, (_, i) => [box(`Year ${i + 1}`, 6, 19 + i * 7.5, 8, 2), box(`Project ${i + 1}`, 22, 19 + i * 7.5, 62, 4.5), box(`Page ${i + 1}`, 91, 19 + i * 7.5, 3, 2)]).flat(),
    box('Drawing attribution', 6, 94, 88, 2)),
  4: white(...intro(14, 29, 25, [box('Circular economy diagram', 37, 59, 36, 24)])),
  5: white(box('Axonometric drawing', 5, 10, 90, 68), box('Circular inset', 68, 67, 28, 20), box('Seasonal community caption', 7, 82, 38, 9), box('Live work caption', 49, 82, 30, 9), folio()),
  6: white(running('Fluctuation & Co.'), box('Site axonometric', 6, 10, 62, 36), ...matrix('Site detail', 6, 49, 62, 13, 3, 1), ...matrix('Text column', 73, 10, 21, 54, 1, 3, 0, 4), ...matrix('Season diagram', 6, 70, 88, 20, 4, 1), folio()),
  7: white(box('Scale marker', 6, 4, 26, 2), ...matrix('Plan key', 6, 10, 88, 6, 3, 1), box('Floor plan', 6, 20, 88, 62), ...matrix('Plan legend', 6, 85, 88, 7, 3, 1), folio()),
  8: white(running('Fluctuation & Co.'), ...matrix('Spatial module', 6, 11, 88, 42, 3, 2, 6, 7), ...matrix('Section', 6, 59, 24, 33, 1, 2), ...matrix('Plan variation', 39, 59, 55, 33, 3, 2, 4, 4), folio()),
  9: white(...matrix('Program caption', 6, 10, 28, 59, 1, 4, 0, 5), box('Modular floor plan', 39, 8, 55, 56), box('Interior perspective', 0, 74, 100, 26)),
  10: white(running('Fluctuation & Co.'), box('Light frame caption', 6, 10, 21, 19), box('Upper drawing', 32, 10, 62, 30), box('Middle drawing', 7, 38, 64, 30), box('Lower drawing', 34, 66, 60, 25), box('Structural caption', 6, 75, 22, 16), folio()),
  11: white(box('Section detail', 6, 5, 65, 88), box('Upper annotation', 6, 10, 24, 18), box('Middle annotation', 69, 38, 25, 9), box('Lower annotations', 70, 60, 24, 28), folio()),
  12: white(running('Fluctuation & Co.'), ...matrix('Energy label', 6, 13, 20, 27, 1, 3, 0, 6), box('Energy system', 34, 10, 60, 34), box('Building section left', 6, 58, 94, 30), folio()),
  13: white(box('Caption', 6, 10, 32, 29), box('Systems legend', 60, 10, 31, 34), box('Building section right', 0, 58, 94, 30), folio()),
  14: black(running('Fluctuation & Co.'), box('Courtyard caption', 6, 10, 34, 9), folio()),
  15: black(folio()),
  16: white(...intro(15, 29, 26, [box('Journal covers', 27, 61, 63, 26)])),
  17: white(box('Editorial collage', 0, 0, 100, 42), ...matrix('Publication caption', 6, 46, 27, 46, 1, 3, 0, 4), box('Website view', 39, 46, 55, 22), box('Digital journal', 39, 72, 55, 20), folio()),
  18: black(...intro(15, 29, 26, [box('Algorithm annotation', 6, 60, 10, 16), ...matrix('Hierarchy tree', 20, 60, 74, 16, 2, 1, 6), ...matrix('Tree caption', 20, 80, 74, 7, 2, 1, 6)])),
  19: black(box('Welcome screen', 6, 10, 41, 20), box('Paper model', 54, 10, 46, 21), box('Analysis screen', 6, 35, 41, 38), box('Shape library', 54, 35, 40, 17), box('Generated geometry', 54, 56, 40, 17), ...matrix('Method caption', 6, 77, 88, 11, 2, 1, 7), folio()),
  20: white(running('Reenactment of 1962 HIDECS 2'), ...matrix('Algorithm window', 6, 10, 88, 22, 2, 1, 8), ...matrix('Process step', 6, 40, 20, 51, 1, 4, 0, 5), box('Algorithm annotation', 34, 60, 25, 31), box('Analysis model left', 57, 54, 43, 27), ...matrix('Model detail', 62, 86, 32, 6, 3, 1), folio()),
  21: white(...matrix('Algorithm window', 6, 10, 88, 22, 2, 1, 8), box('Analysis model right', 0, 54, 31, 27), box('Process annotation', 35, 40, 18, 11), ...matrix('Process step', 72, 40, 22, 51, 1, 4, 0, 5), box('Closing caption', 38, 82, 29, 10), ...matrix('Model detail', 3, 86, 25, 6, 2, 1), folio()),
  22: white(running('Reenactment of 1962 HIDECS 2'), box('Algorithm graph', 6, 10, 88, 27), box('Source code', 6, 39, 88, 42), ...matrix('Code caption', 6, 85, 88, 7, 2, 1, 7), folio()),
  23: white(box('Model library', 6, 10, 88, 27), box('Source code', 6, 39, 88, 42), ...matrix('Code caption', 6, 85, 88, 7, 2, 1, 7), folio()),
  24: white(...intro(14, 29, 26, [box('Community diagram', 30, 62, 54, 20)])),
  25: white(box('Scale marker', 6, 4, 27, 2), box('Island drawing', 6, 10, 48, 50), box('Caption one', 59, 10, 35, 8), ...matrix('Tourism icon', 59, 21, 35, 7, 3, 1), box('Caption two', 59, 31, 35, 8), box('Economy diagram', 65, 42, 29, 18), box('Island caption', 6, 66, 42, 10), ...matrix('Community icon', 6, 80, 42, 5, 3, 1), box('Closing caption', 6, 88, 37, 5), box('Island inset', 57, 64, 37, 27), folio()),
  26: white(running('Wonder Collective'), box('Community network', 6, 10, 88, 79), box('Map key', 76, 72, 18, 18), folio()),
  27: white(...matrix('Strategy caption', 6, 10, 25, 80, 1, 5, 0, 4), ...matrix('Strategy icon', 38, 10, 23, 80, 1, 5, 0, 4), ...matrix('Strategy map', 68, 10, 26, 80, 1, 5, 0, 4), folio()),
  28: white(...intro(14, 30, 23, [box('Movement diagram', 22, 63, 18, 21), box('Transformation arrow', 45, 70, 7, 7), box('Movement sequence', 55, 59, 22, 27), box('Interaction legend', 81, 69, 10, 11)])),
  29: black(box('Worldbuilding marker', 71, 15, 2, 2), box('Worldbuilding heading', 75, 15, 20, 3), box('Worldbuilding caption', 75, 20, 20, 11), box('Framework marker', 6, 83, 2, 2), box('Framework heading', 11, 83, 30, 2.5), box('Framework caption', 11, 87, 30, 8), folio()),
  30: white(running('SANDBOX'), ...matrix('Modular block', 6, 10, 88, 80, 4, 6, 8, 5), folio()),
  31: white(box('Assembled framework', 6, 10, 62, 33), box('Framework caption', 72, 10, 22, 20), ...matrix('World assembly', 6, 46, 88, 35, 4, 3, 5, 3), box('Interaction caption', 6, 83, 26, 8), box('Spatial caption', 76, 80, 18, 11), folio()),
  32: white(running('SANDBOX'), ...matrix('Module type', 6, 10, 53, 5, 4, 1, 7), ...matrix('Module transformation', 6, 19, 53, 28, 4, 4, 6, 3), ...matrix('Transformation caption', 65, 10, 29, 37, 1, 3, 0, 4), box('Kinetic plan and section', 0, 56, 100, 44), folio()),
  33: white(box('Scale marker', 6, 4, 28, 2), box('Urban site plan', 6, 10, 88, 69), ...matrix('Plan legend', 6, 83, 88, 9, 3, 1, 5), folio()),
  34: white(box('Interface screenshots', 0, 0, 33, 100), box('VR participant', 46, 10, 48, 22), box('VR installation', 46, 36, 48, 23), box('Installation caption', 46, 63, 35, 11), box('VR headset', 85, 60, 15, 21), box('Interaction screen', 49, 77, 30, 9), box('Interaction caption', 49, 89, 40, 6)),
  35: white(box('VR headset', 0, 0, 68, 10), ...matrix('Experience caption', 8, 10, 29, 52, 1, 3, 0, 4), ...matrix('Interface screen', 8, 65, 29, 21, 1, 2, 0, 3), ...matrix('Virtual environment', 47, 10, 47, 72, 1, 3, 0, 4), box('VR controller', 49, 84, 25, 10), folio()),
  36: white(...intro(15, 29, 24, [box('Church concept', 25, 60, 60, 25)])),
  37: white(box('Exploded drawing labels', 6, 10, 21, 65), box('Exploded church', 31, 10, 27, 66), box('Exploded proposal', 63, 10, 31, 66), ...matrix('System caption', 6, 85, 88, 7, 2, 1, 8), folio()),
  38: white(running('Adaptive Reuse of Santa Teresa Church'), ...matrix('Archive tile', 6, 10, 88, 72, 7, 8, 2, 2), ...matrix('Archive caption', 6, 85, 88, 7, 2, 1, 8), folio()),
  39: white(box('Exploded floor plans', 6, 10, 54, 47), box('Concept sketches', 65, 10, 29, 42), box('Drawing caption', 65, 56, 29, 6), box('Church section', 0, 63, 100, 37)),
  40: white(running('Adaptive Reuse of Santa Teresa Church'), ...matrix('Section annotation', 6, 16, 27, 75, 1, 5, 0, 7), box('Church section left', 39, 15, 61, 69), folio()),
  41: white(box('Church section right', 0, 15, 61, 69), ...matrix('Section annotation', 68, 17, 26, 75, 1, 6, 0, 6), folio()),
  42: white(...intro(14, 29, 25, [box('Concept framework', 6, 61, 88, 18)])),
  43: white(box('Scale marker', 6, 4, 28, 2), box('Procedural mask', 6, 12, 70, 33), box('Process caption', 64, 10, 30, 8), box('Speculative landscape', 6, 47, 88, 30), ...matrix('Speculation caption', 6, 82, 88, 10, 2, 1, 12), folio()),
  44: black(running('In-Between Layers'), ...matrix('Form study', 6, 10, 88, 30, 3, 2, 3, 3), ...matrix('Form caption', 6, 44, 88, 10, 2, 1, 7), ...matrix('Film frame', 6, 59, 88, 33, 6, 6, 1, 1), folio()),
  45: black(box('Context caption', 6, 10, 24, 22), box('Photo one', 36, 10, 25, 14), box('Photo two', 68, 17, 25, 14), box('Photo three', 7, 38, 25, 14), box('Photo four', 40, 32, 25, 14), box('Photo five', 68, 41, 25, 14), box('Artifact caption', 6, 58, 24, 21), box('Material artifact', 36, 61, 58, 30), folio()),
  46: white(running('In-Between Layers'), ...matrix('Wireframe', 6, 15, 88, 18, 3, 1, 10), ...matrix('Black model', 6, 39, 88, 16, 3, 1, 10), ...matrix('Plan diagram', 6, 64, 88, 10, 3, 1, 10), ...matrix('Section diagram', 6, 82, 88, 10, 3, 1, 10), folio()),
  47: white(...matrix('Wireframe', 6, 15, 53, 18, 2, 1, 10), ...matrix('Black model', 6, 39, 53, 16, 2, 1, 10), ...matrix('Plan diagram', 6, 64, 53, 10, 2, 1, 10), ...matrix('Section diagram', 6, 82, 53, 10, 2, 1, 10), box('Model caption', 73, 10, 21, 18), box('Design rules', 73, 34, 21, 5), box('Rule diagram', 73, 42, 21, 30), box('Rules caption', 73, 77, 21, 14), folio()),
  48: black(running('Documented landscape'), box('Upper photo label', 43, 44, 48, 3), box('Lower photo label', 41, 78, 46, 3)),
  49: black(box('Field caption', 71, 10, 23, 24), box('Upper photo label', 18, 51, 38, 3), box('Lower photo label', 18, 83, 48, 3)),
  50: white(...intro(14, 29, 25, [box('Algorithm note', 6, 60, 12, 16), box('Algorithm tree', 24, 58, 34, 20), box('Layout search', 64, 58, 30, 20), ...matrix('Algorithm caption', 22, 81, 72, 7, 2, 1, 8)])),
  51: white(...matrix('Rule symbol', 6, 5, 48, 5, 4, 1, 5), box('Generated slab', 6, 14, 49, 23), box('Algorithm caption', 61, 10, 33, 11), box('Plan caption', 61, 25, 33, 13), box('Plan sketch', 61, 40, 33, 8), box('Assembly caption', 6, 41, 29, 9), box('Assembly sketch', 6, 54, 29, 10), box('Game prototype', 39, 52, 61, 20), box('Prototype caption', 6, 68, 29, 11), ...matrix('Generated iteration', 6, 82, 88, 10, 10, 2, 2, 2), folio()),
  52: white(...intro(15, 29, 23, [...matrix('Library program', 31, 58, 39, 25, 3, 3, 4, 3), box('Program key', 75, 58, 9, 25)])),
  53: white(box('Scale marker', 6, 4, 28, 2), box('Neighborhood plan', 6, 10, 88, 69), ...matrix('Neighborhood caption', 6, 84, 88, 8, 2, 1, 8), folio()),
  54: white(running('Rosemont Children Library & Park'), ...matrix('Program legend', 6, 10, 49, 12, 2, 4, 4, 1), box('Circular inset', 6, 29, 26, 22), box('Program plan', 36, 16, 58, 35), ...matrix('Program caption', 6, 57, 88, 13, 3, 1, 6), ...matrix('Program detail', 6, 75, 88, 19, 3, 1, 4), folio()),
  55: white(box('Scale marker', 6, 4, 28, 2), box('Library plan', 6, 12, 88, 62), box('Library section', 29, 80, 65, 13), folio()),
  56: white(running('Rosemont Children Library & Park'), box('Continuous roof section', 6, 10, 88, 9), ...matrix('Roof component', 6, 24, 88, 12, 5, 1, 5), ...matrix('Roof iteration', 6, 42, 88, 50, 3, 3, 5, 5), folio()),
  57: white(box('Playground diagram', 10, 10, 81, 20), ...matrix('Play caption', 6, 35, 25, 55, 1, 3, 0, 6), ...matrix('Play module', 43, 36, 20, 54, 1, 4, 0, 4), ...matrix('Module plan', 73, 36, 21, 54, 1, 4, 0, 4), folio()),
  58: white(running('Rosemont Children Library & Park'), box('Space allocation', 6, 10, 48, 26), box('Space caption', 68, 10, 26, 10), box('Plan schedule', 46, 30, 48, 20), box('Upper floor', 6, 43, 26, 20), box('Lower floor', 38, 53, 25, 18), box('Learning caption', 69, 56, 25, 18), box('Structural section', 6, 76, 55, 16), box('Structural caption', 69, 78, 25, 14), folio()),
  59: white(...matrix('Assembly label', 6, 10, 88, 6, 3, 1, 7), box('Exploded library', 6, 19, 88, 62), box('Material legend', 72, 76, 22, 8), ...matrix('Assembly caption', 6, 86, 88, 6, 3, 1, 7), folio()),
  60: black(),
}
