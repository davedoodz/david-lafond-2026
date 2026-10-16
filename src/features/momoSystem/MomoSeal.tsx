/**
 * "Clinically informed · Mental health" seal, pressed into the system card's bottom-right corner.
 * Drawn in one tone close to the card; the pressed look comes from CSS (momoSystem.css .momo-seal).
 */
export function MomoSeal() {
  return (
    <svg className="momo-seal" viewBox="0 0 200 200" aria-label="Clinically informed, mental health" role="img">
      <defs>
        {/* Top text runs clockwise over the top; bottom text runs left to right under the centre, upright. */}
        <path id="momo-seal-top" d="M 26 100 A 74 74 0 0 1 174 100" />
        <path id="momo-seal-bottom" d="M 17 100 A 83 83 0 0 0 183 100" />
      </defs>
      <circle className="momo-seal__line momo-seal__rim" cx="100" cy="100" r="97" />
      <circle className="momo-seal__line" cx="100" cy="100" r="92" />
      <circle className="momo-seal__line" cx="100" cy="100" r="62" />
      <circle className="momo-seal__dot" cx="21.5" cy="100" r="2.2" />
      <circle className="momo-seal__dot" cx="178.5" cy="100" r="2.2" />
      <text className="momo-seal__text">
        <textPath href="#momo-seal-top" startOffset="50%" textAnchor="middle">CLINICALLY INFORMED</textPath>
      </text>
      <text className="momo-seal__text">
        <textPath href="#momo-seal-bottom" startOffset="50%" textAnchor="middle">MENTAL HEALTH</textPath>
      </text>
      {/* Caduceus: staff and knob, wings, two snakes crossing the staff. */}
      <g className="momo-seal__mark">
        <line x1="100" y1="66" x2="100" y2="140" />
        <circle cx="100" cy="64" r="3.4" />
        <path d="M 97 74 C 88 68 76 68 66 72 C 72 74 76 76 78 78 C 84 76 92 77 97 80 Z" />
        <path d="M 103 74 C 112 68 124 68 134 72 C 128 74 124 76 122 78 C 116 76 108 77 103 80 Z" />
        <path className="momo-seal__snake" d="M 108 84 C 114 88 112 95 100 98 C 88 101 86 108 100 112 C 112 115 112 122 100 125 C 92 127 92 132 99 136" />
        <path className="momo-seal__snake" d="M 92 84 C 86 88 88 95 100 98 C 112 101 114 108 100 112 C 88 115 88 122 100 125 C 108 127 108 132 101 136" />
      </g>
    </svg>
  )
}
