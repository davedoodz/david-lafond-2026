/**
 * "Filo · phone layout": DialKit panel for the Filo case study on phones (≤ 640px) only, the
 * counterpart of "Momo · phone layout" (momoMobile.ts). Folders follow the page from top to bottom
 * and are named after each section's heading; every dial names the exact image, video or prototype it
 * moves. Text sizes stay in "Mobile case studies", shared by every case study. Each dial sets one CSS
 * variable on <main> (phoneLayoutDials.ts) that filoMobile.css reads inside its phone media query, so
 * desktop never changes. Whole-page defaults match Momo's, so both case studies read the same.
 */
import type { RefObject } from 'react'
import { usePhoneLayoutDials, type PhoneDialTable } from './phoneLayoutDials'
import './filoMobile.css'

const DIALS: PhoneDialTable = {
  'Whole page': {
    'Gap between sections': ['--fm-section-gap', 112, 40, 240, 2, 'px'],
    'Heading to image gap': ['--fm-media-gap', 32, 0, 120, 1, 'px'],
    'Body text line spacing': ['--fm-body-lh', 1.25, 1, 1.8, 0.01, ''],
    'Gap above and below images': ['--fm-image-gap', 80, 0, 200, 1, 'px'],
  },
  '1 Hero · title and hang tag': {
    'Filo mark size': ['--fm-mark-scale', 0.75, 0.3, 1.2, 0.01, ''],
    'Partner logo height': ['--fm-logo-h', 36, 12, 48, 1, 'px'],
    'Gap above and below logos': ['--fm-logos-gap', 46, 0, 120, 1, 'px'],
    'Hang tag width': ['--fm-tag-w', 300, 160, 400, 2, 'px'],
  },
  '2 Market gap · Proposal': {
    'Desk photo width': ['--fm-desk-w', 342, 160, 400, 2, 'px'],
    'Phone on swatches width': ['--fm-proposal-w', 342, 200, 400, 2, 'px'],
  },
  '3 Primary research': {
    'Interview video width': ['--fm-interviews-w', 342, 200, 400, 2, 'px'],
    'Miro board width': ['--fm-miro-w', 342, 200, 400, 2, 'px'],
  },
  '3 Primary research · quote card art': {
    'Technical designer art size': ['--fm-art1-w', 92, 40, 140, 1, '%'],
    'Technical designer art x': ['--fm-art1-x', 0, -150, 150, 1, 'px'],
    'Technical designer art y': ['--fm-art1-y', 16, -100, 250, 1, 'px'],
    'Sourcing lead art size': ['--fm-art2-w', 92, 40, 140, 1, '%'],
    'Sourcing lead art x': ['--fm-art2-x', 0, -150, 150, 1, 'px'],
    'Sourcing lead art y': ['--fm-art2-y', 16, -100, 250, 1, 'px'],
    'Product lead art size': ['--fm-art3-w', 92, 40, 140, 1, '%'],
    'Product lead art x': ['--fm-art3-x', 0, -150, 150, 1, 'px'],
    'Product lead art y': ['--fm-art3-y', 16, -100, 250, 1, 'px'],
    'Merchandiser art size': ['--fm-art4-w', 92, 40, 140, 1, '%'],
    'Merchandiser art x': ['--fm-art4-x', 0, -150, 150, 1, 'px'],
    'Merchandiser art y': ['--fm-art4-y', 16, -100, 250, 1, 'px'],
  },
  '4 Steps 01–04 · prototypes': {
    'Portal window width': ['--fm-portal-w', 342, 200, 400, 2, 'px'],
    'Phone width': ['--fm-phone-w', 250, 180, 320, 2, 'px'],
    'Sample box width': ['--fm-box-w', 390, 200, 700, 2, 'px'],
    'Box to phone gap': ['--fm-box-gap', 40, 0, 120, 2, 'px'],
    'Tap scene phone width': ['--fm-tap-w', 140, 100, 250, 2, 'px'],
  },
  '5 A circular future · milestones': {
    'Product loop width': ['--fm-loop-w', 342, 200, 400, 2, 'px'],
    'Loop to photos gap': ['--fm-milestones-gap', 72, 0, 200, 2, 'px'],
  },
}

/** Mounted only on the Filo page, so its panel shows only there. Writes the dials to `target`. */
export function FiloPhoneDials({ target }: { target: RefObject<HTMLElement | null> }) {
  usePhoneLayoutDials('Filo · phone layout', DIALS, target)
  return null
}
