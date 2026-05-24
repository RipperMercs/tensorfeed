interface Props {
  hue: number;
  kind: string;
}

/**
 * Striped SVG placeholder for product cards that have no image yet.
 * Renders a reticle + monospace caption so editors can see at a glance
 * that a real image is still owed. Not a generic "no image" greybox; the
 * visual contract is intentional.
 */
export default function Placeholder({ hue, kind }: Props) {
  const id = `ph-${hue}-${kind.replace(/\s+/g, '')}`;
  return (
    <div className="ph-img" aria-hidden="true">
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern
            id={id}
            width="14"
            height="14"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(35)"
          >
            <rect width="14" height="14" fill={`oklch(0.22 0.04 ${hue})`} />
            <line
              x1="0"
              y1="0"
              x2="0"
              y2="14"
              stroke={`oklch(0.28 0.04 ${hue})`}
              strokeWidth="2"
            />
          </pattern>
          <radialGradient id={`${id}-rad`} cx="30%" cy="30%" r="80%">
            <stop offset="0%" stopColor={`oklch(0.45 0.16 ${hue})`} stopOpacity="0.5" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
        <rect width="400" height="300" fill={`url(#${id})`} />
        <rect width="400" height="300" fill={`url(#${id}-rad)`} />
        <g transform="translate(200,150)" opacity="0.7">
          <circle r="34" fill="none" stroke="rgba(226,232,240,0.18)" strokeWidth="1" />
          <circle
            r="20"
            fill="none"
            stroke="rgba(226,232,240,0.24)"
            strokeWidth="1"
            strokeDasharray="2 4"
          />
          <line x1="-50" y1="0" x2="-40" y2="0" stroke="rgba(226,232,240,0.4)" strokeWidth="1" />
          <line x1="50" y1="0" x2="40" y2="0" stroke="rgba(226,232,240,0.4)" strokeWidth="1" />
          <line x1="0" y1="-50" x2="0" y2="-40" stroke="rgba(226,232,240,0.4)" strokeWidth="1" />
          <line x1="0" y1="50" x2="0" y2="40" stroke="rgba(226,232,240,0.4)" strokeWidth="1" />
        </g>
        <text
          x="200"
          y="262"
          textAnchor="middle"
          fontFamily="ui-monospace, 'JetBrains Mono', monospace"
          fontSize="11"
          fill="rgba(226,232,240,0.45)"
          letterSpacing="3"
        >
          PRODUCT-SHOT
        </text>
        <text
          x="200"
          y="278"
          textAnchor="middle"
          fontFamily="ui-monospace, 'JetBrains Mono', monospace"
          fontSize="9"
          fill="rgba(226,232,240,0.25)"
          letterSpacing="2"
        >
          {kind.toUpperCase()}
        </text>
      </svg>
    </div>
  );
}
