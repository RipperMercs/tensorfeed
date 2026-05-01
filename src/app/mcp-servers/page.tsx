'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Plug, ExternalLink, Copy, Check } from 'lucide-react';

interface MCPServer {
  id: string;
  name: string;
  vendor: string;
  capabilities: string[];
  transports: string[];
  firstParty: boolean;
  language: string;
  license: string;
  install: string;
  url: string;
  notes: string;
}

interface Response {
  ok: boolean;
  lastUpdated: string;
  count: number;
  servers: MCPServer[];
}

const CAPABILITY_LABEL: Record<string, string> = {
  filesystem: 'Filesystem',
  'web-search': 'Web search',
  'web-fetch': 'Web fetch',
  browser: 'Browser',
  github: 'GitHub',
  gitlab: 'GitLab',
  database: 'Database',
  slack: 'Slack',
  gmail: 'Gmail',
  gcal: 'Google Calendar',
  gdrive: 'Google Drive',
  notion: 'Notion',
  linear: 'Linear',
  memory: 'Memory',
  shell: 'Shell',
  puppeteer: 'Puppeteer',
  aws: 'AWS',
  cloudflare: 'Cloudflare',
  vercel: 'Vercel',
  sentry: 'Sentry',
  datadog: 'Datadog',
  observability: 'Observability',
  'fetch-payment': 'Payments',
  voice: 'Voice',
  image: 'Image',
  analytics: 'Analytics',
};

export default function MCPServersPage() {
  const [data, setData] = useState<Response | null>(null);
  const [activeCapability, setActiveCapability] = useState<string>('all');
  const [firstPartyOnly, setFirstPartyOnly] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/mcp-servers')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: Response) => setData(json))
      .catch(e => setError(e instanceof Error ? e.message : 'Failed to load'));
  }, []);

  const allCapabilities = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const s of data.servers) for (const c of s.capabilities) set.add(c);
    return Array.from(set).sort();
  }, [data]);

  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.servers;
    if (activeCapability !== 'all') rows = rows.filter(s => s.capabilities.includes(activeCapability));
    if (firstPartyOnly) rows = rows.filter(s => s.firstParty);
    return rows;
  }, [data, activeCapability, firstPartyOnly]);

  async function copyInstall(install: string, id: string) {
    try {
      await navigator.clipboard.writeText(install);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // ignore
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-primary/10">
            <Plug className="w-7 h-7 text-accent-primary" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">MCP Servers</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-3xl">
          Curated catalog of production MCP servers organized by capability. Filesystem, web search, browser, GitHub, Slack, Notion, databases, cloud providers, observability. Each entry has the install command and license. Different from <Link href="/api/mcp/registry/snapshot" className="text-accent-primary hover:underline font-mono">/api/mcp/registry/snapshot</Link> (count snapshot of the official registry); this is the editorial starter pack. {data?.lastUpdated && `Updated ${data.lastUpdated}.`}
        </p>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-3 flex-wrap items-center">
        <span className="text-xs text-text-muted uppercase tracking-wide">Capability:</span>
        <button
          onClick={() => setActiveCapability('all')}
          className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
            activeCapability === 'all' ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
          }`}
        >
          All
        </button>
        {allCapabilities.map(c => (
          <button
            key={c}
            onClick={() => setActiveCapability(c)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
              activeCapability === c ? 'bg-accent-primary text-white border-accent-primary' : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >
            {CAPABILITY_LABEL[c] || c}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 mb-6">
        <label className="text-xs text-text-secondary flex items-center gap-1.5 cursor-pointer">
          <input
            type="checkbox"
            checked={firstPartyOnly}
            onChange={(e) => setFirstPartyOnly(e.target.checked)}
            className="rounded"
          />
          First-party only (vendor-published)
        </label>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-lg p-4 text-rose-400 text-sm mb-6">
          Error loading data: {error}
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
          {filtered.map(s => (
            <div key={s.id} className="bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary/50 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-text-primary hover:text-accent-primary inline-flex items-center gap-1">
                    {s.name} <ExternalLink className="w-3 h-3 text-text-muted" />
                  </a>
                  <div className="text-xs text-text-muted mt-0.5">
                    {s.vendor} · {s.language} · {s.license}
                    {s.firstParty && <span className="ml-1 text-emerald-400">first-party</span>}
                  </div>
                </div>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed mb-3">{s.notes}</p>
              <div className="flex items-center gap-1 flex-wrap mb-3">
                {s.capabilities.map(c => (
                  <span key={c} className="text-xs bg-bg-tertiary text-text-secondary border border-border px-2 py-0.5 rounded">
                    {CAPABILITY_LABEL[c] || c}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 min-w-0 bg-bg-tertiary border border-border rounded px-2 py-1.5 text-xs font-mono text-text-primary truncate">
                  {s.install}
                </code>
                <button
                  onClick={() => copyInstall(s.install, s.id)}
                  className="px-2 py-1.5 text-xs text-text-secondary hover:text-accent-primary border border-border rounded hover:border-accent-primary transition-colors"
                  title="Copy install command"
                >
                  {copied === s.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-bg-secondary border border-border rounded-lg p-4 text-sm text-text-secondary">
        <p>
          For agents: same data at{' '}
          <Link href="/api-reference/mcp-servers" className="text-accent-primary hover:underline font-mono">/api/mcp-servers</Link>
          . Filter with <code className="font-mono">?capability=filesystem|browser|github|slack|database|...</code> or <code className="font-mono">?first_party=true</code>. Free, no auth, cached 10 min.
        </p>
      </div>
    </div>
  );
}
