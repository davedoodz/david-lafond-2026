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
    'Gap between title sentences': ['--fm-title-line-gap', 12, 0, 40, 1, 'px'],
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
    'Gap between body sentences': ['--fm-body-line-gap', 15, 0, 40, 1, 'px'],
    'Quote cards scale': ['--fm-cards-scale', 0.5, 0.3, 1.2, 0.01, ''],
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
  /** Every dial below is in the full-size card's units: Quote cards scale shrinks the whole strip. */
  '3 Primary research · quote cards': {
    'Scroll speed': ['--fm-cards-speed', 1, 0.2, 3, 0.05, ''],
    'Gap between cards': ['--fm-cards-gap', 16, 0, 80, 1, 'px'],
    'Card width (% of screen)': ['--fm-card-w', 82, 40, 100, 1, ''],
    'Card corner radius': ['--fm-card-radius', 20, 0, 60, 1, 'px'],
    'Card padding top and bottom': ['--fm-card-pad-y', 24, 0, 80, 1, 'px'],
    'Card padding sides': ['--fm-card-pad-x', 22, 0, 80, 1, 'px'],
    'Quote text size': ['--fm-quote-size', 23, 12, 40, 0.5, 'px'],
    'Quote text weight': ['--fm-quote-weight', 540, 300, 800, 10, ''],
    'Quote line spacing': ['--fm-quote-lh', 1.16, 0.9, 1.6, 0.01, ''],
    'Quote letter spacing': ['--fm-quote-ls', -0.045, -0.1, 0.05, 0.005, ''],
    'Quote to name gap': ['--fm-quote-gap', 16, 0, 60, 1, 'px'],
    'Name text size': ['--fm-role-size', 12, 8, 20, 0.5, 'px'],
  },
  '4 Steps 01–04 · prototypes': {
    'Portal window width': ['--fm-portal-w', 342, 200, 400, 2, 'px'],
    'Phone width': ['--fm-phone-w', 156, 80, 320, 1, 'px'],
    'Sample box width': ['--fm-box-w', 390, 200, 700, 2, 'px'],
    'Box to phone gap': ['--fm-box-gap', 40, 0, 120, 2, 'px'],
    'Tap scene phone width': ['--fm-tap-w', 175, 100, 250, 1, 'px'],
  },
  '5 A circular future · milestones': {
    'Product loop width': ['--fm-loop-w', 342, 200, 400, 2, 'px'],
    'Loop to photos gap': ['--fm-milestones-gap', 38, 0, 200, 2, 'px'],
  },
}

/** Mounted only on the Filo page, so its panel shows only there. Writes the dials to `target`. */
export function FiloPhoneDials({ target }: { target: RefObject<HTMLElement | null> }) {
  usePhoneLayoutDials('Filo · phone layout', DIALS, target)
  return null
}
