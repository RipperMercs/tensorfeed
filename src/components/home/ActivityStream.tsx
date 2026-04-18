'use client';

import { useEffect, useState } from 'react';

type EventKind = 'news' | 'status' | 'release' | 'agent' | 'benchmark';

interface ActivityEvent {
  time: string;
  kind: EventKind;
  type: string;
  msg: React.ReactNode;
}

const HL = (s: string) => (
  <span style={{ color: 'var(--accent-cyan)' }}>{s}</span>
);

const EVENTS: ActivityEvent[] = [
  { time: '14:32', kind: 'news', type: 'NEW ARTICLE', msg: <>New article from {HL('Anthropic Blog')}: Opus 4.7 benchmarks published</> },
  { time: '14:30', kind: 'status', type: 'LATENCY', msg: <>Gemini API {HL('latency spike')} detected, p95 at 312ms</> },
  { time: '14:28', kind: 'release', type: 'MODEL RELEASE', msg: <>Mistral published {HL('Mistral Medium 3')}</> },
  { time: '14:25', kind: 'agent', type: 'AGENT CRAWL', msg: <>ClaudeBot crawled {HL('/llms-full.txt')}</> },
  { time: '14:22', kind: 'benchmark', type: 'BENCHMARK', msg: <>MMLU-Pro leader updated: Opus 4.7 at {HL('88.4')}</> },
  { time: '14:18', kind: 'news', type: 'NEW ARTICLE', msg: <>Ars Technica: Blackwell Ultra B300 ships to first hyperscaler</> },
  { time: '14:14', kind: 'agent', type: 'AGENT CRAWL', msg: <>GPTBot pulled {HL('/feed.json')} (incremental)</> },
  { time: '14:11', kind: 'news', type: 'NEW ARTICLE', msg: <>HuggingFace leaderboard updated, Qwen3 takes #1</> },
];

const BULLET_COLORS: Record<EventKind, string> = {
  news: 'var(--accent-cyan)',
  status: 'var(--accent-amber)',
  release: 'var(--accent-secondary)',
  agent: 'var(--accent-green)',
  benchmark: 'var(--accent-primary)',
};

const BULLET_GLOW: Record<EventKind, boolean> = {
  news: true,
  status: false,
  release: true,
  agent: false,
  benchmark: false,
};

const KIND_COLORS: Record<EventKind, string> = {
  news: 'var(--accent-cyan)',
  status: 'var(--accent-amber)',
  release: 'var(--accent-secondary)',
  agent: 'var(--text-secondary)',
  benchmark: 'var(--accent-primary)',
};

export default function ActivityStream() {
  const [epm, setEpm] = useState(84);

  useEffect(() => {
    const t = setInterval(() => setEpm(70 + Math.floor(Math.random() * 32)), 2800);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      role="log"
      aria-live="polite"
      aria-label="Live activity stream"
      className="overflow-hidden"
      style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        borderRadius: 10,
      }}
    >
      <div
        className="flex items-center justify-between"
        style={{
          padding: '14px 20px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-tertiary)',
        }}
      >
        <div
          className="flex items-center font-mono uppercase"
          style={{
            gap: 10,
            fontSize: 11.5,
            color: 'var(--text-secondary)',
            letterSpacing: '0.1em',
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
          Right now on TensorFeed
        </div>
        <div className="font-mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{epm}</span>{' '}
          events/min &middot; last updated just now
        </div>
      </div>

      <div className="relative" style={{ padding: '6px 0', maxHeight: 360, overflow: 'hidden' }}>
        {EVENTS.map((ev, i) => (
          <div
            key={`${ev.time}-${i}`}
            className={`grid items-center font-mono ${i === 0 ? 'tf-activity-enter' : ''}`}
            style={{
              gridTemplateColumns: '14px 92px 110px 1fr',
              gap: 14,
              padding: '7px 20px',
              fontSize: 12,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: BULLET_COLORS[ev.kind],
                boxShadow: BULLET_GLOW[ev.kind] ? `0 0 6px ${BULLET_COLORS[ev.kind]}` : undefined,
              }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>{ev.time} UTC</span>
            <span
              className="uppercase"
              style={{
                fontSize: 10.5,
                letterSpacing: '0.1em',
                fontWeight: 600,
                color: KIND_COLORS[ev.kind],
              }}
            >
              {ev.type}
            </span>
            <span
              style={{
                color: 'var(--text-primary)',
                fontFamily: 'Inter, system-ui, sans-serif',
                fontSize: 13,
              }}
            >
              {ev.msg}
            </span>
          </div>
        ))}
        <div
          aria-hidden="true"
          className="absolute left-0 right-0 bottom-0 pointer-events-none"
          style={{
            height: 40,
            background: 'linear-gradient(to bottom, transparent, var(--bg-secondary))',
          }}
        />
      </div>
    </div>
  );
}
