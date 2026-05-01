'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Terminal, Play, Copy, Check, AlertCircle } from 'lucide-react';
import { API_REFERENCE, ApiRefMeta } from '@/lib/api-reference-directory';

const FREE_ENDPOINTS: ApiRefMeta[] = API_REFERENCE.filter(e => e.tier === 'free' && e.method === 'GET');

const CATEGORY_ORDER: { key: string; label: string }[] = [
  { key: 'news', label: 'News' },
  { key: 'status', label: 'Status' },
  { key: 'models', label: 'Models & Benchmarks' },
  { key: 'routing', label: 'Routing' },
  { key: 'history', label: 'History' },
  { key: 'agents', label: 'Agents' },
  { key: 'agent-brief', label: 'Agent Brief' },
];

function buildUrl(endpoint: ApiRefMeta, values: Record<string, string>): string {
  let path = endpoint.path;
  const query: string[] = [];
  for (const p of endpoint.params) {
    const v = values[p.name];
    if (!v || v.trim() === '') continue;
    if (p.in === 'path') {
      path = path.replace(`{${p.name}}`, encodeURIComponent(v.trim()));
    } else if (p.in === 'query') {
      query.push(`${encodeURIComponent(p.name)}=${encodeURIComponent(v.trim())}`);
    }
  }
  // For path params with no value, leave the placeholder so the user sees the error
  return `https://tensorfeed.ai${path}${query.length ? `?${query.join('&')}` : ''}`;
}

function buildCurl(url: string): string {
  return `curl -s '${url}'`;
}

