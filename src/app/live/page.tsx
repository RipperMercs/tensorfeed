'use client';

import { useState, useEffect } from 'react';
import { Radio, Zap, Globe, Shield, TrendingUp, ExternalLink } from 'lucide-react';
import { STATUS_DOTS, STATUS_COLORS } from '@/lib/constants';
import pricingData from '@/../data/pricing.json';
import {
  useGithubTrending,
  useInternetPulse,
  usePredictions,
  useCyberThreats,
  useEconomicData,
  useBriefing,
  isAIRelated,
  type TFGithubRepo,
  type TFPulseRegion,
  type TFPrediction,
  type TFThreat,
  type TFEconomicIndicator,
} from '@/lib/terminalfeed';

const TABS = [
  'Agent Activity',
  'AI Status',
  'GitHub Trending',
  'Predictions',
  'Internet Pulse',
  'Cyber Threats',
  'API Pricing',
  'Model Tracker',
] as const;

type TabName = (typeof TABS)[number];

// ─── Types ──────────────────────────────────────────────────────────────────

interface LiveStatus {
  name: string;
  provider: string;
  status: string;
  components: { name: string; status: string }[];
  lastChecked?: string;
}

interface LiveModel {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
  contextWindow: number;
  released: string;
  capabilities: string[];
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────

function LoadingSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="bg-bg-secondary border border-border rounded-lg p-4">
          <div className="h-4 bg-bg-tertiary rounded w-3/4 mb-2" />
          <div className="h-3 bg-bg-tertiary rounded w-1/2" />
        </div>
      ))}
    </div>
  );
}

function ErrorFallback({ error }: { error: string }) {
  return (
    <div className="bg-bg-secondary border border-border rounded-lg p-6 text-center">
      <p className="text-text-muted text-sm">Unable to load data</p>
      <p className="text-text-muted text-xs mt-1">{error}</p>
    </div>
  );
}

function TFAttribution() {
  return (
    <p className="text-xs text-text-muted mt-4 flex items-center gap-1">
      Data via{' '}
      <a href="https://terminalfeed.io" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:text-accent-cyan transition-colors">
        TerminalFeed.io
      </a>
    </p>
  );
}

// ─── Tab Content Components ─────────────────────────────────────────────────

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={`inline-block w-2 h-2 rounded-full ${STATUS_DOTS[status] || STATUS_DOTS.unknown}`}
    />
  );
}

