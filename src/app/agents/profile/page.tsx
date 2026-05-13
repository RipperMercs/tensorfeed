'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Trophy, Shield, Activity, Zap, Award, ExternalLink, Copy, Check, AlertTriangle, BadgeCheck } from 'lucide-react';

interface RankEntry {
  rank: number;
  total: number;
  pct: number;
}

interface CardMetrics {
  total_calls: number;
  successful_calls: number;
  reliability_pct: number;
  total_premium_calls: number;
  total_credits_spent: number;
  receipts_signed: number;
  active_days: number;
  current_streak_days: number;
  longest_streak_days: number;
  unique_endpoints_used: number;
  errors_4xx: number;
  errors_5xx: number;
  free_trial_calls: number;
  paid_calls: number;
  wallet_age_days: number;
}

interface ReputationCard {
  ok: true;
  wallet: string | null;
  token_prefix: string | null;
  display_name: string | null;
  operator_url: string | null;
  verified: boolean;
  ofac_clean: boolean;
  banned: boolean;
  ban_reason: string | null;
  trust_grade: 'A' | 'B' | 'C' | 'D' | 'F';
  flags: string[];
  first_seen: string;
  last_active: string;
  wallet_age_days: number;
  metrics: CardMetrics;
  ranks: {
    reliability: RankEntry;
    spend: RankEntry;
    activity: RankEntry;
    streak: RankEntry;
    composite: RankEntry;
  };
}

interface OperatorClaim {
  wallet: string;
  display_name: string;
  operator_url: string | null;
  contact: string | null;
  verified: boolean;
  ofac_clean: boolean;
  claimed_at: string;
  available_for_hire?: boolean | null;
  hourly_rate_min_usd?: number | null;
  hourly_rate_max_usd?: number | null;
  expanded_description?: string | null;
  skills_tags?: string[];
  service_areas?: string[];
  languages?: string[];
  years_experience?: number | null;
  verified_hireable_until?: string | null;
  verified_hireable_renewal_count?: number;
  verified_hireable_total_paid_usd?: number;
}

const TRUST_DESCRIPTIONS: Record<string, string> = {
  A: 'Wallet >=90 days old, >=100 paid calls, verified operator claim, zero flags.',
  B: 'Wallet >=30 days old, >=20 paid calls, zero flags.',
  C: 'Wallet >=7 days old AND (verified claim OR >=5 paid calls).',
  D: 'New wallet (<7 days) or no paid calls.',
  F: 'Banned, sanctioned, or accumulated multiple flags.',
};

const TRUST_COLORS: Record<string, string> = {
  A: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  B: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30',
  C: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  D: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  F: 'bg-red-500/10 text-red-400 border-red-500/30',
};

function detectIdShape(id: string): 'wallet' | 'token_prefix' | 'unknown' {
  if (/^0x[0-9a-fA-F]{40}$/.test(id)) return 'wallet';
  if (/^tf_live_[0-9a-fA-F]+$/.test(id) && id.length >= 9 && id.length <= 16) return 'token_prefix';
  return 'unknown';
}

