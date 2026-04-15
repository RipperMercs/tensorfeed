'use client';

import { useState, useEffect, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import Link from 'next/link';
interface Incident {
  id: string;
  service: string;
  provider: string;
  severity: string;
  title: string;
  startedAt: string;
  resolvedAt: string | null;
  durationMinutes: number | null;
}

const PROVIDER_COLORS: Record<string, string> = {
  Anthropic: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  OpenAI: 'bg-green-500/10 text-green-400 border-green-500/20',
  Google: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  Meta: 'bg-blue-600/10 text-blue-300 border-blue-600/20',
  Mistral: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  xAI: 'bg-gray-500/10 text-gray-400 border-gray-500/20',
  DeepSeek: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProvider, setFilterProvider] = useState<string>('all');

  useEffect(() => {
    fetch('https://tensorfeed.ai/api/incidents')
      .then((r) => r.json())
      .then((data) => {
        setIncidents(data.incidents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const providers = useMemo(() => {
    const set = new Set(incidents.map((i) => i.provider));
    return ['all', ...Array.from(set).sort()];
  }, [incidents]);

  const filtered = useMemo(() => {
    const list = filterProvider === 'all' ? incidents : incidents.filter((i) => i.provider === filterProvider);
    return [...list].sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
  }, [incidents, filterProvider]);

  // Stats for last 30 days
  const stats = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = incidents.filter((i) => new Date(i.startedAt).getTime() > cutoff);
    const resolved = recent.filter((i) => i.durationMinutes !== null);
    const avgResolution = resolved.length > 0
      ? Math.round(resolved.reduce((sum, i) => sum + (i.durationMinutes || 0), 0) / resolved.length)
      : 0;

    // Most affected service
    const counts: Record<string, number> = {};
    for (const i of recent) {
      counts[i.service] = (counts[i.service] || 0) + 1;
    }
    const mostAffected = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];

    return {
      total: recent.length,
      avgResolution,
      mostAffected: mostAffected ? mostAffected[0] : 'None',
    };
  }, [incidents]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-10">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2 rounded-lg bg-accent-red/10">
            <AlertTriangle className="w-7 h-7 text-accent-red" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary">Incident History</h1>
        </div>
        <p className="text-text-secondary text-lg max-w-2xl">
          A log of AI service incidents, outages, and degraded performance events detected by TensorFeed monitoring.
        </p>
      </div>

      {/* Editorial Intro */}
      <div className="max-w-4xl mb-10 text-text-secondary leading-relaxed space-y-4">
        <p>
          Outages happen. They&apos;re embarrassing, costly, and completely predictable. Infrastructure fails. Load balancers misconfigure. Deployments break things. Databases run out of disk space. Not a single major AI provider is immune. By studying incident patterns, we can predict when failures are likely and design our systems to tolerate them.
        </p>
        <p>
          This database captures every incident we&apos;ve detected in the TensorFeed monitoring network: when it started, how long it lasted, severity (was it a full outage or partial degradation), and which provider was affected. The data reveals that outages cluster. Claude API might be flaky for a week, then stable for two months. OpenAI&apos;s API has experienced multiple major incidents, each lasting 30 to 90 minutes. Hugging Face and Replicate have historically lower reliability than the major commercial providers. Our monthly <Link href="/originals/ai-service-outages-month" className="text-accent-primary hover:underline">AI service outage report</Link> synthesizes this into actionable insights.
        </p>
        <p>
          What should you learn from this? First, avoid single points of failure. Distribute your traffic across multiple providers if feasible. Claude and GPT-4 won&apos;t both go down at the same time often enough to matter, but their combination is more reliable than either alone. Second, implement exponential backoff and retry logic in your client code. Third, cache successful responses and degrade gracefully when APIs are down. Finally, monitor your own dependencies. The earlier you know an API is degraded, the earlier you can mitigate customer impact.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-bg-secondary border border-border rounded-lg p-4">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Incidents (30 days)</p>
          <p className="text-2xl font-bold text-text-primary">{loading ? '...' : stats.total}</p>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg p-4">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Avg. Resolution Time</p>
          <p className="text-2xl font-bold text-text-primary">
            {loading ? '...' : stats.avgResolution > 0 ? formatDuration(stats.avgResolution) : 'N/A'}
          </p>
        </div>
        <div className="bg-bg-secondary border border-border rounded-lg p-4">
          <p className="text-xs text-text-muted uppercase tracking-wide mb-1">Most Affected Service</p>
          <p className="text-2xl font-bold text-text-primary truncate">{loading ? '...' : stats.mostAffected}</p>
        </div>
      </div>

      {/* Provider Filter */}
      <div className="flex flex-wrap gap-2 mb-8">
        {providers.map((p) => (
          <button
            key={p}
            onClick={() => setFilterProvider(p)}
            className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors border ${
              filterProvider === p
                ? 'bg-accent-primary text-white border-accent-primary'
                : 'bg-bg-secondary text-text-secondary border-border hover:border-text-muted'
            }`}
          >
            {p === 'all' ? 'All Providers' : p}
          </button>
        ))}
      </div>

      {/* Incident List */}
      {loading ? (
        <div className="text-center py-16 text-text-muted">Loading incidents...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-text-muted text-lg">No incidents recorded</p>
          <p className="text-text-muted text-sm mt-1">All monitored services are running smoothly.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((incident) => (
            <div
              key={incident.id}
              className="bg-bg-secondary border border-border rounded-lg p-5 hover:shadow-glow transition-shadow"
            >
              <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-text-primary font-semibold">{incident.title}</h3>
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full border font-medium ${
                      PROVIDER_COLORS[incident.provider] || 'bg-bg-tertiary text-text-secondary border-border'
                    }`}
                  >
                    {incident.provider}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {/* Severity badge */}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      incident.severity === 'major'
                        ? 'bg-accent-red/10 text-accent-red'
                        : 'bg-accent-amber/10 text-accent-amber'
                    }`}
                  >
                    {incident.severity === 'major' ? 'Major' : 'Minor'}
                  </span>
                  {/* Status badge */}
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      incident.resolvedAt
                        ? 'bg-accent-green/10 text-accent-green'
                        : 'bg-accent-red/10 text-accent-red'
                    }`}
                  >
                    {incident.resolvedAt ? 'Resolved' : 'Ongoing'}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-text-muted">
                <span>Started: {formatDateTime(incident.startedAt)}</span>
                {incident.resolvedAt && (
                  <span>Resolved: {formatDateTime(incident.resolvedAt)}</span>
                )}
                {incident.durationMinutes !== null && (
                  <span>Duration: {formatDuration(incident.durationMinutes)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