function AIStatusTab() {
  const [statuses, setStatuses] = useState<LiveStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchStatus() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/status');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data.services) setStatuses(data.services);
      } catch {}
      if (mounted) setLoading(false);
    }
    fetchStatus();
    const interval = setInterval(fetchStatus, 120000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (loading) return <LoadingSkeleton rows={6} />;
  if (statuses.length === 0) return <ErrorFallback error="No status data available" />;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {statuses.map((service) => (
        <div key={service.name} className="bg-bg-secondary border border-border rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-text-primary font-medium text-sm">{service.name}</h3>
              <p className="text-text-muted text-xs">{service.provider}</p>
            </div>
            <div className="flex items-center gap-1.5">
              <StatusDot status={service.status} />
              <span className={`text-xs capitalize ${STATUS_COLORS[service.status] || STATUS_COLORS.unknown}`}>
                {service.status}
              </span>
            </div>
          </div>
          <div className="space-y-1">
            {service.components.map((comp) => (
              <div key={comp.name} className="flex items-center justify-between">
                <span className="text-xs text-text-secondary">{comp.name}</span>
                <StatusDot status={comp.status} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function GitHubTrendingTab() {
  const { data, loading, error } = useGithubTrending();

  if (loading) return <LoadingSkeleton rows={6} />;
  if (error || !data) return <ErrorFallback error={error || 'No data'} />;

  const LANG_COLORS: Record<string, string> = {
    Python: 'bg-yellow-400',
    TypeScript: 'bg-blue-400',
    JavaScript: 'bg-amber-400',
    Rust: 'bg-orange-500',
    Go: 'bg-cyan-400',
    'C++': 'bg-pink-400',
    Java: 'bg-red-400',
    Jupyter: 'bg-orange-400',
  };

  // Filter for AI-related repos
  const aiRepos = data.filter((repo: TFGithubRepo) =>
    isAIRelated(`${repo.name} ${repo.description || ''}`)
  );
  const displayRepos = aiRepos.length > 0 ? aiRepos : data.slice(0, 10);

  return (
    <div>
      {aiRepos.length > 0 && (
        <p className="text-xs text-text-muted mb-3">Showing {aiRepos.length} AI-related trending repos</p>
      )}
      <div className="space-y-3">
        {displayRepos.map((repo: TFGithubRepo) => (
          <a
            key={repo.name || repo.url}
            href={repo.url}
            target="_blank"
            rel="noopener noreferrer"
            className="block bg-bg-secondary border border-border rounded-lg p-4 hover:border-accent-primary transition-colors group"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="text-accent-primary font-medium text-sm group-hover:text-accent-cyan transition-colors flex items-center gap-1.5">
                  {repo.name}
                  <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </h3>
                <p className="text-text-secondary text-xs mt-1 line-clamp-1">{repo.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2 text-xs text-text-muted">
              {repo.language && (
                <span className="flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${LANG_COLORS[repo.language] || 'bg-gray-400'}`} />
                  {repo.language}
                </span>
              )}
              <span>{(repo.stars || 0).toLocaleString()} stars</span>
              {repo.todayStars > 0 && (
                <span className="text-accent-green">+{repo.todayStars.toLocaleString()} today</span>
              )}
            </div>
          </a>
        ))}
      </div>
      <TFAttribution />
    </div>
  );
}

function PredictionsTab() {
  const { data, loading, error } = usePredictions();

  if (loading) return <LoadingSkeleton rows={6} />;
  if (error || !data) return <ErrorFallback error={error || 'No data'} />;

  // Try to filter for AI-related predictions, fall back to all
  const aiPredictions = data.filter((p: TFPrediction) => isAIRelated(p.question));
  const displayPredictions = aiPredictions.length >= 3 ? aiPredictions : data.slice(0, 12);

  return (
    <div>
      {aiPredictions.length >= 3 && (
        <p className="text-xs text-text-muted mb-3">Showing {aiPredictions.length} AI-related prediction markets</p>
      )}
      <div className="space-y-3">
        {displayPredictions.map((pred: TFPrediction, i: number) => {
          const yesWidth = Math.max(pred.yes_percent || 0, 2);
          const noWidth = Math.max(pred.no_percent || 0, 2);
          return (
            <div key={i} className="bg-bg-secondary border border-border rounded-lg p-4">
              <p className="text-text-primary text-sm font-medium leading-snug mb-3">{pred.question}</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-2 rounded-full overflow-hidden bg-bg-tertiary flex">
                  <div className="h-full bg-accent-green rounded-l-full" style={{ width: `${yesWidth}%` }} />
                  <div className="h-full bg-accent-red rounded-r-full" style={{ width: `${noWidth}%` }} />
                </div>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-accent-green font-medium">Yes {pred.yes_percent?.toFixed(0)}%</span>
                <span className="text-accent-red font-medium">No {pred.no_percent?.toFixed(0)}%</span>
                {pred.volume_usd > 0 && (
                  <span className="text-text-muted">${(pred.volume_usd / 1000).toFixed(0)}K vol</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <TFAttribution />
    </div>
  );
}

function InternetPulseTab() {
  const { data, loading, error } = useInternetPulse();

  if (loading) return <LoadingSkeleton rows={3} />;
  if (error || !data) return <ErrorFallback error={error || 'No data'} />;

  function latencyColor(ms: number): string {
    if (ms < 0) return 'text-text-muted';
    if (ms < 50) return 'text-accent-green';
    if (ms < 150) return 'text-accent-amber';
    return 'text-accent-red';
  }

  function latencyBarColor(ms: number): string {
    if (ms < 0) return 'bg-text-muted';
    if (ms < 50) return 'bg-accent-green';
    if (ms < 150) return 'bg-accent-amber';
    return 'bg-accent-red';
  }

  const maxLatency = Math.max(...data.filter((r: TFPulseRegion) => r.latency_ms > 0).map((r: TFPulseRegion) => r.latency_ms), 200);

  return (
    <div>
      <div className="bg-bg-secondary border border-border rounded-lg p-6 mb-4">
        <div className="flex items-center gap-2 mb-4">
          <Globe className="w-5 h-5 text-accent-primary" />
          <h3 className="text-text-primary font-semibold">Global Internet Latency</h3>
        </div>
        <div className="space-y-4">
          {data.map((region: TFPulseRegion) => (
            <div key={region.name}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-text-secondary">{region.name}</span>
                <span className={`text-sm font-mono font-medium ${latencyColor(region.latency_ms)}`}>
                  {region.latency_ms < 0 ? 'Unreachable' : `${region.latency_ms}ms`}
                </span>
              </div>
              <div className="h-2 w-full bg-bg-tertiary rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${latencyBarColor(region.latency_ms)}`}
                  style={{ width: region.latency_ms < 0 ? '100%' : `${Math.min((region.latency_ms / maxLatency) * 100, 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-text-muted">
        Latency measured from Cloudflare edge. Important for AI developers monitoring API infrastructure health.
      </p>
      <TFAttribution />
    </div>
  );
}

function CyberThreatsTab() {
  const { data, loading, error } = useCyberThreats();

  if (loading) return <LoadingSkeleton rows={6} />;
  if (error || !data) return <ErrorFallback error={error || 'No data'} />;

  const threats = Array.isArray(data) ? data.slice(0, 15) : [];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-accent-red" />
        <h3 className="text-text-primary font-semibold">Recent Threat Intelligence</h3>
      </div>
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-bg-tertiary">
              <th className="px-3 py-2 text-xs font-medium text-text-muted text-left">Type</th>
              <th className="px-3 py-2 text-xs font-medium text-text-muted text-left">Malware</th>
              <th className="px-3 py-2 text-xs font-medium text-text-muted text-left">IOC</th>
              <th className="px-3 py-2 text-xs font-medium text-text-muted text-left">Reporter</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {threats.map((t: TFThreat, i: number) => (
              <tr key={i} className="bg-bg-secondary hover:bg-bg-tertiary/50 transition-colors">
                <td className="px-3 py-2 text-xs text-accent-amber">{t.threat_type || t.ioc_type}</td>
                <td className="px-3 py-2 text-xs text-text-primary font-medium">{t.malware || 'Unknown'}</td>
                <td className="px-3 py-2 text-xs text-text-muted font-mono truncate max-w-[200px]">{t.ioc}</td>
                <td className="px-3 py-2 text-xs text-text-secondary">{t.reporter}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-text-muted mt-3">
        Relevant for AI security: supply chain attacks, model poisoning, and API credential theft are growing threats.
      </p>
      <TFAttribution />
    </div>
  );
}

function APIPricingTab() {
  const providers = pricingData.providers;
  const allModels = providers.flatMap((p) =>
    p.models.map((m) => ({ provider: p.name, ...m }))
  );
  const minInput = Math.min(...allModels.filter((m) => m.inputPrice > 0).map((m) => m.inputPrice));
  const minOutput = Math.min(...allModels.filter((m) => m.outputPrice > 0).map((m) => m.outputPrice));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-text-muted text-xs text-left">
            <th className="py-3 px-3 font-medium">Provider</th>
            <th className="py-3 px-3 font-medium">Model</th>
            <th className="py-3 px-3 font-medium text-right">Input / 1M</th>
            <th className="py-3 px-3 font-medium text-right">Output / 1M</th>
            <th className="py-3 px-3 font-medium text-right">Context</th>
          </tr>
        </thead>
        <tbody>
          {providers.map((provider) =>
            provider.models.map((model, mIdx) => {
              const isOpenSource = model.inputPrice === 0 && model.outputPrice === 0;
              return (
                <tr key={model.id} className="border-b border-border/50 hover:bg-bg-secondary transition-colors">
                  {mIdx === 0 ? (
                    <td className="py-2.5 px-3 text-text-primary font-medium align-top" rowSpan={provider.models.length}>
                      {provider.name}
                    </td>
                  ) : null}
                  <td className="py-2.5 px-3 text-text-secondary">{model.name}</td>
                  <td className={`py-2.5 px-3 text-right font-mono ${isOpenSource ? 'text-accent-green' : model.inputPrice === minInput ? 'text-accent-green' : 'text-text-secondary'}`}>
                    {isOpenSource ? 'Free' : `$${model.inputPrice.toFixed(2)}`}
                  </td>
                  <td className={`py-2.5 px-3 text-right font-mono ${isOpenSource ? 'text-accent-green' : model.outputPrice === minOutput ? 'text-accent-green' : 'text-text-secondary'}`}>
                    {isOpenSource ? 'Free' : `$${model.outputPrice.toFixed(2)}`}
                  </td>
                  <td className="py-2.5 px-3 text-right text-text-muted font-mono">
                    {model.contextWindow >= 1000000
                      ? `${(model.contextWindow / 1000000).toFixed(0)}M`
                      : `${(model.contextWindow / 1000).toFixed(0)}K`}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      <p className="text-xs text-text-muted mt-3 px-3">
        {pricingData.pricingNotes.disclaimer} Prices in {pricingData.pricingNotes.currency} {pricingData.pricingNotes.unit}.
      </p>
    </div>
  );
}

function ModelTrackerTab() {
  const [models, setModels] = useState<{ provider: string; models: LiveModel[] }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchModels() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/models');
        if (!res.ok) return;
        const data = await res.json();
        if (mounted && data.providers) setModels(data.providers);
      } catch {}
      if (mounted) setLoading(false);
    }
    fetchModels();
    return () => { mounted = false; };
  }, []);

  if (loading) return <LoadingSkeleton rows={6} />;
  if (models.length === 0) return <ErrorFallback error="No model data available" />;

  function formatContext(ctx: number): string {
    if (ctx >= 1000000) return `${(ctx / 1000000).toFixed(ctx % 1000000 === 0 ? 0 : 1)}M`;
    return `${(ctx / 1000).toFixed(0)}K`;
  }

  // Flatten and sort by release date (newest first)
  const allModels = models.flatMap(p =>
    p.models.map(m => ({ ...m, provider: p.provider || '' }))
  ).sort((a, b) => (b.released || '').localeCompare(a.released || ''));

  return (
    <div className="space-y-3">
      {allModels.map((model) => (
        <div key={model.id} className="bg-bg-secondary border border-border rounded-lg p-4">
          <div className="flex items-start justify-between mb-2">
            <div>
              <h3 className="text-text-primary font-semibold text-sm">{model.name}</h3>
              <p className="text-text-muted text-xs">{model.provider}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-text-muted">{model.released}</span>
              <p className="text-xs text-accent-cyan font-mono mt-0.5">{formatContext(model.contextWindow)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-2">
            <span className="text-xs text-text-muted">
              Input: <span className="text-text-secondary font-mono">{model.inputPrice === 0 ? 'Free' : `$${model.inputPrice.toFixed(2)}/1M`}</span>
            </span>
            <span className="text-xs text-text-muted">
              Output: <span className="text-text-secondary font-mono">{model.outputPrice === 0 ? 'Free' : `$${model.outputPrice.toFixed(2)}/1M`}</span>
            </span>
          </div>
          {model.capabilities.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {model.capabilities.map((cap) => (
                <span key={cap} className="text-xs px-2 py-0.5 rounded-full bg-bg-tertiary text-text-secondary border border-border">{cap}</span>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function AgentActivityTab() {
  const [data, setData] = useState<{
    today_count: number;
    recent: { bot: string; endpoint: string; timestamp: string }[];
  } | null>(null);

  useEffect(() => {
    let mounted = true;
    async function fetchData() {
      try {
        const res = await fetch('https://tensorfeed.ai/api/agents/activity');
        if (!res.ok) return;
        const json = await res.json();
        if (mounted) setData(json);
      } catch {}
    }
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  if (!data) return <LoadingSkeleton rows={4} />;

  const botCounts: Record<string, number> = {};
  const endpointCounts: Record<string, number> = {};
  for (const hit of data.recent) {
    botCounts[hit.bot] = (botCounts[hit.bot] || 0) + 1;
    endpointCounts[hit.endpoint] = (endpointCounts[hit.endpoint] || 0) + 1;
  }
  const sortedBots = Object.entries(botCounts).sort((a, b) => b[1] - a[1]);
  const sortedEndpoints = Object.entries(endpointCounts).sort((a, b) => b[1] - a[1]);
  const maxBotCount = sortedBots.length > 0 ? sortedBots[0][1] : 1;

  function timeAgo(ts: string) {
    const s = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
    if (s < 60) return `${s}s ago`;
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    return `${Math.floor(s / 3600)}h ago`;
  }

  return (
    <div className="space-y-6">
      <div className="bg-bg-secondary border border-border rounded-lg p-6">
        <div className="flex items-center gap-3 mb-2">
          <Zap className="w-6 h-6 text-accent-amber" />
          <h2 className="text-xl font-semibold text-text-primary">Agent Requests Today</h2>
        </div>
        <p className="text-4xl font-bold text-accent-primary">{data.today_count.toLocaleString()}</p>
        <p className="text-text-muted text-sm mt-1">Auto-updates every 10 seconds</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-bg-secondary border border-border rounded-lg p-5">
          <h3 className="text-text-primary font-semibold text-sm mb-4">Agent Breakdown</h3>
          <div className="space-y-3">
            {sortedBots.map(([bot, count]) => (
              <div key={bot}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-text-secondary">{bot}</span>
                  <span className="text-xs text-text-muted font-mono">{count}</span>
                </div>
                <div className="h-1.5 w-full bg-bg-primary rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-accent-primary" style={{ width: `${(count / maxBotCount) * 100}%` }} />
                </div>
              </div>
            ))}
            {sortedBots.length === 0 && <p className="text-xs text-text-muted">No activity yet</p>}
          </div>
        </div>

        <div className="bg-bg-secondary border border-border rounded-lg p-5">
          <h3 className="text-text-primary font-semibold text-sm mb-4">Top Endpoints</h3>
          <div className="space-y-2">
            {sortedEndpoints.map(([endpoint, count]) => (
              <div key={endpoint} className="flex items-center justify-between">
                <code className="text-xs text-accent-cyan font-mono truncate">{endpoint}</code>
                <span className="text-xs text-text-muted font-mono shrink-0 ml-2">{count} hits</span>
              </div>
            ))}
            {sortedEndpoints.length === 0 && <p className="text-xs text-text-muted">No activity yet</p>}
          </div>
        </div>
      </div>

      <div className="bg-bg-secondary border border-border rounded-lg p-5">
        <h3 className="text-text-primary font-semibold text-sm mb-4">Recent Agent Hits</h3>
        <div className="space-y-1">
          {data.recent.map((hit, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-bg-tertiary transition-colors">
              <span className="text-sm text-text-primary font-medium w-36 shrink-0 truncate">{hit.bot}</span>
              <code className="text-xs text-text-muted font-mono flex-1 truncate">{hit.endpoint}</code>
              <span className="text-[10px] text-text-muted font-mono shrink-0">{timeAgo(hit.timestamp)}</span>
            </div>
          ))}
          {data.recent.length === 0 && <p className="text-xs text-text-muted">No recent agent hits recorded yet</p>}
        </div>
      </div>
    </div>
  );
}

// ─── World Briefing Banner ──────────────────────────────────────────────────

function WorldBriefingBanner() {
  const { data } = useBriefing();
  if (!data?.summary) return null;

  return (
    <div className="bg-bg-secondary/80 border border-border rounded-lg px-4 py-3 mb-6">
      <div className="flex items-start gap-2">
        <Globe className="w-4 h-4 text-accent-cyan mt-0.5 shrink-0" />
        <div>
          <span className="text-xs font-medium text-text-muted uppercase tracking-wider">World Snapshot</span>
          <p className="text-sm text-text-secondary mt-0.5 leading-relaxed">{data.summary}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Economic Sidebar Widget ────────────────────────────────────────────────

function EconomicWidget() {
  const { data } = useEconomicData();
  if (!data || !Array.isArray(data) || data.length === 0) return null;

  return (
    <div className="bg-bg-secondary border border-border rounded-lg p-4 mt-6">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp className="w-4 h-4 text-accent-primary" />
        <h3 className="text-sm font-semibold text-text-primary">Economic Indicators</h3>
      </div>
      <div className="space-y-2">
        {data.slice(0, 6).map((indicator: TFEconomicIndicator, i: number) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-xs text-text-secondary">{indicator.name}</span>
            <span className="text-xs font-mono text-text-primary">
              {indicator.value}{indicator.unit === '%' ? '%' : ` ${indicator.unit || ''}`}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-text-muted mt-2">
        Data via <a href="https://terminalfeed.io" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:text-accent-cyan">TerminalFeed.io</a>
      </p>
    </div>
  );
}

// ─── Main Page Component ────────────────────────────────────────────────────

export default function LivePage() {
  const [activeTab, setActiveTab] = useState<TabName>('Agent Activity');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Agent Activity': return <AgentActivityTab />;
      case 'AI Status': return <AIStatusTab />;
      case 'GitHub Trending': return <GitHubTrendingTab />;
      case 'Predictions': return <PredictionsTab />;
      case 'Internet Pulse': return <InternetPulseTab />;
      case 'Cyber Threats': return <CyberThreatsTab />;
      case 'API Pricing': return <APIPricingTab />;
      case 'Model Tracker': return <ModelTrackerTab />;
      default: return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Radio className="w-6 h-6 text-accent-primary" />
          <h1 className="text-2xl font-bold text-text-primary">Live Data Feeds</h1>
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent-green opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-accent-green" />
          </span>
        </div>
        <p className="text-text-muted text-sm">
          Real-time AI ecosystem data, updated continuously.
          Powered by{' '}
          <a href="https://terminalfeed.io" target="_blank" rel="noopener noreferrer" className="text-accent-primary hover:text-accent-cyan transition-colors">
            TerminalFeed.io
          </a>
        </p>
      </div>

      {/* World Briefing Banner */}
      <WorldBriefingBanner />

      {/* Tab Bar */}
      <div className="border-b border-border mb-6 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap border-b-2 ${
                activeTab === tab
                  ? 'text-accent-primary border-accent-primary'
                  : 'text-text-muted border-transparent hover:text-text-secondary hover:border-border'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>{renderTabContent()}</div>

      {/* Economic Widget */}
      <EconomicWidget />
    </div>
  );
}
