'use client';

import { useEffect, useMemo, useState } from 'react';

/**
 * Embeddable status widget UI. Polls /api/status/summary every 60s,
 * groups services by provider, renders tab strip + active-provider
 * detail panel. Tap-friendly on mobile, fits cleanly in a 420x320 iframe.
 */

type RawStatus = 'operational' | 'degraded' | 'down' | 'unknown' | string;
type NormalizedStatus = 'ok' | 'warn' | 'down' | 'unknown';

interface RawService {
  name: string;
  provider?: string;
  status: RawStatus;
  lastChecked?: string;
}

interface ProviderGroup {
  provider: string;
  services: RawService[];
  worst: NormalizedStatus;
  operationalCount: number;
  degradedCount: number;
  downCount: number;
}

function normalize(s: RawStatus): NormalizedStatus {
  const v = (s || '').toString().toLowerCase();
  if (v === 'down' || v === 'outage' || v === 'major') return 'down';
  if (v === 'degraded' || v === 'partial' || v === 'warn') return 'warn';
  if (v === 'operational' || v === 'ok') return 'ok';
  return 'unknown';
}

function worstOf(group: NormalizedStatus[]): NormalizedStatus {
  if (group.includes('down')) return 'down';
  if (group.includes('warn')) return 'warn';
  if (group.every((s) => s === 'unknown')) return 'unknown';
  return 'ok';
}

const STATUS_LABEL: Record<NormalizedStatus, string> = {
  ok: 'OPERATIONAL',
  warn: 'DEGRADED',
  down: 'OUTAGE',
  unknown: 'UNKNOWN',
};

const STATUS_HEX: Record<NormalizedStatus, string> = {
  ok: '#10b981',
  warn: '#f59e0b',
  down: '#ef4444',
  unknown: '#6b7280',
};

const PRIORITY_ORDER = [
  'Anthropic',
  'OpenAI',
  'Google',
  'xAI',
  'Mistral',
  'Cohere',
  'Meta AI',
  'Perplexity',
  'Hugging Face',
  'Microsoft',
];

function providerPriority(name: string): number {
  const idx = PRIORITY_ORDER.findIndex((p) => name.toLowerCase().includes(p.toLowerCase()));
  return idx === -1 ? PRIORITY_ORDER.length : idx;
}

function groupByProvider(services: RawService[]): ProviderGroup[] {
  const map = new Map<string, RawService[]>();
  for (const s of services) {
    const p = s.provider || s.name.split(' ')[0] || 'Unknown';
    const existing = map.get(p) ?? [];
    existing.push(s);
    map.set(p, existing);
  }
  const groups: ProviderGroup[] = [];
  Array.from(map.entries()).forEach(([provider, list]: [string, RawService[]]) => {
    const normalized: NormalizedStatus[] = list.map((s: RawService) => normalize(s.status));
    groups.push({
      provider,
      services: list,
      worst: worstOf(normalized),
      operationalCount: normalized.filter((n: NormalizedStatus) => n === 'ok').length,
      degradedCount: normalized.filter((n: NormalizedStatus) => n === 'warn').length,
      downCount: normalized.filter((n: NormalizedStatus) => n === 'down').length,
    });
  });
  groups.sort((a, b) => providerPriority(a.provider) - providerPriority(b.provider));
  return groups;
}

const POLL_MS = 60_000;
const API_URL = 'https://tensorfeed.ai/api/status/summary';