export default function ProfilePage() {
  const params = useSearchParams();
  const idParam = params?.get('id') ?? '';

  const [card, setCard] = useState<ReputationCard | null>(null);
  const [claim, setClaim] = useState<OperatorClaim | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setCard(null);
    setClaim(null);
    if (!idParam) {
      setLoading(false);
      return;
    }
    const shape = detectIdShape(idParam);
    if (shape === 'unknown') {
      setError(
        'Identifier must be a wallet (0x + 40 hex) or a token prefix (tf_live_ + up to 8 hex).',
      );
      setLoading(false);
      return;
    }
    const cardUrl =
      shape === 'wallet'
        ? `https://tensorfeed.ai/api/agents/reputation/${idParam}`
        : `https://tensorfeed.ai/api/agents/reputation/by-token/${idParam}`;
    const claimUrl =
      shape === 'wallet' ? `https://tensorfeed.ai/api/agents/claim/${idParam}` : null;
    Promise.all([
      fetch(cardUrl).then((res) => (res.ok ? res.json() : null)),
      claimUrl ? fetch(claimUrl).then((res) => (res.ok ? res.json() : null)) : Promise.resolve(null),
    ])
      .then(([cardData, claimData]) => {
        if (cancelled) return;
        if (cardData?.ok) setCard(cardData);
        else if (cardData && cardData.error === 'not_found') setCard(null);
        if (claimData?.ok) setClaim(claimData.claim);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'fetch failed');
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [idParam]);

  if (!idParam) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold text-text-primary mb-3">Agent Profile</h1>
        <p className="text-text-secondary mb-6">
          Look up an agent&apos;s public reputation card by wallet address or by the first 16 chars of their tf_live_
          bearer token.
        </p>
        <SearchBox />
        <div className="mt-8 text-sm text-text-muted">
          Or browse the{' '}
          <Link href="/agents/leaderboard" className="text-accent-primary hover:text-accent-secondary">
            full leaderboard
          </Link>
          .
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6">
        <Link
          href="/agents/leaderboard"
          className="text-sm text-text-muted hover:text-text-primary inline-flex items-center gap-1"
        >
          ← Back to leaderboard
        </Link>
      </div>

      {loading && (
        <div className="space-y-4">
          <div className="h-32 bg-bg-secondary border border-border rounded-xl animate-pulse" />
          <div className="h-48 bg-bg-secondary border border-border rounded-xl animate-pulse" />
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl p-4 text-sm flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {!loading && !error && !card && (
        <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
          <h2 className="text-xl font-semibold text-text-primary mb-2">No reputation record yet</h2>
          <p className="text-text-secondary mb-4">
            <span className="font-mono text-text-primary">{idParam}</span> hasn&apos;t been picked up by a daily
            rebuild. Cards are produced for any wallet that pays for credits or for any tf_live_ token that has
            recorded activity. The bureau refreshes at 04:50 UTC.
          </p>
          <Link
            href="/agents/leaderboard"
            className="inline-flex items-center gap-1 text-accent-primary hover:text-accent-secondary"
          >
            Back to leaderboard →
          </Link>
        </div>
      )}

      {!loading && card && (
        <>
          <ProfileHeader card={card} claim={claim} id={idParam} />
          <RanksGrid card={card} />
          <MetricsGrid card={card} />
          {claim && <DirectorySection claim={claim} />}
          <EmbedSection card={card} id={idParam} />
        </>
      )}
    </div>
  );
}

function SearchBox() {
  const [v, setV] = useState('');
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (v.trim()) {
          window.location.href = `/agents/profile?id=${encodeURIComponent(v.trim())}`;
        }
      }}
      className="max-w-xl mx-auto flex gap-2"
    >
      <input
        type="text"
        value={v}
        onChange={(e) => setV(e.target.value)}
        placeholder="0x... or tf_live_..."
        className="flex-1 bg-bg-secondary border border-border rounded-lg px-4 py-2 text-text-primary font-mono text-sm placeholder-text-muted focus:outline-none focus:border-accent-primary"
      />
      <button
        type="submit"
        className="px-4 py-2 bg-accent-primary text-white rounded-lg font-medium hover:bg-accent-secondary transition-colors"
      >
        Look up
      </button>
    </form>
  );
}

