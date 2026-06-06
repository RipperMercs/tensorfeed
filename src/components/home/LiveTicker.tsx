'use client';

import { useEffect, useState } from 'react';
import type { TickerItem, TickerCls } from '@/lib/ticker-data';

interface FetchedService {
  name: string;
  status: string;
}

const STATUS_POLL_MS = 90_000;

// Short-name aliases so the ticker reads cleanly. Falls back to the
// service's own name if not listed here.
const TICKER_NAME: Record<string, string> = {
  'Claude API': 'CLAUDE',
  'ChatGPT / OpenAI API': 'CHATGPT',
  'OpenAI API': 'CHATGPT',
  'Google Gemini': 'GEMINI',
  'Gemini API': 'GEMINI',
  'AWS Bedrock': 'BEDROCK',
  'Azure OpenAI': 'AZURE',
  'Mistral Platform': 'MISTRAL',
  Mistral: 'MISTRAL',
  'GitHub Copilot': 'COPILOT',
  Perplexity: 'PERPLEXITY',
  Cohere: 'COHERE',
  HuggingFace: 'HUGGINGFACE',
  Replicate: 'REPLICATE',
  Midjourney: 'MIDJOURNEY',
  DeepSeek: 'DEEPSEEK',
  'Together AI': 'TOGETHER',
  'Fireworks AI': 'FIREWORKS',
  OpenRouter: 'OPENROUTER',
  ElevenLabs: 'ELEVENLABS',
  'Stability AI': 'STABILITY',
  Runway: 'RUNWAY',
  Luma: 'LUMA',
  'Luma AI': 'LUMA',
};

// The evergreen rows (model prices + benchmark leaders) are derived from
// data/pricing.json + data/benchmarks.json in the server layout and passed in
// as `evergreenItems`, so the numbers can never drift out of sync with the
// canonical data again. Status items are still fetched live below.

function statusToCls(status: string): TickerCls {
  const v = (status || '').toLowerCase();
  if (v === 'down' || v === 'major' || v === 'outage') return 'down';
  if (v === 'degraded' || v === 'partial' || v === 'warn') return 'warn';
  return 'up';
}

function statusToText(status: string): string {
  const v = (status || '').toLowerCase();
  if (v === 'down' || v === 'major' || v === 'outage') return 'DOWN';
  if (v === 'degraded' || v === 'partial' || v === 'warn') return 'DEGRADED';
  return 'OK';
}

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

function buildStatusItems(services: FetchedService[]): TickerItem[] {
  // Limit to a reasonable count so the ticker doesn't get cluttered.
  // Show degraded/down first (more important for users to see) then
  // a sample of operational services.
  const named = services.filter((s) => TICKER_NAME[s.name]);
  const bad = named.filter((s) => statusToCls(s.status) !== 'up');
  const okPool = named.filter((s) => statusToCls(s.status) === 'up').slice(0, 6);
  return [...bad, ...okPool].map((s) => ({
    kind: 'status' as const,
    tag: TICKER_NAME[s.name] ?? s.name.toUpperCase(),
    text: statusToText(s.status),
    cls: statusToCls(s.status),
  }));
}

export default function LiveTicker({ evergreenItems }: { evergreenItems: TickerItem[] }) {
  // Server render shows evergreen-only ticker. Client hydrates with
  // live status pulled from /api/status. This means SSR output is
  // honest (no fake status claims) and clients see live data within
  // a render tick after hydration.
  const [statusItems, setStatusItems] = useState<TickerItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    const fetchOnce = async () => {
      try {
        const res = await fetch('/api/status', { cache: 'no-store' });
        if (!res.ok) return;
        const data = (await res.json()) as { ok?: boolean; services?: FetchedService[] };
        if (!data.ok || !Array.isArray(data.services)) return;
        if (cancelled) return;
        setStatusItems(buildStatusItems(data.services));
      } catch {
        // Network blip; keep last-known items, don't replace with fake data.
      }
    };

    fetchOnce();
    const t = setInterval(fetchOnce, STATUS_POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(t);
    };
  }, []);

  // Interleave: status items (live), then evergreen, then status again
  // so the marquee sees both as it scrolls. If status fetch hasn't
  // completed yet, the ticker shows evergreen-only; never fake status.
  const items: TickerItem[] = [...statusItems, ...evergreenItems];
  const loop = items.length > 0 ? [...items, ...items] : evergreenItems;

  return (
    <section
      className="tf-ticker relative overflow-hidden border-b border-border bg-bg-secondary"
      role="region"
      aria-label="Live industry ticker"
      style={{ height: 44 }}
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
        className="absolute inset-y-0 left-0 z-[3] flex items-center gap-2 font-mono uppercase border-r border-border"
        style={{
          background: 'var(--bg-tertiary)',
          padding: '0 18px',
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: '0.12em',
          color: 'var(--text-secondary)',
        }}
      >
        <span
          className="tf-live-dot"
          aria-hidden="true"
          style={{
            width: 7,
            height: 7,
            borderRadius: '50%',
            background: 'var(--accent-green)',
            boxShadow: '0 0 8px var(--accent-green)',
          }}
        />
        LIVE
      </div>

      <div className="tf-ticker-track flex whitespace-nowrap" style={{ paddingLeft: 130 }}>
        {loop.map((item, i) => (
          <div
            key={i}
            className="inline-flex items-center gap-2.5 font-mono border-r border-border"
            style={{
              padding: '0 22px',
              fontSize: 13.5,
              color: 'var(--text-primary)',
              height: 44,
            }}
          >
            {item.kind === 'status' && item.cls && (
              <span
                aria-hidden="true"
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: DOT_COLOR[item.cls] ?? 'var(--accent-green)',
                  boxShadow:
                    item.cls === 'up' || item.cls === 'ok' ? '0 0 6px var(--accent-green)' : undefined,
                }}
              />
            )}
            <span
              style={{
                fontSize: 11.5,
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
              <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>{item.mono}</span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
