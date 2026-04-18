type TickerKind = 'news' | 'status' | 'price' | 'benchmark' | 'release';
type TickerCls = 'up' | 'down' | 'warn' | 'info' | 'ok';

interface TickerItem {
  kind: TickerKind;
  tag: string;
  text: string;
  mono?: string;
  cls?: TickerCls;
}

const ITEMS: TickerItem[] = [
  { kind: 'news', tag: 'ANTHROPIC', text: 'Opus 4.7 benchmarks published', mono: '2m ago' },
  { kind: 'status', tag: 'CLAUDE', text: 'OK', mono: '142ms', cls: 'up' },
  { kind: 'price', tag: 'OPUS 4.7', text: '$15 / $75', mono: 'per Mtok' },
  { kind: 'status', tag: 'CHATGPT', text: 'OK', mono: '89ms', cls: 'up' },
  { kind: 'news', tag: 'HACKERNEWS', text: 'Why has not AI improved design quality the way it improved dev speed?', mono: '14m ago' },
  { kind: 'benchmark', tag: 'MMLU-PRO', text: 'leader Opus 4.7', mono: '88.4', cls: 'info' },
  { kind: 'status', tag: 'GEMINI', text: 'DEGRADED', mono: '312ms', cls: 'warn' },
  { kind: 'release', tag: 'MISTRAL', text: 'Mistral Medium 3 released', mono: '6m ago' },
  { kind: 'price', tag: 'GPT-4o', text: '$5 / $15', mono: 'per Mtok' },
  { kind: 'news', tag: 'ARXIV', text: 'Compositional reasoning in LRMs', mono: '22m ago' },
  { kind: 'status', tag: 'BEDROCK', text: 'OK', mono: '178ms', cls: 'up' },
  { kind: 'price', tag: 'GEMINI 2.5', text: '$3.50 / $10.50', mono: 'per Mtok' },
  { kind: 'news', tag: 'THE VERGE', text: 'Frontier Model Forum expansion announced', mono: '38m ago' },
  { kind: 'benchmark', tag: 'SWE-BENCH', text: 'leader Claude Opus 4.7', mono: '72.1%', cls: 'info' },
  { kind: 'status', tag: 'MISTRAL', text: 'OK', mono: '104ms', cls: 'up' },
];

const VAL_COLOR: Record<TickerCls, string> = {
  up: 'var(--accent-green)',
  down: 'var(--accent-red)',
  warn: 'var(--accent-amber)',
  info: 'var(--accent-cyan)',
  ok: 'var(--accent-green)',
};

const DOT_COLOR: Record<string, string> = {
  warn: 'var(--accent-amber)',
  down: 'var(--accent-red)',
  ok: 'var(--accent-green)',
  up: 'var(--accent-green)',
};

export default function LiveTicker() {
  const loop = [...ITEMS, ...ITEMS];

  return (
    <section
      className="tf-ticker relative overflow-hidden border-b border-border bg-bg-secondary"
      role="region"
      aria-label="Live industry ticker"
      style={{ height: 34 }}
    >
      <div
        className="absolute inset-y-0 left-0 z-[2] pointer-events-none"
        style={{ width: 80, background: 'linear-gradient(90deg, var(--bg-secondary), transparent)' }}
        aria-hidden="true"
      />
      <div
        className="absolute inset-y-0 right-0 z-[2] pointer-events-none"
        style={{ width: 80, background: 'linear-gradient(270deg, var(--bg-secondary), transparent)' }}
        aria-hidden="true"
      />

      <div
        className="absolute inset-y-0 left-0 z-[3] flex items-center gap-1.5 font-mono uppercase border-r border-border"
        style={{
          background: 'var(--bg-tertiary)',
          padding: '0 14px',
          fontSize: 10.5,
          fontWeight: 600,
          letterSpacing: '0.12em',
          color: 'var(--text-secondary)',
        }}
      >
        <span
          className="tf-live-dot"
          aria-hidden="true"
          style={{
            width: 6,
            height: 6,
            borderRadius: '50%',
            background: 'var(--accent-green)',
            boxShadow: '0 0 8px var(--accent-green)',
          }}
        />
        LIVE
      </div>

      <div
        className="tf-ticker-track flex whitespace-nowrap"
        style={{ paddingLeft: 110 }}
      >
        {loop.map((item, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-2 font-mono border-r border-border"
            style={{
              padding: '0 18px',
              fontSize: 12,
              color: 'var(--text-primary)',
              height: 34,
            }}
          >
            {item.kind === 'status' && item.cls && (
              <span
                aria-hidden="true"
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  background: DOT_COLOR[item.cls] ?? 'var(--accent-green)',
                  boxShadow: item.cls === 'up' || item.cls === 'ok' ? '0 0 6px var(--accent-green)' : undefined,
                }}
              />
            )}
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.1em',
                color: 'var(--text-muted)',
                textTransform: 'uppercase',
              }}
            >
              {item.tag}
            </span>
            <span
              style={{
                color: item.cls ? VAL_COLOR[item.cls] : 'var(--text-primary)',
                fontWeight: 500,
              }}
            >
              {item.text}
            </span>
            {item.mono && (
              <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{item.mono}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