export default function StatusWidget() {
  const [services, setServices] = useState<RawService[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function poll() {
      try {
        const res = await fetch(API_URL, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (cancelled) return;
        if (Array.isArray(data.services)) {
          setServices(data.services);
          setError(null);
          setLastUpdated(new Date().toISOString());
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'fetch failed');
      }
    }
    poll();
    const interval = setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const groups = useMemo(() => (services ? groupByProvider(services) : []), [services]);
  const activeGroup = groups[activeTab];

  return (
    <div
      style={{
        background: '#0a0a0f',
        color: '#e5e7eb',
        fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, monospace',
        minHeight: '100vh',
        padding: '12px 14px',
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        fontSize: 12,
        letterSpacing: '0.02em',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #1f2937',
          paddingBottom: 6,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: services ? STATUS_HEX[worstOf(groups.map((g) => g.worst))] : STATUS_HEX.unknown,
              boxShadow: `0 0 6px ${services ? STATUS_HEX[worstOf(groups.map((g) => g.worst))] : STATUS_HEX.unknown}`,
            }}
          />
          <span style={{ fontWeight: 600, fontSize: 11, color: '#9ca3af', textTransform: 'uppercase' }}>
            AI Provider Status
          </span>
        </div>
        <a
          href="https://tensorfeed.ai/?utm_source=widget&utm_medium=embed&utm_campaign=status"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#6b7280', fontSize: 10, textDecoration: 'none' }}
        >
          tensorfeed.ai
        </a>
      </div>

      {error && !services && (
        <div style={{ color: '#ef4444', fontSize: 11 }}>Status feed unavailable. Retrying.</div>
      )}

      {!services && !error && (
        <div style={{ color: '#6b7280', fontSize: 11 }}>Loading provider status.</div>
      )}

      {groups.length > 0 && (
        <>
          <div
            style={{
              display: 'flex',
              gap: 2,
              overflowX: 'auto',
              borderBottom: '1px solid #1f2937',
              scrollbarWidth: 'thin',
            }}
          >
            {groups.map((g, i) => {
              const isActive = i === activeTab;
              return (
                <button
                  key={g.provider}
                  onClick={() => setActiveTab(i)}
                  style={{
                    background: isActive ? '#111827' : 'transparent',
                    color: isActive ? '#e5e7eb' : '#9ca3af',
                    border: 'none',
                    borderBottom: isActive ? `2px solid ${STATUS_HEX[g.worst]}` : '2px solid transparent',
                    padding: '6px 10px',
                    cursor: 'pointer',
                    fontSize: 11,
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                  }}
                  aria-label={`Show status for ${g.provider}`}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      background: STATUS_HEX[g.worst],
                      boxShadow: g.worst !== 'ok' ? `0 0 4px ${STATUS_HEX[g.worst]}` : 'none',
                    }}
                  />
                  {g.provider}
                </button>
              );
            })}
          </div>

          {activeGroup && (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, overflow: 'auto' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  paddingTop: 2,
                }}
              >
                <span style={{ fontWeight: 600, color: '#e5e7eb' }}>{activeGroup.provider}</span>
                <span style={{ color: STATUS_HEX[activeGroup.worst], fontSize: 10, fontWeight: 600 }}>
                  {STATUS_LABEL[activeGroup.worst]}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {activeGroup.services.map((s, i) => {
                  const n = normalize(s.status);
                  return (
                    <div
                      key={`${activeGroup.provider}-${i}-${s.name}`}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '4px 8px',
                        background: '#0d1117',
                        border: '1px solid #1f2937',
                        borderLeft: `2px solid ${STATUS_HEX[n]}`,
                        fontSize: 11,
                      }}
                    >
                      <span style={{ color: '#d1d5db', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {s.name}
                      </span>
                      <span style={{ color: STATUS_HEX[n], fontSize: 9, fontWeight: 600, letterSpacing: '0.05em' }}>
                        {STATUS_LABEL[n]}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      <div
        style={{
          borderTop: '1px solid #1f2937',
          paddingTop: 4,
          display: 'flex',
          justifyContent: 'space-between',
          fontSize: 9,
          color: '#6b7280',
        }}
      >
        <span>
          {lastUpdated ? `Updated ${formatTimeAgo(lastUpdated)} ago` : ' '}
        </span>
        <a
          href="https://tensorfeed.ai/widget/status?utm_source=widget&utm_medium=embed_footer&utm_campaign=status"
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: '#6b7280', textDecoration: 'none' }}
        >
          Powered by TensorFeed
        </a>
      </div>
    </div>
  );
}

function formatTimeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m`;
  return `${Math.floor(ms / 3_600_000)}h`;
}
