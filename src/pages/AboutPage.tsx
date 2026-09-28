import { useEffect, useRef, type CSSProperties } from 'react'
import { ContactCta } from '../components/ContactCta'
import { EditableText } from '../components/EditableText'
import { Footer } from '../components/Footer'
import { ArrowDownIcon } from '../components/icons'
import { Nav } from '../components/Nav'
import { PhotoStack } from '../features/photoStack/PhotoStack'
import { Playground } from '../features/playground/Playground'
import { SheetLayers, sheetDials, useSheetDepth } from '../features/sheetDepth/sheetDepth'
import { useEntrance } from '../lib/useEntrance'
import { useFitColumn } from '../lib/useFitColumn'
import { useTuningController } from '../tuning/useTuning'
import './AboutPage.css'

const STORY = [
  'My path to product design has been a rocky one.',
  'My academic path began as a pre-med, only to realize that following strict protocols wasn’t meant for me.',
  'I believe the best designers are rebellious by nature.',
  'I’ve never truly felt like I belonged anywhere.\n\n\n',
  'My whole life has been a series of pivots.\nI have quite the unconventional background.',
  'I started my studies\n',
  'Here are a few snippets that shed a bit of light into my too-many-too-count interests.',
].join('\n\n')

const CONFIG = {
  heading: { type: 'text' as const, default: 'Aw, flattered you wanna hear my story.' },
  story: { type: 'text' as const, default: STORY, placeholder: 'Blank lines = paragraph breaks' },
  playgroundLabel: { type: 'text' as const, default: 'My playground' },
  /** Vertical file-sheet presets for the dark playground panel. */
  sheet: sheetDials(),
  spacing: {
    gapDesktop: [214, 40, 600, 1] as [number, number, number, number],
    gapMobile: [149, 24, 500, 1] as [number, number, number, number],
    stackToHeadingDesktop: [80, 0, 240, 1] as [number, number, number, number],
    stackToHeadingMobile: [78, 0, 240, 1] as [number, number, number, number],
  },
}

export function AboutPage() {
  const { values: t, setValue } = useTuningController('About', CONFIG)

  const mainRef = useRef<HTMLElement>(null)
  const lightRef = useRef<HTMLDivElement>(null)
  const darkRef = useRef<HTMLDivElement>(null)
  useSheetDepth(darkRef, lightRef, { values: t.sheet, radius: [45, 20] })
  useFitColumn(mainRef)
  const entrance = useEntrance()

  useEffect(() => {
    document.body.dataset.page = 'about'
    return () => {
      delete document.body.dataset.page
    }
  }, [])

  const style = {
    '--story-gap-d': `${t.spacing.gapDesktop}px`,
    '--story-gap-m': `${t.spacing.gapMobile}px`,
    '--stack-gap-d': `${t.spacing.stackToHeadingDesktop}px`,
    '--stack-gap-m': `${t.spacing.stackToHeadingMobile}px`,
  } as CSSProperties

  return (
    <main ref={mainRef} className="about" style={style}>
      <div ref={lightRef} className="about__light" data-surface="light">
        <Nav route="about" />
        <PhotoStack className="about__stack" />
        <section className={`about__story column ${entrance.className}`} style={entrance.style} aria-labelledby="about-title">
          <EditableText
            as="h1"
            id="about-title"
            className="about__heading"
            label="Heading"
            enter={0}
            value={t.heading}
            onChange={(next) => setValue('heading', next)}
          />
          <EditableText
            className="about__text"
            label="Story"
            enter={1}
            value={t.story}
            onChange={(next) => setValue('story', next)}
          />
        </section>
      </div>
      <div ref={darkRef} className="about__dark" data-surface="dark">
        <SheetLayers preset={t.sheet.preset} />
        <section className="about__play" aria-labelledby="play-title">
          <h2 id="play-title" className="eyebrow column">
            {t.playgroundLabel} <ArrowDownIcon />
          </h2>
          <Playground />
        </section>
        <ContactCta />
        <Footer />
      </div>
    </main>
  )
}
