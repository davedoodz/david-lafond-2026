export const SEAL_STYLES = ['scalloped', 'round', 'glass'] as const
export type SealStyle = (typeof SEAL_STYLES)[number]

/** Asset path and natural pixel size per style (glass-marks' seal art isn't perfectly square). */
const SEAL_ASSET: Record<SealStyle, { src: string; width: number; height: number }> = {
  scalloped: { src: '/work/momo/seal/scalloped.webp', width: 640, height: 640 },
  round: { src: '/work/momo/seal/round.webp', width: 640, height: 640 },
  glass: { src: '/work/momo/seal/seal-glass.webp', width: 640, height: 633 },
}

/** "Clinically informed · Wellness" pressed-paper seal in the system card's bottom-right corner (momoSystem.css .momo-seal). */
export function MomoSeal({ style }: { style: SealStyle }) {
  const { src, width, height } = SEAL_ASSET[style]
  return (
    <img
      className="momo-seal"
      src={src}
      width={width}
      height={height}
      alt="Clinically informed wellness seal"
      // Eager: it is part of the card and must be there when the card arrives.
      loading="eager"
      decoding="sync"
    />
  )
}
