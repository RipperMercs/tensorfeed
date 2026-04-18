'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import Sparkline from './Sparkline';

export interface StatusGridService {
  id: string;
  name: string;
  status: 'ok' | 'warn' | 'down' | string;
  latency: number;
  lastCheck: string;
  spark: number[];
  href?: string;
}

interface StatusGridProps {
  services: StatusGridService[];
}

const COLOR_BY_STATUS: Record<string, string> = {
  ok: 'var(--accent-green)',
  warn: 'var(--accent-amber)',
  down: 'var(--accent-red)',
};

const PILL_BG: Record<string, string> = {
  ok: 'rgba(16,185,129,0.10)',
  warn: 'rgba(245,158,11,0.10)',
  down: 'rgba(239,68,68,0.12)',
};

function normalizeStatus(s: string): 'ok' | 'warn' | 'down' {
  const v = s.toLowerCase();
  if (v === 'operational' || v === 'ok') return 'ok';
  if (v === 'degraded' || v === 'warn' || v === 'partial') return 'warn';
  if (v === 'down' || v === 'outage' || v === 'major') return 'down';
  return 'ok';
}

export default function StatusGrid({ services }: StatusGridProps) {
  const [pulseIdx, setPulseIdx] = useState(-1);

  const safeServices = useMemo(() => services.slice(0, 12), [services]);

  useEffect(() => {
    if (safeServices.length === 0) return;
    let clearTimer: ReturnType<typeof setTimeout> | null = null;
    const t = setInterval(() => {
      const idx = Math.floor(Math.random() * safeServices.length);
      setPulseIdx(idx);
      if (clearTimer) clearTimeout(clearTimer);
      clearTimer = setTimeout(() => setPulseIdx(-1), 2500);
    }, 6000);
    return () => {
      clearInterval(t);
      if (clearTimer) clearTimeout(clearTimer);
    };
  }, [safeServices.length]);

  if (safeServices.length === 0) {
    return (
      <div
        className="rounded-lg border border-border p-6 text-sm font-mono"
        style={{ background: 'var(--bg-secondary)', color: 'var(--text-muted)' }}
      >
        Loading service status...
      </div>
    );
  }

  return (
    <div
      role="list"
      aria-label="AI service status grid"
      className="grid overflow-hidden rounded-lg border border-border"
      style={{
        gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: 1,
        background: 'var(--border)',
      }}
    >
      {safeServices.map((s, i) => {
        const status = normalizeStatus(s.status);
        const color = COLOR_BY_STATUS[status];
        const className = `tf-status-card relative block transition-colors ${pulseIdx === i ? 'changed' : ''}`;
        const cardStyle = {
          background: 'var(--bg-secondary)',
          padding: '16px 18px',
          textDecoration: 'none',
          color: 'inherit',
        } as const;
        const inner = (
          <>
            <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
              <div className="text-[13px] font-semibold" style={{ color: 'var(--text-primary)' }}>
                {s.name}
              </div>
              <div
                className="inline-flex items-center font-mono"
                style={{
                  fontSize: 9,
                  padding: '3px 6px 3px 5px',
                  borderRadius: 3,
                  letterSpacing: '0.12em',
                  fontWeight: 600,
                  gap: 5,
                  background: PILL_BG[status],
                  color,
                }}
              >
                <span
                  aria-hidden="true"
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: color,
                    boxShadow: status === 'ok' ? `0 0 6px ${color}` : undefined,
                  }}
                />
                {status.toUpperCase()}
              </div>
            </div>

            <div
              className="font-mono"
              style={{
                fontSize: 24,
                fontWeight: 500,
                color: 'var(--text-primary)',
                letterSpacing: '-0.02em',
                fontVariantNumeric: 'tabular-nums',
                marginBottom: 10,
              }}
            >
              {status === 'down' ? '\u2014' : s.latency}
              {status !== 'down' && (
                <span
                  style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 3, fontWeight: 400 }}
                >
                  ms
                </span>
              )}
            </div>

            <div
              style={{
                display: 'block',
                height: 28,
                margin: '8px -18px -2px',
                padding: '0 18px',
                overflow: 'hidden',
              }}
            >
              <Sparkline data={s.spark} color={color} gradientId={`spark-${s.id}`} />
            </div>

            <div
              className="flex items-center justify-between font-mono"
              style={{ marginTop: 10, fontSize: 10.5, color: 'var(--text-muted)' }}
            >
              <span>p95 last hour</span>
              <span>{s.lastCheck}</span>
            </div>
          </>
        );

        if (s.href) {
          return (
            <Link key={s.id} href={s.href} role="listitem" className={className} style={cardStyle}>
              {inner}
            </Link>
          );
        }
        return (
          <article key={s.id} role="listitem" className={className} style={cardStyle}>
            {inner}
          </article>
        );
      })}
    </div>
  );
}
