export type FilmCrop = 'phone' | 'detail' | 'upper'
export type FiloFilm = { id: string; label: string; crop: FilmCrop; posterScene: number }

/** Coordinates on the studio's 720 × 1040 transparent film canvas. */
export const FILM_CROPS: Record<FilmCrop, { x: number; y: number; width: number; height: number }> = {
  phone: { x: 130, y: 60, width: 460, height: 922 },
  detail: { x: 170, y: 197, width: 380, height: 700 },
  upper: { x: 170, y: 197, width: 380, height: 510 },
}

/** Studio flows rendered to film by scripts/render-filo-films.mjs. Only flow-04 is on the page: it plays
    on the Proposal's phone (filoStoryArt.tsx). The other flows' films left with the evidence, scale and
    handoff sections. */
export const FILO_FILMS: Record<string, FiloFilm> = {
  'flow-04': { id: 'flow-04', label: 'Tap the sample. Open its record.', crop: 'phone', posterScene: 0 },
}
