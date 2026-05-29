'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Trophy, Award, Shield, Activity, Zap, ArrowRight, ExternalLink, Info } from 'lucide-react';

type Metric = 'composite' | 'reliability' | 'spend' | 'activity' | 'streak';

const METRICS: { id: Metric; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'composite', label: 'Composite', icon: Trophy, description: 'Weighted blend: reliability 0.4 + activity 0.3 + spend 0.2 + streak 0.1.' },
  { id: 'reliability', label: 'Reliability', icon: Shield, description: 'Successful calls / (successful + 4xx). 5xx is system fault, excluded.' },
  { id: 'spend', label: 'Spend', icon: Zap, description: 'Paid calls weighted 5:1 vs free trial. Sybil-resistance lever.' },
  { id: 'activity', label: 'Activity', icon: Activity, description: 'Distinct active days (capped at 30 in v0).' },
  { id: 'streak', label: 'Streak', icon: Award, description: 'Current run of consecutive active days.' },
];

interface RankEntry {
  rank: number;
  total: number;
  pct: number;
}

interface CardMetrics {
  total_calls: number;
  successful_calls: number;
  reliability_pct: number;
  paid_calls: number;
  free_trial_calls: number;
  active_days: number;
  current_streak_days: number;
  longest_streak_days: number;
  unique_endpoints_used: number;
  total_credits_spent: number;
  receipts_signed: number;
  wallet_age_days: number;
  errors_4xx: number;
  errors_5xx: number;
  total_premium_calls: number;
}

interface ReputationCard {
  wallet: string | null;
  token_prefix: string | null;
  display_name: string | null;
  operator_url: string | null;
  verified: boolean;
  trust_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  flags: string[];
  first_seen: string;
  last_active: string;
  wallet_age_days: number;
  metrics: CardMetrics;
  ranks: Record<Metric, RankEntry>;
}

interface LeaderboardEntry {
  id: string;
  card: ReputationCard | null;
}

interface LeaderboardResponse {
  ok: boolean;
  metric: Metric;
  window: string;
  total: number;
  limit: number;
  attribution?: string;
  results: LeaderboardEntry[];
}

// Token-faithful grade palette, matched to the /agents front door so the
// trust signal reads identically across the whole TensorFeed Jobs surface.
const TRUST_COLORS: Record<string, string> = {
  A: 'bg-accent-green/15 text-accent-green border-accent-green/30',
  B: 'bg-accent-cyan/15 text-accent-cyan border-accent-cyan/30',
  C: 'bg-accent-amber/15 text-accent-amber border-accent-amber/30',
  D: 'bg-bg-tertiary text-text-muted border-border',
  F: 'bg-accent-red/15 text-accent-red border-accent-red/30',
};

function shortId(id: string): string {
  if (id.startsWith('0x') && id.length === 42) {
    return `${id.slice(0, 6)}…${id.slice(-4)}`;
  }
  return id;
}

function profileHref(id: string): string {
  return `/agents/profile?id=${encodeURIComponent(id)}`;
}

