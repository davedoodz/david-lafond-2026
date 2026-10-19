import { FiloMaterialLoop } from './FiloMaterialLoop'
import './filoNext.css'

/** What's-next figure: the Future Fabric products on an infinity loop (FiloMaterialLoop). As a
    case__figure it follows the section's media › layout: `top` puts the loop above the title. */
export function FiloNext() {
  return (
    <section className="case__figure filo-next">
      <FiloMaterialLoop />
    </section>
  )
}
