export type FilmCrop = 'phone' | 'detail' | 'upper'
export type FilmGroup = 'hero' | 'source' | 'evidence' | 'scale' | 'handoff'
export type FiloFilm = { id: string; label: string; crop: FilmCrop; posterScene: number }

/** Coordinates on the studio's 720 × 1040 transparent film canvas. */
export const FILM_CROPS: Record<FilmCrop, { x: number; y: number; width: number; height: number }> = {
  phone: { x: 130, y: 60, width: 460, height: 922 },
  detail: { x: 170, y: 197, width: 380, height: 700 },
  upper: { x: 170, y: 197, width: 380, height: 510 },
}

export const FILO_FILMS: Record<string, FiloFilm> = {
  'flow-01': { id: 'flow-01', label: 'Build the Technical File', crop: 'detail', posterScene: 3 },
  'flow-02': { id: 'flow-02', label: 'Find the right suppliers', crop: 'phone', posterScene: 2 },
  'flow-03': { id: 'flow-03', label: 'Approve the sample plan', crop: 'detail', posterScene: 3 },
  'flow-04': { id: 'flow-04', label: 'Tap the sample. Open its record.', crop: 'phone', posterScene: 0 },
  'flow-05': { id: 'flow-05', label: 'Capture what happens at the bench', crop: 'upper', posterScene: 1 },
  'flow-06': { id: 'flow-06', label: 'See the conflict before fusing', crop: 'phone', posterScene: 2 },
  'flow-07': { id: 'flow-07', label: 'Can we make 10,000?', crop: 'phone', posterScene: 1 },
  'flow-08': { id: 'flow-08', label: 'Turn a conflict into a test plan', crop: 'detail', posterScene: 3 },
  'flow-09': { id: 'flow-09', label: 'Run a controlled test', crop: 'upper', posterScene: 2 },
  'flow-10': { id: 'flow-10', label: 'Keep observations distinct from proof', crop: 'detail', posterScene: 1 },
  'flow-11': { id: 'flow-11', label: 'Share only the evidence that matters', crop: 'detail', posterScene: 1 },
  'flow-12': { id: 'flow-12', label: 'Review supplier changes', crop: 'upper', posterScene: 2 },
  'flow-13': { id: 'flow-13', label: 'Make the consequential decision', crop: 'detail', posterScene: 0 },
  'flow-14': { id: 'flow-14', label: 'Send a traceable Technical File', crop: 'phone', posterScene: 1 },
  'flow-15': { id: 'flow-15', label: 'Carry the learning into the next collection', crop: 'upper', posterScene: 2 },
}

/** All fifteen studio flows appear once. The lifecycle reel remains reserved for the intro. */
export const FILM_GROUPS: Record<FilmGroup, string[]> = {
  hero: ['flow-04', 'flow-01'],
  source: ['flow-02', 'flow-03', 'flow-12'],
  evidence: ['flow-05', 'flow-06', 'flow-09', 'flow-08', 'flow-10'],
  scale: ['flow-07', 'flow-13'],
  handoff: ['flow-11', 'flow-14', 'flow-15'],
}