function ProfileHeader({ card, claim, id }: { card: ReputationCard; claim: OperatorClaim | null; id: string }) {
  const grade = card.trust_grade;
  const gradeClass = TRUST_COLORS[grade];
  const hireable =
    claim?.verified_hireable_until && Date.parse(claim.verified_hireable_until) > Date.now();
  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-6 mb-6">
      <div className="flex items-start gap-6 flex-wrap">
        <div
          className={`w-20 h-20 rounded-xl flex items-center justify-center border-2 font-mono font-bold text-3xl ${gradeClass}`}
          title={`Trust grade ${grade}: ${TRUST_DESCRIPTIONS[grade]}`}
        >
          {grade}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h1 className="text-2xl font-bold text-text-primary">
              {card.display_name ?? 'Unclaimed Agent'}
            </h1>
            {card.verified && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-accent-primary/10 text-accent-primary border border-accent-primary/30 font-medium">
                <BadgeCheck className="w-3.5 h-3.5" />
                Verified
              </span>
            )}
            {hireable && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-medium">
                <BadgeCheck className="w-3.5 h-3.5" />
                Hireable
              </span>
            )}
            {card.banned && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400 border border-red-500/30 font-medium">
                Banned
              </span>
            )}
          </div>
          <div className="text-sm text-text-muted font-mono mb-2 break-all">{id}</div>
          {card.operator_url && (
            <a
              href={card.operator_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-accent-primary hover:text-accent-secondary"
            >
              {card.operator_url} <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          {card.flags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {card.flags.map((f) => (
                <span
                  key={f}
                  className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-amber-400 border border-amber-500/30 font-mono"
                  title="Public flag from the bureau"
                >
                  ⚑ {f}
                </span>
              ))}
            </div>
          )}
          {card.banned && card.ban_reason && (
            <div className="mt-3 text-sm text-red-400">
              Reason: <span className="font-mono">{card.ban_reason}</span>
            </div>
          )}
        </div>
        <div className="text-right text-sm space-y-1">
          <div className="text-text-muted">First seen</div>
          <div className="font-mono text-text-primary">{card.first_seen.slice(0, 10)}</div>
          <div className="text-text-muted mt-3">Last active</div>
          <div className="font-mono text-text-primary">{card.last_active.slice(0, 10)}</div>
          <div className="text-text-muted mt-3">Wallet age</div>
          <div className="font-mono text-text-primary">{card.wallet_age_days}d</div>
        </div>
      </div>
    </div>
  );
}

