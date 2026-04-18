interface Release {
  d: number;
  score: number;
  label: string;
  big?: boolean;
  provider: 'anthropic' | 'openai' | 'google' | 'meta' | 'huggingface';
}

const RELEASES: Release[] = [
  { d: 2, score: 88.4, label: 'Opus 4.7', big: true, provider: 'anthropic' },
  { d: 4, score: 72.1, label: 'GPT-4o', provider: 'openai' },
  { d: 5, score: 81.2, label: 'Gemini 2.5 Ultra', big: true, provider: 'google' },
  { d: 7, score: 68.0, label: 'Llama 4 Maverick', provider: 'meta' },
  { d: 9, score: 74.5, label: 'Mistral Medium 3', provider: 'meta' },
  { d: 11, score: 70.2, label: 'Qwen3 72B', provider: 'huggingface' },
  { d: 13, score: 62.1, label: 'Cohere Command R+', provider: 'openai' },
  { d: 15, score: 65.3, label: 'Claude Haiku 4.5', provider: 'anthropic' },
  { d: 18, score: 58.9, label: 'Phi-4', provider: 'openai' },
  { d: 20, score: 77.0, label: 'Gemini 2.5 Flash', provider: 'google' },
  { d: 22, score: 55.7, label: 'DeepSeek v3', provider: 'meta' },
  { d: 24, score: 81.8, label: 'GPT-5 preview', big: true, provider: 'openai' },
  { d: 26, score: 69.0, label: 'Jamba 1.5', provider: 'huggingface' },
  { d: 28, score: 73.4, label: 'Claude Sonnet 4.7', provider: 'anthropic' },
];

const SRC_COLOR: Record<Release['provider'], string> = {
  anthropic: 'var(--src-anthropic)',
  openai: 'var(--src-openai)',
  google: 'var(--src-google)',
  meta: 'var(--src-meta)',
  huggingface: 'var(--src-huggingface)',
};

const W = 1600;
const H = 560;
const PAD_L = 80;
const PAD_R = 40;
const PAD_T = 60;
const PAD_B = 80;
const X_MIN = 0;
const X_MAX = 30;
const Y_MIN = 50;
const Y_MAX = 92;

const X = (d: number) => PAD_L + ((d - X_MIN) / (X_MAX - X_MIN)) * (W - PAD_L - PAD_R);
const Y = (s: number) => H - PAD_B - ((s - Y_MIN) / (Y_MAX - Y_MIN)) * (H - PAD_T - PAD_B);

const LABEL_STYLE = {
  fontFamily: 'var(--font-mono, "JetBrains Mono", monospace)',
  fontSize: 9,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
};

export default function Constellation() {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      style={{ width: '100%', height: '100%', display: 'block' }}
    >
      <defs>
        <radialGradient id="tf-const-fade" cx="50%" cy="50%" r="60%">
          <stop offset="0%" stopColor="#fff" stopOpacity="1" />
          <stop offset="100%" stopColor="#fff" stopOpacity="0.2" />
        </radialGradient>
        <mask id="tf-const-mask">
          <rect width={W} height={H} fill="url(#tf-const-fade)" />
        </mask>
      </defs>
      <g mask="url(#tf-const-mask)">
        <line x1={PAD_L} y1={H - PAD_B} x2={W - PAD_R} y2={H - PAD_B} stroke="var(--border)" />
        <line x1={PAD_L} y1={PAD_T} x2={PAD_L} y2={H - PAD_B} stroke="var(--border)" />

        {[60, 70, 80, 90].map((v) => (
          <g key={`y-${v}`}>
            <line
              x1={PAD_L}
              y1={Y(v)}
              x2={W - PAD_R}
              y2={Y(v)}
              stroke="var(--border)"
              strokeOpacity="0.18"
              strokeDasharray="2 4"
            />
            <text x={PAD_L - 12} y={Y(v) + 3} textAnchor="end" fill="var(--text-muted)" style={LABEL_STYLE}>
              {v}
            </text>
          </g>
        ))}
        {[0, 7, 14, 21, 28].map((v) => (
          <text
            key={`x-${v}`}
            x={X(v)}
            y={H - PAD_B + 18}
            textAnchor="middle"
            fill="var(--text-muted)"
            style={LABEL_STYLE}
          >
            {v === 0 ? 'today' : `${v}d`}
          </text>
        ))}
        <text
          x={PAD_L - 12}
          y={PAD_T - 14}
          textAnchor="end"
          fill="var(--text-muted)"
          style={LABEL_STYLE}
        >
          SCORE
        </text>
        <text
          x={W - PAD_R}
          y={H - PAD_B + 36}
          textAnchor="end"
          fill="var(--text-muted)"
          style={LABEL_STYLE}
        >
          DAYS AGO, 30-day window
        </text>

        {RELEASES.map((r, i) => {
          const cx = X(r.d);
          const cy = Y(r.score);
          const color = SRC_COLOR[r.provider];
          return (
            <g key={`r-${i}`}>
              <circle cx={cx} cy={cy} r={r.big ? 14 : 6} fill={color} opacity={0.12} />
              <circle
                cx={cx}
                cy={cy}
                r={r.big ? 5.5 : 3.5}
                fill={color}
                style={r.big ? { filter: `drop-shadow(0 0 8px ${color})` } : undefined}
              />
              {r.big && (
                <text x={cx + 10} y={cy - 8} fill="var(--text-secondary)" style={LABEL_STYLE}>
                  {r.label}
                </text>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
