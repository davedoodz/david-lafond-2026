export const SEAL_STYLES = ['scalloped', 'round'] as const
export type SealStyle = (typeof SEAL_STYLES)[number]

/** "Clinically informed · Wellness" pressed-paper seal in the system card's bottom-right corner (momoSystem.css .momo-seal). */
export function MomoSeal({ style }: { style: SealStyle }) {
  return (
    <img
      className="momo-seal"
      src={`/work/momo/seal/${style}.webp`}
      width={640}
      height={640}
      alt="Clinically informed wellness seal"
      // Eager: it is part of the card and must be there when the card arrives.
      loading="eager"
      decoding="sync"
    />
  )
}
