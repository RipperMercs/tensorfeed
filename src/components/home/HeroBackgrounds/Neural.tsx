/**
 * Elevated neural network hero background.
 * Pure SVG with SMIL animations, zero JS state, GPU-cheap.
 *
 * Differences from the legacy NeuralNetworkBg:
 *  - 28 nodes instead of 20, denser mesh
 *  - Pulses sample three brand colors (indigo, violet, cyan) so the flow feels alive
 *  - Two pulse sizes: thin tracer pulses + occasional brighter "beats"
 *  - Radial mask fades edges so the H1 reads cleanly
 *  - Nodes get a soft halo + breathing, no hard on/off flashes
 *  - Honors prefers-reduced-motion via the global override in globals.css
 */

const NODES: [number, number][] = [
  [6, 22], [12, 58], [18, 30], [22, 78], [28, 14],
  [32, 48], [38, 70], [42, 22], [46, 52], [50, 82],
  [54, 16], [58, 42], [62, 66], [66, 26], [70, 54],
  [74, 78], [78, 34], [82, 60], [86, 22], [90, 48],
  [94, 72], [16, 44], [34, 36], [52, 32], [60, 80],
  [72, 44], [80, 16], [88, 38],
];

const EDGES: [number, number][] = [
  [0, 2], [0, 21], [1, 21], [1, 3], [2, 4], [2, 21], [2, 22],
  [3, 6], [4, 7], [5, 22], [5, 8], [6, 12], [7, 23], [7, 10],
  [8, 23], [8, 11], [9, 12], [10, 13], [11, 14], [11, 25],
  [12, 14], [12, 15], [13, 16], [14, 17], [15, 18], [15, 24],
  [16, 19], [17, 20], [17, 25], [18, 27], [19, 26], [19, 20],
  [21, 22], [22, 23], [23, 24], [24, 25], [25, 26], [26, 27],
  [3, 5], [9, 13], [16, 25],
];

const PULSE_COLORS = ['var(--accent-primary)', 'var(--accent-secondary)', 'var(--accent-cyan)'];

export default function Neural() {
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <radialGradient id="tf-neural-fade" cx="50%" cy="42%" r="65%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0" />
        </radialGradient>
        <mask id="tf-neural-mask">
          <rect width="100" height="100" fill="url(#tf-neural-fade)" />
        </mask>
        <radialGradient id="tf-neural-node-halo">
          <stop offset="0%" stopColor="var(--accent-secondary)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent-secondary)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <g mask="url(#tf-neural-mask)">
        {EDGES.map(([a, b], i) => (
          <line
            key={`edge-${i}`}
            x1={NODES[a][0]}
            y1={NODES[a][1]}
            x2={NODES[b][0]}
            y2={NODES[b][1]}
            stroke="var(--accent-primary)"
            strokeOpacity="0.07"
            strokeWidth="0.13"
          />
        ))}

        {EDGES.map(([a, b], i) => {
          const color = PULSE_COLORS[i % PULSE_COLORS.length];
          const dur = 4.4 + (i % 5) * 0.7;
          const delay = (i * 0.83) % dur;
          const isBeat = i % 7 === 0;
          const pathD = `M${NODES[a][0]},${NODES[a][1]} L${NODES[b][0]},${NODES[b][1]}`;
          return (
            <circle
              key={`pulse-${i}`}
              r={isBeat ? 0.55 : 0.32}
              fill={color}
              opacity="0"
              style={isBeat ? { filter: `drop-shadow(0 0 1.2px ${color})` } : undefined}
            >
              <animateMotion
                dur={`${dur}s`}
                begin={`${delay}s`}
                repeatCount="indefinite"
                path={pathD}
                rotate="auto"
              />
              <animate
                attributeName="opacity"
                values={isBeat ? '0;0.85;0.85;0' : '0;0.55;0.55;0'}
                keyTimes="0;0.12;0.88;1"
                dur={`${dur}s`}
                begin={`${delay}s`}
                repeatCount="indefinite"
              />
            </circle>
          );
        })}

        {NODES.map(([x, y], i) => {
          const breath = 3.4 + (i % 4) * 0.6;
          const breathDelay = (i * 0.31) % breath;
          const isHub = i % 6 === 0;
          return (
            <g key={`node-${i}`}>
              {isHub && <circle cx={x} cy={y} r="1.4" fill="url(#tf-neural-node-halo)" />}
              <circle cx={x} cy={y} r={isHub ? 0.45 : 0.28} fill="var(--accent-secondary)" opacity="0.22">
                <animate
                  attributeName="opacity"
                  values={isHub ? '0.2;0.55;0.2' : '0.14;0.32;0.14'}
                  dur={`${breath}s`}
                  begin={`${breathDelay}s`}
                  repeatCount="indefinite"
                />
              </circle>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
