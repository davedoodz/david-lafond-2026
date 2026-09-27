/** Dev-only DialKit surface. Lazily imported from App so production never ships it. */
import 'dialkit/styles.css'
import { DialRoot } from 'dialkit'

export default function DevRoot() {
  return <DialRoot position="bottom-right" theme="dark" defaultOpen={false} />
}
