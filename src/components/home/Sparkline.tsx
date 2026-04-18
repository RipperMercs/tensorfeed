interface SparklineProps {
  data: number[];
  color?: string;
  gradientId: string;
}

export default function Sparkline({ data, color = 'var(--accent-green)', gradientId }: SparklineProps) {
  const W = 200;
  const H = 28;
  const P = 2;

  if (data.length < 2) {
    return null;
  }

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
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={gradientId} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gradientId})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}