export default function PlaygroundPage() {
  const [activeSlug, setActiveSlug] = useState<string>(FREE_ENDPOINTS[0]?.slug || '');
  const [paramValues, setParamValues] = useState<Record<string, Record<string, string>>>({});
  const [response, setResponse] = useState<{ status: number; ms: number; body: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<'url' | 'curl' | 'body' | null>(null);

  const grouped = useMemo(() => {
    const buckets: Record<string, ApiRefMeta[]> = {};
    for (const e of FREE_ENDPOINTS) {
      const key = e.category;
      if (!buckets[key]) buckets[key] = [];
      buckets[key].push(e);
    }
    return buckets;
  }, []);

  const active = FREE_ENDPOINTS.find(e => e.slug === activeSlug);
  const values = paramValues[activeSlug] || {};
  const url = active ? buildUrl(active, values) : '';
  const curl = buildCurl(url);

  function setParamValue(slug: string, name: string, value: string) {
    setParamValues(prev => ({
      ...prev,
      [slug]: { ...(prev[slug] || {}), [name]: value },
    }));
  }

  async function runQuery() {
    if (!active) return;
    setLoading(true);
    setError(null);
    setResponse(null);
    const t0 = performance.now();
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'TensorFeedPlayground/1.0' } });
      const text = await res.text();
      const ms = Math.round(performance.now() - t0);
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {
        // Leave as-is
      }
      setResponse({ status: res.status, ms, body: pretty });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Network error');
    } finally {
      setLoading(false);
    }
  }

  async function copyText(value: string, kind: 'url' | 'curl' | 'body') {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Ignore clipboard failures (older Safari, http context)
    }
  }

  const FAQ_JSONLD = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'Do I need an API key for the playground?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'No. The playground only exposes free, no-auth endpoints. You can run queries immediately without an account, login, or API key. For premium endpoints (USDC-paid agent routing, history series, watches), see the developer documentation.',
        },
      },
      {
        '@type': 'Question',
        name: 'Are queries from the playground rate limited?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. The free public endpoints are limited to 120 requests per minute per IP, same as direct API access. Every response includes RateLimit-Limit, RateLimit-Remaining, and RateLimit-Reset headers.',
        },
      },
      {
        '@type': 'Question',
        name: 'Can I copy the request as curl?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Yes. Every query has a Copy curl button beside the URL. Copy paste it into your terminal to reproduce the request outside the browser. The Python and TypeScript SDK examples are linked from each endpoint card too.',
        },
      },
    ],
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }} />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Terminal className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">API Playground</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Run live queries against the TensorFeed API in your browser. No account, no login, no API key. Pick an endpoint, set the params, hit run. See the JSON, copy the curl.
        </p>
      </div>

      {/* Layout: sidebar of endpoints + main panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar */}
        <aside className="bg-bg-secondary border border-border rounded-lg p-3 max-h-[80vh] overflow-y-auto">
          <div className="text-xs uppercase tracking-wide text-text-muted px-2 mb-2">Free endpoints</div>
          {CATEGORY_ORDER.filter(c => grouped[c.key]?.length).map(cat => (
            <div key={cat.key} className="mb-3">
              <div className="text-[11px] uppercase tracking-wider text-text-muted px-2 mb-1">{cat.label}</div>
              {grouped[cat.key].map(e => (
                <button
                  key={e.slug}
                  onClick={() => {
                    setActiveSlug(e.slug);
                    setResponse(null);
                    setError(null);
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded text-sm transition-colors ${
                    activeSlug === e.slug
                      ? 'bg-accent-primary/10 text-accent-primary'
                      : 'text-text-secondary hover:bg-bg-tertiary hover:text-text-primary'
                  }`}
                >
                  <div className="font-medium">{e.name}</div>
                  <div className="text-xs text-text-muted font-mono truncate">{e.path}</div>
                </button>
              ))}
            </div>
          ))}
        </aside>

        {/* Main */}
        <main>
          {active ? (
            <div className="space-y-4">
              {/* Endpoint header */}
              <div className="bg-bg-secondary border border-border rounded-lg p-4">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <span className="text-xs px-2 py-0.5 rounded font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">{active.method}</span>
                  <span className="font-mono text-text-primary text-sm">{active.path}</span>
                  <span className="text-xs text-text-muted ml-auto">Tier: {active.tier} ({active.cost})</span>
                </div>
                <h2 className="text-lg font-semibold text-text-primary mb-1">{active.name}</h2>
                <p className="text-sm text-text-secondary leading-relaxed">{active.intro}</p>
              </div>

              {/* Params form */}
              <div className="bg-bg-secondary border border-border rounded-lg p-4">
                <div className="text-xs uppercase tracking-wide text-text-muted mb-3">Parameters</div>
                {active.params.length === 0 ? (
                  <p className="text-sm text-text-muted italic">No parameters. Hit run.</p>
                ) : (
                  <div className="space-y-3">
                    {active.params.map(p => (
                      <div key={p.name} className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-2 items-start">
                        <label className="text-sm text-text-secondary pt-2">
                          <span className="font-mono text-text-primary">{p.name}</span>
                          {p.required && <span className="text-rose-400 ml-1">*</span>}
                          <div className="text-xs text-text-muted">{p.in} · {p.type}</div>
                        </label>
                        <div>
                          <input
                            type="text"
                            value={values[p.name] || ''}
                            onChange={(e) => setParamValue(active.slug, p.name, e.target.value)}
                            placeholder={p.example || p.description}
                            className="w-full bg-bg-tertiary border border-border rounded px-3 py-2 text-sm text-text-primary font-mono focus:outline-none focus:border-accent-primary"
                          />
                          <div className="text-xs text-text-muted mt-1">{p.description}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* URL preview + run */}
              <div className="bg-bg-secondary border border-border rounded-lg p-4">
                <div className="text-xs uppercase tracking-wide text-text-muted mb-2">Request URL</div>
                <div className="flex items-center gap-2 flex-wrap">
                  <code className="flex-1 min-w-0 bg-bg-tertiary border border-border rounded px-3 py-2 text-xs sm:text-sm font-mono text-text-primary break-all">
                    {url}
                  </code>
                  <button
                    onClick={() => copyText(url, 'url')}
                    className="px-3 py-2 text-xs text-text-secondary hover:text-accent-primary border border-border rounded hover:border-accent-primary transition-colors flex items-center gap-1"
                  >
                    {copied === 'url' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === 'url' ? 'Copied' : 'Copy URL'}
                  </button>
                  <button
                    onClick={() => copyText(curl, 'curl')}
                    className="px-3 py-2 text-xs text-text-secondary hover:text-accent-primary border border-border rounded hover:border-accent-primary transition-colors flex items-center gap-1"
                  >
                    {copied === 'curl' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === 'curl' ? 'Copied' : 'Copy curl'}
                  </button>
                  <button
                    onClick={runQuery}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-semibold text-white bg-accent-primary rounded hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Play className="w-3.5 h-3.5" />
                    {loading ? 'Running...' : 'Run'}
                  </button>
                </div>
              </div>

              {/* Response */}
              {(response || error) && (
                <div className="bg-bg-secondary border border-border rounded-lg p-4">
                  <div className="flex items-center gap-3 flex-wrap mb-3">
                    <div className="text-xs uppercase tracking-wide text-text-muted">Response</div>
                    {response && (
                      <>
                        <span className={`text-xs px-2 py-0.5 rounded font-mono font-semibold ${
                          response.status >= 200 && response.status < 300
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}>
                          {response.status}
                        </span>
                        <span className="text-xs text-text-muted">{response.ms}ms</span>
                        <button
                          onClick={() => copyText(response.body, 'body')}
                          className="ml-auto px-2 py-1 text-xs text-text-secondary hover:text-accent-primary border border-border rounded hover:border-accent-primary transition-colors flex items-center gap-1"
                        >
                          {copied === 'body' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                          {copied === 'body' ? 'Copied' : 'Copy JSON'}
                        </button>
                      </>
                    )}
                  </div>
                  {error && (
                    <div className="bg-rose-500/10 border border-rose-500/20 rounded p-3 text-sm text-rose-400 flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span>{error}</span>
                    </div>
                  )}
                  {response && (
                    <pre className="bg-bg-tertiary border border-border rounded p-3 text-xs font-mono text-text-primary overflow-x-auto max-h-[400px] overflow-y-auto">
                      {response.body}
                    </pre>
                  )}
                </div>
              )}

              {/* Doc link */}
              <div className="text-xs text-text-muted">
                Full reference for this endpoint:{' '}
                <Link href={`/api-reference/${active.slug}`} className="text-accent-primary hover:underline">
                  /api-reference/{active.slug}
                </Link>
              </div>
            </div>
          ) : (
            <div className="bg-bg-secondary border border-border rounded-lg p-6 text-text-muted text-sm">
              Pick an endpoint from the sidebar to begin.
            </div>
          )}
        </main>
      </div>

      {/* Footer note */}
      <div className="mt-10 bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>
          The playground only exposes free, no-auth endpoints. For premium endpoints (USDC-paid routing, history series, watches), pay via{' '}
          <Link href="/api/payment/info" className="text-accent-primary hover:underline">/api/payment/info</Link> and use the bearer token. Full developer docs at{' '}
          <Link href="/developers" className="text-accent-primary hover:underline">/developers</Link>.
        </p>
        <p className="mt-2 text-xs text-text-muted">
          Free endpoints are rate-limited at 120 requests per minute per IP. The playground sends a <code className="font-mono">User-Agent: TensorFeedPlayground/1.0</code> header on each request.
        </p>
      </div>
    </div>
  );
}
