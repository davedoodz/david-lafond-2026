/** Dev-only DialKit surface. Lazily imported from App so production never ships it. */
import 'dialkit/styles.css'
import { DialRoot } from 'dialkit'

/** While the panel is open, `<html data-dialkit-open>` pauses page interactions such as ink. */
const onOpenChange = (open: boolean) => {
  document.documentElement.toggleAttribute('data-dialkit-open', open)
}

export default function DevRoot() {
  return <DialRoot position="bottom-right" theme="dark" defaultOpen={false} onOpenChange={onOpenChange} />
}
