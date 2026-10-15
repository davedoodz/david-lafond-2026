/**
 * Momo thumbnail study: the desktop (867 × 493) and mobile (100 : 134) cards side by side on one
 * timeline, tuned with the DialKit panel. The cards run on the same engine as the Selected Works
 * card (src/features/momoThumb), and the values saved here are what the site plays.
 */
import { mountMomoThumb, sceneHTML } from '/src/features/momoThumb/engine.js'
import { mountDials } from '/src/studio/momoThumbDials.tsx'

const board = document.querySelector('.board')
board.insertAdjacentHTML(
  'beforeend',
  `<section class="variant">
    <div class="frame">${sceneHTML('d')}<span class="lbl">Desktop</span></div>
    <div class="frame">${sceneHTML('m')}<span class="lbl">Mobile</span></div>
    <p class="variant__note"><b>Close crop · inputs to outputs</b>Heartbeat lines run from the card edges, behind the Watch and the iPhone, into Momo; every segment is horizontal or vertical. Momo closes its eyes while eight inputs orbit it and the voice note describes a calm day after a river walk, then opens them as the inputs become eight outputs. The iPhone switches to the tracker and the Watch connects the two with the line picked in the DialKit panel (top right), which holds every control. The Selected Works card plays these values.</p>
  </section>`,
)

const thumb = mountMomoThumb({ root: document.body, cards: [...board.querySelectorAll('.mt-card')], mesh: true, keys: true })

const dialHost = document.createElement('div')
document.body.append(dialHost)
mountDials(dialHost, thumb.apply, (action) => (action === 'replay' ? thumb.replay() : thumb.togglePause()))