function RanksGrid({ card }: { card: ReputationCard }) {
  const dimensions: { key: keyof ReputationCard['ranks']; label: string; icon: React.ElementType }[] = [
    { key: 'composite', label: 'Composite', icon: Trophy },
    { key: 'reliability', label: 'Reliability', icon: Shield },
    { key: 'spend', label: 'Spend', icon: Zap },
    { key: 'activity', label: 'Activity', icon: Activity },
    { key: 'streak', label: 'Streak', icon: Award },
  ];
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-text-primary mb-3">Cohort Ranks</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {dimensions.map((d) => {
          const r = card.ranks[d.key];
          const Icon = d.icon;
          return (
            <div key={d.key} className="bg-bg-secondary border border-border rounded-xl p-4">
              <div className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-text-muted mb-2">
                <Icon className="w-3.5 h-3.5" />
                {d.label}
              </div>
              <div className="font-mono text-2xl text-text-primary">
                #{r.rank}
                <span className="text-text-muted text-sm">/{r.total}</span>
              </div>
              <div className="text-xs text-accent-primary font-mono mt-1">{r.pct.toFixed(0)} pct</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MetricsGrid({ card }: { card: ReputationCard }) {
  const m = card.metrics;
  return (
    <div className="mb-6">
      <h2 className="text-lg font-semibold text-text-primary mb-3">Telemetry</h2>
      <div className="bg-bg-secondary border border-border rounded-xl p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
        <Stat label="Total calls" value={m.total_calls} />
        <Stat label="Paid calls" value={m.paid_calls} />
        <Stat label="Free trial" value={m.free_trial_calls} />
        <Stat label="Reliability" value={`${m.reliability_pct}%`} />
        <Stat label="Active days" value={m.active_days} />
        <Stat label="Current streak" value={`${m.current_streak_days}d`} />
        <Stat label="Longest streak" value={`${m.longest_streak_days}d`} />
        <Stat label="Endpoints" value={m.unique_endpoints_used} />
        <Stat label="Credits spent" value={m.total_credits_spent} />
        <Stat label="Receipts signed" value={m.receipts_signed} />
        <Stat label="4xx errors" value={m.errors_4xx} />
        <Stat label="5xx errors" value={m.errors_5xx} />
      </div>
      <p className="mt-2 text-xs text-text-muted">
        4xx counts AGAINST reliability (agent input). 5xx is system fault and is excluded.
      </p>
    </div>
  );
}

function DirectorySection({ claim }: { claim: OperatorClaim }) {
  const hireable =
    claim.verified_hireable_until && Date.parse(claim.verified_hireable_until) > Date.now();
  if (
    !claim.available_for_hire &&
    !claim.expanded_description &&
    (!claim.skills_tags || claim.skills_tags.length === 0)
  ) {
    return null;
  }
  return (
    <div className="mb-6 bg-bg-secondary border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-text-primary">Self-Directory Listing</h2>
        <Link
          href="/agents/hireable"
          className="text-sm text-accent-primary hover:text-accent-secondary inline-flex items-center gap-1"
        >
          Browse directory <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
      {claim.expanded_description && (
        <p className="text-text-secondary text-sm mb-4">{claim.expanded_description}</p>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mb-3">
        {claim.available_for_hire !== null && claim.available_for_hire !== undefined && (
          <Stat
            label="Available"
            value={claim.available_for_hire ? 'Yes' : 'No'}
          />
        )}
        {claim.hourly_rate_min_usd !== null && claim.hourly_rate_min_usd !== undefined && (
          <Stat
            label="Rate"
            value={`$${claim.hourly_rate_min_usd}-${claim.hourly_rate_max_usd ?? '?'}/hr`}
          />
        )}
        {claim.years_experience !== null && claim.years_experience !== undefined && (
          <Stat label="Experience" value={`${claim.years_experience}y`} />
        )}
        {hireable && (
          <Stat
            label="Verified until"
            value={(claim.verified_hireable_until ?? '').slice(0, 10)}
          />
        )}
      </div>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {(claim.skills_tags ?? []).map((t) => (
          <span
            key={t}
            className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-accent-cyan border border-border font-mono"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {(claim.languages ?? []).map((l) => (
          <span
            key={l}
            className="text-xs px-2 py-0.5 rounded bg-bg-tertiary text-text-muted border border-border font-mono"
          >
            {l}
          </span>
        ))}
      </div>
      {claim.contact && (
        <div className="mt-4 pt-3 border-t border-border text-sm">
          <span className="text-text-muted">Contact: </span>
          <span className="font-mono text-text-primary">{claim.contact}</span>
        </div>
      )}
    </div>
  );
}

function EmbedSection({ card, id }: { card: ReputationCard; id: string }) {
  const [copied, setCopied] = useState(false);
  // Belt-and-suspenders HTML escape on every interpolated value. The
  // server-side regex on /api/agents/reputation/* already enforces a strict
  // identifier shape (0x + 40 hex OR tf_live_ + hex prefix), so the
  // current values can't contain HTML metacharacters. Still escape here
  // so the embed snippet remains safe even if the identifier format
  // changes upstream or the value ever flows from a different source.
  const safeId = htmlEscape(id);
  const badgeUrl = htmlEscape(
    card.wallet
      ? `https://tensorfeed.ai/api/agents/badge/${card.wallet}.svg`
      : `https://tensorfeed.ai/api/agents/badge/by-token/${id}.svg`,
  );
  const snippet = `<a href="https://tensorfeed.ai/agents/profile?id=${safeId}"><img src="${badgeUrl}" alt="TensorFeed Verified Agent" /></a>`;
  return (
    <div className="bg-bg-secondary border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-text-primary">Embed Badge</h2>
        <button
          onClick={() => {
            navigator.clipboard.writeText(snippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          }}
          className="inline-flex items-center gap-1 text-sm text-accent-primary hover:text-accent-secondary"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy snippet'}
        </button>
      </div>
      <div className="bg-bg-tertiary border border-border rounded-lg p-3 mb-3">
        <img src={badgeUrl} alt="TensorFeed reputation badge" className="block" />
      </div>
      <pre className="bg-bg-tertiary border border-border rounded-lg p-3 text-xs text-text-secondary font-mono overflow-x-auto whitespace-pre-wrap break-all">
        {snippet}
      </pre>
    </div>
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

function htmlEscape(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
