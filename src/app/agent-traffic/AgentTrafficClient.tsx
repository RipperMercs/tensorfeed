'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Activity, ExternalLink } from 'lucide-react';

interface AgentHit {
  bot: string;
  endpoint: string;
  timestamp: string;
}

interface ActivityResponse {
  today_count: number;
  last_updated: string;
  recent: AgentHit[];
}

const BOT_META: Record<string, { color: string; vendor: string; about: string }> = {
  ClaudeBot: { color: '#d97757', vendor: 'Anthropic', about: 'Claude training and search crawler' },
  'anthropic-ai': { color: '#d97757', vendor: 'Anthropic', about: 'User-triggered Claude fetch' },
  GPTBot: { color: '#10a37f', vendor: 'OpenAI', about: 'OpenAI training crawler' },
  'ChatGPT-User': { color: '#10a37f', vendor: 'OpenAI', about: 'ChatGPT browse-tool fetch on behalf of a user' },
  'OAI-SearchBot': { color: '#10a37f', vendor: 'OpenAI', about: 'ChatGPT Search index crawler' },
  PerplexityBot: { color: '#20808d', vendor: 'Perplexity', about: 'Perplexity index + answer crawler' },
  'Google-Extended': { color: '#4285f4', vendor: 'Google', about: 'Gemini training opt-in crawler' },
  Googlebot: { color: '#4285f4', vendor: 'Google', about: 'Search index crawler' },
  Bingbot: { color: '#00809d', vendor: 'Microsoft', about: 'Bing + Copilot search crawler' },
  Applebot: { color: '#a2aaad', vendor: 'Apple', about: 'Apple Intelligence + Siri crawler' },
  DuckDuckBot: { color: '#de5833', vendor: 'DuckDuckGo', about: 'DuckDuckGo search crawler' },
  Bytespider: { color: '#000000', vendor: 'ByteDance', about: 'TikTok / Doubao crawler' },
  Amazonbot: { color: '#ff9900', vendor: 'Amazon', about: 'Alexa / Rufus crawler' },
  FacebookBot: { color: '#1877f2', vendor: 'Meta', about: 'Open Graph + AI crawler' },
  Twitterbot: { color: '#1da1f2', vendor: 'X', about: 'Card preview fetch' },
  'cohere-ai': { color: '#39594d', vendor: 'Cohere', about: 'Cohere training crawler' },
  YouBot: { color: '#7c3aed', vendor: 'You.com', about: 'You.com search crawler' },
  Scrapy: { color: '#60a5fa', vendor: 'Generic', about: 'Python Scrapy framework' },
  'python-requests': { color: '#60a5fa', vendor: 'Generic', about: 'Raw Python requests, often agent code' },
  axios: { color: '#60a5fa', vendor: 'Generic', about: 'Node axios HTTP client' },
  'node-fetch': { color: '#60a5fa', vendor: 'Generic', about: 'Node fetch HTTP client' },
  Timely: { color: '#a78bfa', vendor: 'Unknown', about: 'Timely scheduler bot' },
};

function metaFor(bot: string) {
  return (
    BOT_META[bot] || {
      color: 'var(--accent-primary)',
      vendor: 'Unknown',
      about: 'Unrecognized user agent that matched a generic bot/crawler/spider/agent pattern',
    }
  );
}

function timeAgo(timestamp: string): string {
  const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
  if (seconds < 60) return `${Math.max(seconds, 1)}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86_400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86_400)}d ago`;
}

