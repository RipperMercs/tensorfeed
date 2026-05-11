'use client';

import { useEffect, useState } from 'react';
import { ArrowRight, CheckCircle2, AlertCircle, Globe, ExternalLink } from 'lucide-react';

interface AcceptsSummary {
  scheme: string;
  network: string;
  asset_symbol: string;
  count: number;
}

interface RegistryEntry {
  domain: string;
  manifest_url: string;
  fetched_at: string;
  status: string;
  http_status?: number;
  error?: string;
  federation_member: boolean;
  x402_version?: number;
  publisher_name?: string;
  publisher_description?: string;
  publisher_url?: string;
  docs_url?: string;
  llms_txt_url?: string;
  agent_fair_trade_declared?: boolean;
  paid_endpoints_count?: number;
  free_endpoints_count?: number;
  payment_wallet?: string;
  payment_asset_symbol?: string;
  accepts_summary?: AcceptsSummary[];
}

interface SnapshotData {
  ok: boolean;
  fetched_at?: string;
  total?: number;
  ok_count?: number;
  error_count?: number;
  federation_count?: number;
  by_network?: Record<string, number>;
  entries?: RegistryEntry[];
  error?: string;
  hint?: string;
}

const PRETTY_NETWORK: Record<string, string> = {
  'eip155:8453': 'Base mainnet',
  'eip155:1': 'Ethereum mainnet',
  'eip155:84532': 'Base Sepolia',
};

function networkLabel(network: string): string {
  return PRETTY_NETWORK[network] || network;
}

function statusBadge(status: string) {
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-mono text-emerald-400">
        <CheckCircle2 className="w-3.5 h-3.5" />
        live
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-mono text-amber-400">
      <AlertCircle className="w-3.5 h-3.5" />
      {status}
    </span>
  );
}

export default function RegistryTable() {
  const [data, setData] = useState<SnapshotData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = () => {
      fetch('https://tensorfeed.ai/api/x402-registry/snapshot')
        .then((res) => res.json())
        .then((json: SnapshotData) => setData(json))
        .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'));
    };
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  if (error) {
    return (
      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-muted">
        Live registry snapshot unavailable. Check{' '}
        <a
          href="https://tensorfeed.ai/api/x402-registry/snapshot"
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent-primary hover:underline"
        >
          /api/x402-registry/snapshot
        </a>{' '}
        directly.
      </div>
    );
  }

  if (!data) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="bg-bg-secondary border border-border rounded-lg p-5 animate-pulse h-32" />
        ))}
      </div>
    );
  }

  if (!data.ok) {
    return (
      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-muted">
        {data.error === 'registry_not_yet_populated'
          ? 'Daily crawl has not run yet. First snapshot lands at 02:15 UTC.'
          : `Registry unavailable: ${data.error}`}
      </div>
    );
  }

  const entries = data.entries || [];
  const fmt = (n: number) => n.toLocaleString('en-US');

  return (
    <div className="space-y-5">
      <div className="text-xs text-text-muted font-mono">
        snapshot {data.fetched_at && new Date(data.fetched_at).toUTCString()} &middot; live data, refreshed every minute on this page
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="bg-bg-secondary border border-border rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-1">Total tracked</div>
          <div className="text-2xl font-bold text-text-primary font-mono">{fmt(data.total || 0)}</div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-1">Live</div>
          <div className="text-2xl font-bold text-emerald-400 font-mono">{fmt(data.ok_count || 0)}</div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-1">AFTA federation</div>
          <div className="text-2xl font-bold text-text-primary font-mono">{fmt(data.federation_count || 0)}</div>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg p-4">
          <div className="text-xs uppercase tracking-wider text-text-muted mb-1">Networks</div>
          <div className="text-2xl font-bold text-text-primary font-mono">
            {Object.keys(data.by_network || {}).length}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {entries.map((e) => (
          <article key={e.domain} className="bg-bg-secondary border border-border rounded-lg p-5">
            <header className="flex items-start justify-between gap-4 mb-3 flex-wrap">
              <div>
                <h3 className="text-lg font-semibold text-text-primary flex items-center gap-2">
                  <Globe className="w-4 h-4 text-text-muted" />
                  <a
                    href={`https://${e.domain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-accent-primary"
                  >
                    {e.domain}
                  </a>
                </h3>
                {e.publisher_name && e.publisher_name !== e.domain && (
                  <div className="text-sm text-text-secondary mt-0.5">{e.publisher_name}</div>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs">
                {statusBadge(e.status)}
                {e.federation_member && (
                  <span className="inline-flex items-center gap-1 text-xs font-mono text-accent-primary border border-accent-primary/40 rounded px-1.5 py-0.5">
                    AFTA federation
                  </span>
                )}
                {e.agent_fair_trade_declared && (
                  <span className="inline-flex items-center gap-1 text-xs font-mono text-text-muted border border-border rounded px-1.5 py-0.5">
                    AFTA declared
                  </span>
                )}
              </div>
            </header>

            {e.publisher_description && (
              <p className="text-sm text-text-secondary mb-3 leading-relaxed">{e.publisher_description}</p>
            )}

            {e.status === 'ok' && (
              <div className="grid gap-3 sm:grid-cols-3 text-sm">
                <div>
                  <div className="text-xs uppercase tracking-wider text-text-muted mb-1">x402 version</div>
                  <div className="font-mono text-text-primary">v{e.x402_version}</div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-text-muted mb-1">Endpoints</div>
                  <div className="font-mono text-text-primary">
                    {fmt(e.paid_endpoints_count || 0)} paid &middot; {fmt(e.free_endpoints_count || 0)} free
                  </div>
                </div>
                <div>
                  <div className="text-xs uppercase tracking-wider text-text-muted mb-1">Accepts</div>
                  <div className="font-mono text-text-primary">
                    {e.accepts_summary && e.accepts_summary.length > 0
                      ? e.accepts_summary.map((a) => `${a.asset_symbol} on ${networkLabel(a.network)}`).join(', ')
                      : 'none'}
                  </div>
                </div>
              </div>
            )}

            {e.status !== 'ok' && (
              <div className="text-sm text-text-muted">
                Manifest not currently retrievable
                {e.http_status ? ` (HTTP ${e.http_status})` : ''}
                {e.error ? `: ${e.error}` : ''}.
              </div>
            )}

            <footer className="mt-4 pt-3 border-t border-border flex items-center gap-4 flex-wrap text-xs">
              <a
                href={e.manifest_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-text-muted hover:text-accent-primary font-mono"
              >
                /.well-known/x402
                <ExternalLink className="w-3 h-3" />
              </a>
              {e.docs_url && (
                <a
                  href={e.docs_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-text-muted hover:text-accent-primary"
                >
                  Docs
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {e.llms_txt_url && (
                <a
                  href={e.llms_txt_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-text-muted hover:text-accent-primary"
                >
                  llms.txt
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
              {e.payment_wallet && (
                <span className="font-mono text-text-muted">
                  {e.payment_wallet.slice(0, 6)}&hellip;{e.payment_wallet.slice(-4)}
                </span>
              )}
            </footer>
          </article>
        ))}
      </div>

      <a
        href="https://tensorfeed.ai/api/x402-registry/snapshot"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 text-sm text-accent-primary hover:underline group"
      >
        Full snapshot JSON
        <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
      </a>
    </div>
  );
}