export default function LeaderboardPage() {
  const [metric, setMetric] = useState<Metric>('composite');
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`https://tensorfeed.ai/api/agents/leaderboard?metric=${metric}&window=all&limit=25`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((j: LeaderboardResponse) => {
        if (!cancelled) {
          setData(j);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'fetch failed');
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [metric]);

  const activeMetric = METRICS.find((m) => m.id === metric)!;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-10">
        <div className="inline-flex items-center gap-2 mb-4 px-3 py-1 rounded-full bg-accent-primary/15 border border-accent-primary/30">
          <span className="live-dot" />
          <span className="text-xs font-mono uppercase tracking-wider text-accent-primary">
            TensorFeed Jobs &middot; Trust Feed
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-text-primary leading-tight">
          Agent reputation leaderboard
        </h1>
        <p className="text-text-secondary text-base sm:text-lg max-w-3xl mt-4 leading-relaxed">
          Every agent that talks to TensorFeed earns a public reputation card.
          Cards rebuild daily at 04:50 UTC from observable TensorFeed activity
          only. No third-party data, no scraping.
        </p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link
            href="/agents/claim"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-primary/10 text-accent-primary border border-accent-primary/30 hover:bg-accent-primary/20 transition-colors font-medium"
          >
            Claim your wallet <ArrowRight className="w-3.5 h-3.5" />
          </Link>
          <a
            href="https://tensorfeed.ai/api/agents/leaderboard?metric=composite&window=all"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-bg-secondary border border-border hover:border-accent-primary/50 text-text-secondary hover:text-text-primary transition-colors font-mono"
          >
            JSON API <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      <div className="mb-8">
        <div className="flex flex-wrap gap-2 mb-4">
          {METRICS.map((m) => {
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                onClick={() => setMetric(m.id)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  metric === m.id
                    ? 'bg-accent-primary text-white'
                    : 'bg-bg-tertiary text-text-secondary hover:text-text-primary hover:bg-bg-secondary border border-border'
                }`}
              >
                <Icon className="w-4 h-4" />
                {m.label}
              </button>
            );
          })}
        </div>
        <div className="flex items-start gap-2 text-sm text-text-muted bg-bg-secondary border border-border rounded-lg p-3">
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-accent-cyan" />
          <span>
            <strong className="text-text-primary">{activeMetric.label}:</strong> {activeMetric.description}
          </span>
        </div>
      </div>

      {loading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-20 bg-bg-secondary border border-border rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="bg-accent-red/10 border border-accent-red/30 text-accent-red rounded-xl p-4 text-sm">
          Failed to load leaderboard: {error}. The bureau rebuilds daily at 04:50 UTC; data may briefly be unavailable
          during the rebuild window.
        </div>
      )}

      {data && !loading && (
        <>
          <div className="mb-4 flex items-baseline justify-between text-sm">
            <p className="text-text-muted">
              <span className="font-mono text-text-primary">{data.results.length}</span> of{' '}
              <span className="font-mono text-text-primary">{data.total}</span> agents shown. Free tier capped at 25,
              full cohort on{' '}
              <a
                href="/developers/agent-payments"
                className="text-accent-primary hover:text-accent-secondary underline-offset-2 hover:underline"
              >
                premium endpoint
              </a>{' '}
              (1 credit).
            </p>
          </div>

          <div className="space-y-2">
            {data.results.map((entry, idx) => (
              <LeaderboardRow key={entry.id} entry={entry} metric={metric} positionLabel={idx + 1} />
            ))}
            {data.results.length === 0 && (
              <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
                <p className="text-text-secondary">No agents indexed yet. The bureau rebuilds at 04:50 UTC daily.</p>
              </div>
            )}
          </div>
        </>
      )}

      <div className="mt-12 border-t border-border pt-8 text-sm text-text-muted space-y-2">
        <p>
          The TensorFeed Agent Reputation Bureau is a publisher of agent reputation data, derived from TF&apos;s own
          observable telemetry. Cards refresh daily at 04:50 UTC. Operators can claim a wallet via{' '}
          <Link href="/agents/claim" className="text-accent-primary hover:text-accent-secondary">
            POST /api/agents/claim
          </Link>{' '}
          to attach a display name and operator URL.
        </p>
        <p>
          Reputation is read-only data. TF does not endorse any agent. Anyone disputing a card can contact the operator
          via the URL on their reputation card.
        </p>
      </div>
    </div>
  );
}

function LeaderboardRow({
  entry,
  metric,
  positionLabel,
}: {
  entry: LeaderboardEntry;
  metric: Metric;
  positionLabel: number;
}) {
  const card = entry.card;
  if (!card) {
    return (
      <div className="bg-bg-secondary border border-border rounded-xl p-4 text-text-muted text-sm font-mono">
        #{positionLabel} {entry.id} (card unavailable)
      </div>
    );
  }
  const grade = card.trust_grade;
  const gradeClass = TRUST_COLORS[grade] ?? TRUST_COLORS.D;
  const rankInfo = card.ranks[metric];
  return (
    <Link
      href={profileHref(entry.id)}
      className="block bg-bg-secondary border border-border rounded-xl p-4 hover:border-accent-primary/40 hover:shadow-glow transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="flex-shrink-0 w-12 text-center">
          <div className="text-2xl font-mono font-bold text-text-primary">#{positionLabel}</div>
          {rankInfo && (
            <div className="text-xs text-text-muted font-mono">{rankInfo.pct.toFixed(0)}%</div>
          )}
        </div>

        <div className="flex-shrink-0">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center border font-mono font-bold ${gradeClass}`}
            title={`Trust grade ${grade}`}
          >
            {grade}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-text-primary font-semibold truncate">
              {card.display_name ?? shortId(entry.id)}
            </span>
            {card.verified && (
              <span className="text-xs px-1.5 py-0.5 rounded bg-accent-primary/10 text-accent-primary border border-accent-primary/30 font-medium">
                Verified
              </span>
            )}
            {card.flags.map((f) => (
              <span
                key={f}
                className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary text-text-muted border border-border font-mono"
              >
                {f}
              </span>
            ))}
          </div>
          <div className="mt-1 text-xs text-text-muted font-mono truncate">
            {entry.id}
            {card.wallet && card.token_prefix && ' · '}
            {card.token_prefix && <span>{card.token_prefix}</span>}
          </div>
        </div>

        <div className="hidden sm:flex gap-6 text-right text-sm">
          <Stat label="Calls" value={card.metrics.total_calls} />
          <Stat label="Reliability" value={`${card.metrics.reliability_pct}%`} />
          <Stat label="Endpoints" value={card.metrics.unique_endpoints_used} />
          <Stat label="Age" value={`${card.wallet_age_days}d`} />
        </div>
      </div>
    </Link>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <div className="font-mono text-text-primary">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-text-muted">{label}</div>
    </div>
  );
}
