/**
 * Shared sparkline for status surfaces. Used at 14px for the kinetic
 * provider tab strip (stroke-only) and at 36px for the rack-card detail
 * (filled gradient). Same shape rules so both surfaces feel like the
 * same instrument.
 */
interface SparklineProps {
  data: number[];
  color: string;
  height?: number;
  fill?: boolean;
  stroke?: number;
  gradientId: string;
}

export default function Sparkline({
  data,
  color,
  height = 36,
  fill = true,
  stroke = 1.4,
  gradientId,
}: SparklineProps) {
  const W = 320;
  const H = height;
  const P = 2;
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const step = (W - P * 2) / (data.length - 1);
  const pts = data
    .map((v, i) => {
      const x = P + i * step;
      const y = H - P - ((v - min) / range) * (H - P * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' L');
  const area = `M${pts} L${W - P},${H - P} L${P},${H - P} Z`;
  const line = `M${pts}`;
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      {fill && (
        <defs>
          <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
      )}
      {fill && <path d={area} fill={`url(#${gradientId})`} />}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={stroke}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

/**
 * Deterministic 60-point sparkline seeded by service id. Same per-id
 * shape every render so the visual doesn't jitter across polls.
 * Mode varies by status:
 *   ok    gentle wave around baseline
 *   warn  choppier with one dip
 *   down  flat-line low
 */
export function buildSparkline(
  id: string,
  status: 'ok' | 'warn' | 'down' | 'unknown',
  base: number,
  points = 60,
): number[] {
  if (status === 'down') return Array(points).fill(base * 0.35);
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) h = (h ^ id.charCodeAt(i)) * 16777619;
  const rand = () => {
    h ^= h << 13;
    h ^= h >>> 17;
    h ^= h << 5;
    return (h >>> 0) / 4294967296;
  };
  const out: number[] = [];
  const amplitude = status === 'warn' ? 0.5 : 0.18;
  const noiseAmp = status === 'warn' ? 0.25 : 0.08;
  for (let i = 0; i < points; i++) {
    const t = i / (points - 1);
    const wave = Math.sin(t * Math.PI * 2.5 + rand() * 6.28) * amplitude;
    const noise = (rand() - 0.5) * noiseAmp;
    out.push(base * (1 + wave + noise));
  }
  return out;
}