export default function AgentTrafficClient() {
  const [data, setData] = useState<ActivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshedAt, setRefreshedAt] = useState<number>(Date.now());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/agents/activity', { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = (await res.json()) as ActivityResponse;
        setData(json);
        setError(null);
        setRefreshedAt(Date.now());
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to load');
      }
    }
    load();
    const id = setInterval(load, 30_000);
    return () => clearInterval(id);
  }, []);

  const breakdown = useMemo(() => {
    if (!data) return [] as { bot: string; count: number }[];
    const tally = new Map<string, number>();
    for (const hit of data.recent) {
      tally.set(hit.bot, (tally.get(hit.bot) || 0) + 1);
    }
    return Array.from(tally.entries())
      .map(([bot, count]) => ({ bot, count }))
      .sort((a, b) => b.count - a.count);
  }, [data]);

  const endpointBreakdown = useMemo(() => {
    if (!data) return [] as { endpoint: string; count: number }[];
    const tally = new Map<string, number>();
    for (const hit of data.recent) {
      tally.set(hit.endpoint, (tally.get(hit.endpoint) || 0) + 1);
    }
    return Array.from(tally.entries())
      .map(([endpoint, count]) => ({ endpoint, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <StatCard
          label="Today"
          value={data ? data.today_count.toLocaleString() : '-'}
          hint="bot requests since 00:00 UTC"
        />
        <StatCard
          label="Recent buffer"
          value={data ? data.recent.length.toLocaleString() : '-'}
          hint="last 50 hits we kept"
        />
        <StatCard
          label="Distinct bots seen"
          value={data ? breakdown.length.toLocaleString() : '-'}
          hint="across the recent buffer"
        />
      </div>

      <div className="flex items-center gap-2 text-text-muted text-xs">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-accent-green" />
        </span>
        <span>
          Live from <code className="font-mono">/api/agents/activity</code>, refreshed every 30s.
          {data && ` Last refresh: ${timeAgo(new Date(refreshedAt).toISOString())}.`}
        </span>
        {error && <span className="text-accent-red">({error})</span>}
      </div>

      <section>
        <h2 className="text-text-primary font-semibold text-lg mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-accent-primary" />
          Bot breakdown (recent 50)
        </h2>
        {breakdown.length === 0 ? (
          <p className="text-text-muted text-sm">No bot hits in the recent buffer yet.</p>
        ) : (
          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            {breakdown.map((row, idx) => {
              const meta = metaFor(row.bot);
              const pct = (row.count / Math.max(data?.recent.length || 1, 1)) * 100;
              return (
                <div
                  key={row.bot}
                  className={`flex items-center gap-3 px-4 py-3 ${
                    idx > 0 ? 'border-t border-border' : ''
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ background: meta.color }}
                    aria-hidden
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <span className="text-text-primary font-mono text-sm truncate">{row.bot}</span>
                      <span className="text-text-muted text-xs font-mono flex-shrink-0">
                        {row.count} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="text-text-muted text-xs flex items-center gap-2">
                      <span className="text-text-secondary">{meta.vendor}</span>
                      <span>·</span>
                      <span className="truncate">{meta.about}</span>
                    </div>
                    <div className="mt-2 h-1 rounded-full bg-bg-tertiary overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, background: meta.color }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-text-primary font-semibold text-lg mb-3">Top endpoints hit</h2>
        {endpointBreakdown.length === 0 ? (
          <p className="text-text-muted text-sm">No endpoint hits yet.</p>
        ) : (
          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            {endpointBreakdown.map((row, idx) => (
              <div
                key={row.endpoint}
                className={`flex items-center justify-between gap-3 px-4 py-2.5 ${
                  idx > 0 ? 'border-t border-border' : ''
                }`}
              >
                <code className="font-mono text-xs text-text-primary truncate">{row.endpoint}</code>
                <span className="text-text-muted text-xs font-mono flex-shrink-0">{row.count}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-text-primary font-semibold text-lg mb-3">Live tail</h2>
        {!data || data.recent.length === 0 ? (
          <p className="text-text-muted text-sm">Waiting for the next bot hit.</p>
        ) : (
          <div className="bg-bg-secondary border border-border rounded-xl divide-y divide-border">
            {data.recent.slice(0, 20).map((hit, i) => {
              const meta = metaFor(hit.bot);
              return (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 text-xs">
                  <span
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ background: meta.color }}
                    aria-hidden
                  />
                  <span className="font-mono text-text-primary w-32 sm:w-40 truncate flex-shrink-0">
                    {hit.bot}
                  </span>
                  <code className="font-mono text-text-secondary flex-1 truncate">{hit.endpoint}</code>
                  <span className="text-text-muted font-mono flex-shrink-0">
                    {timeAgo(hit.timestamp)}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <p className="text-text-muted text-xs mt-3">
          We keep the most recent 50 bot hits in a rolling buffer plus a daily counter (resets at
          00:00 UTC). Coverage spans both the API/feed surface (via the Cloudflare Worker) and
          every static editorial / SEO route (via a Pages Functions middleware that pings the
          Worker on detection). Daily totals are also captured into the public history snapshot
          at{' '}
          <Link href="/api/history" className="text-accent-primary hover:underline">
            /api/history
          </Link>{' '}
          so multi-day trends become readable as the archive accumulates.
        </p>
      </section>

      <section>
        <h2 className="text-text-primary font-semibold text-lg mb-3">Pull this data yourself</h2>
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <pre className="text-xs overflow-x-auto"><code className="text-text-primary font-mono">{`curl -s https://tensorfeed.ai/api/agents/activity | jq

# or via the SDKs:
# Python:    tf.agents_activity()        (pip install tensorfeed)
# TypeScript: client.agents.activity()   (npm install tensorfeed)
# MCP:       no separate tool yet, /api/agents/activity is free + unauthenticated`}</code></pre>
          <Link
            href="/api-reference"
            className="text-accent-primary hover:underline text-sm inline-flex items-center gap-1 mt-3"
          >
            Browse the full API reference <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-4">
      <div className="text-text-muted text-xs uppercase tracking-wide mb-1">{label}</div>
      <div className="text-text-primary text-3xl font-mono font-semibold mb-1">{value}</div>
      <div className="text-text-muted text-xs">{hint}</div>
    </div>
  );
}
