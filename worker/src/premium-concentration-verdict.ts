/**
 * Premium dependency-concentration verdict.
 *
 * One signed ruling for an operator: given the set of AI providers you
 * depend on, how exposed are you to a single point of failure right now,
 * and what should you add to diversify. It fuses two TensorFeed signals:
 *   1. The measured provider-reliability ranking (windowed availability and
 *      tail consistency from TF's own probes).
 *   2. The current per-provider operational state (operational / degraded /
 *      down) from the live status feed.
 *
 * Verdict bands (worst signal wins):
 *   CRITICAL  : you depend on a single provider, OR every provider you list
 *               is impaired (degraded or down) right now.
 *   EXPOSED   : only two providers, OR at least one listed provider is
 *               impaired right now (with a healthy one still standing).
 *   RESILIENT : three or more providers and none currently impaired.
 *
 * Coverage honesty: TensorFeed can only rule on providers it tracks. If none
 * of the caller's providers resolve to a tracked provider, the handler
 * no-charges (AFTA empty_result) and returns the tracked vocabulary so the
 * caller can correct the input. Substrate-level correlated-failure detection
 * (two providers sharing one cloud) is a deliberate v1.1 follow-up: TF has no
 * authoritative provider-to-substrate map today, and a guessed one would be
 * worse than none in a resilience verdict.
 */

import type { ServiceStatus } from './types';
import type { ReliabilityVerdictResult } from './premium-provider-reliability-verdict';

export type ConcentrationVerdictKind = 'RESILIENT' | 'EXPOSED' | 'CRITICAL';
export type OperationalState = 'operational' | 'degraded' | 'down' | 'unknown';

const MAX_PROVIDERS = 25;

/** Normalize a provider name to a comparison key: lowercase, alphanumerics only. */
export function normalizeProvider(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Common caller aliases mapped to the normalized canonical key the tracked
// vocabulary uses (e.g. status slug "Microsoft Azure" normalizes to
// "microsoftazure"). Keys and values are both normalized.
const ALIASES: Record<string, string> = {
  claude: 'anthropic',
  gpt: 'openai',
  chatgpt: 'openai',
  openaiapi: 'openai',
  gemini: 'google',
  googleai: 'google',
  vertex: 'google',
  vertexai: 'google',
  bedrock: 'aws',
  awsbedrock: 'aws',
  azure: 'microsoftazure',
  azureopenai: 'microsoftazure',
  microsoft: 'microsoftazure',
  mistral: 'mistralai',
  hf: 'huggingface',
  together: 'togetherai',
  fireworks: 'fireworksai',
  perplexity: 'perplexityai',
  pplx: 'perplexityai',
  stability: 'stabilityai',
  luma: 'lumaai',
};

function aliasKey(raw: string): string {
  const n = normalizeProvider(raw);
  return ALIASES[n] ?? n;
}

/** Parse a comma-separated providers query param into a deduped, capped list. */
export function parseProviders(raw: string | null): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const t = part.trim();
    if (!t) continue;
    const k = normalizeProvider(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= MAX_PROVIDERS) break;
  }
  return out;
}

export interface ConcentrationProvider {
  input: string;
  provider: string;
  reliability_score: number | null;
  reliability_rank: number | null;
  measured: boolean;
  current_status: OperationalState;
}

export interface ConcentrationVerdictResult {
  ok: true;
  verdict_kind: 'dependency_concentration';
  verdict: ConcentrationVerdictKind;
  provider_count: number;
  single_point_of_failure: boolean;
  providers: ConcentrationProvider[];
  unrecognized: string[];
  currently_impaired: string[];
  weakest_link: ConcentrationProvider | null;
  diversification: {
    suggested: Array<{ provider: string; reliability_score: number; rank: number }>;
    note: string;
  };
  recommendation: string;
  captured_at: string;
  sources: Array<{ name: string; url: string; license: string }>;
}

export interface ConcentrationVerdictEmpty {
  ok: false;
  error: 'no_recognized_providers';
  unrecognized: string[];
  hint: string;
  tracked_providers: string[];
}

const STATUS_RANK: Record<OperationalState, number> = { down: 3, degraded: 2, unknown: 1, operational: 0 };

function worstStatus(a: OperationalState, b: OperationalState): OperationalState {
  return STATUS_RANK[a] >= STATUS_RANK[b] ? a : b;
}

function coerceStatus(raw: string): OperationalState {
  if (raw === 'operational' || raw === 'degraded' || raw === 'down') return raw;
  return 'unknown';
}

const SOURCES = [
  {
    name: 'TensorFeed measured provider-reliability probes',
    url: 'https://tensorfeed.ai/api/probe/latest',
    license: 'TensorFeed-measured; the ranking is editorial work over its own measurements, not a provider SLA guarantee.',
  },
  {
    name: 'TensorFeed provider status feed',
    url: 'https://tensorfeed.ai/api/status',
    license: 'Republished provider status with attribution; primary status-page authority always wins.',
  },
];

export function buildConcentrationVerdict(
  reliability: ReliabilityVerdictResult,
  statusServices: ServiceStatus[],
  inputProviders: string[],
  now: Date,
): ConcentrationVerdictResult | ConcentrationVerdictEmpty {
  // Reliability map keyed by normalized provider.
  const relMap = new Map<string, { score: number; rank: number; measured: boolean; display: string }>();
  for (const r of reliability.ranking) {
    relMap.set(normalizeProvider(r.provider), {
      score: r.reliability_score,
      rank: r.rank,
      measured: r.measured,
      display: r.provider,
    });
  }

  // Current status map keyed by normalized provider (worst service per provider).
  const statusMap = new Map<string, { status: OperationalState; display: string }>();
  for (const s of statusServices) {
    if (!s || typeof s.provider !== 'string') continue;
    const key = normalizeProvider(s.provider);
    const st = coerceStatus(s.status);
    const existing = statusMap.get(key);
    if (existing) {
      existing.status = worstStatus(existing.status, st);
    } else {
      statusMap.set(key, { status: st, display: s.provider });
    }
  }

  // The tracked vocabulary the caller's input is matched against.
  const trackedDisplay = new Map<string, string>();
  for (const [k, v] of statusMap) trackedDisplay.set(k, v.display);
  for (const [k, v] of relMap) if (!trackedDisplay.has(k)) trackedDisplay.set(k, v.display);

  const resolved: ConcentrationProvider[] = [];
  const resolvedKeys = new Set<string>();
  const unrecognized: string[] = [];
  for (const input of inputProviders) {
    const key = aliasKey(input);
    const rel = relMap.get(key);
    const status = statusMap.get(key);
    if (!rel && !status) {
      unrecognized.push(input);
      continue;
    }
    if (resolvedKeys.has(key)) continue;
    resolvedKeys.add(key);
    resolved.push({
      input,
      provider: status?.display ?? rel?.display ?? input,
      reliability_score: rel ? rel.score : null,
      reliability_rank: rel ? rel.rank : null,
      measured: rel ? rel.measured : false,
      current_status: status ? status.status : 'unknown',
    });
  }

  if (resolved.length === 0) {
    return {
      ok: false,
      error: 'no_recognized_providers',
      unrecognized,
      hint: 'None of the providers you listed are tracked by TensorFeed. Pass a comma-separated list of tracked providers (see tracked_providers). Common aliases like claude, gpt, gemini, bedrock, and azure are accepted.',
      tracked_providers: [...trackedDisplay.values()].sort(),
    };
  }

  const provider_count = resolved.length;
  const impaired = resolved.filter((p) => p.current_status === 'down' || p.current_status === 'degraded');
  const currently_impaired = impaired.map((p) => p.provider);
  const single_point_of_failure = provider_count <= 1;

  let verdict: ConcentrationVerdictKind = 'RESILIENT';
  if (provider_count === 2) verdict = 'EXPOSED';
  if (impaired.length >= 1) verdict = 'EXPOSED';
  if (single_point_of_failure) verdict = 'CRITICAL';
  if (impaired.length === provider_count) verdict = 'CRITICAL';

  // Weakest link: worst current status first, then lowest reliability_score.
  const weakest_link =
    [...resolved].sort((a, b) => {
      const sd = STATUS_RANK[b.current_status] - STATUS_RANK[a.current_status];
      if (sd !== 0) return sd;
      const as = a.reliability_score ?? 2; // nulls sort last (treated as unknown, not worst)
      const bs = b.reliability_score ?? 2;
      return as - bs;
    })[0] ?? null;

  // Diversification: highest-reliability tracked providers not already listed.
  const suggested: Array<{ provider: string; reliability_score: number; rank: number }> = [];
  for (const r of reliability.ranking) {
    if (resolvedKeys.has(normalizeProvider(r.provider))) continue;
    suggested.push({ provider: r.provider, reliability_score: r.reliability_score, rank: r.rank });
    if (suggested.length >= 2) break;
  }
  const diversification = {
    suggested,
    note:
      suggested.length > 0
        ? 'Highest-reliability tracked providers you are not already using, by measured dependability.'
        : 'No untapped tracked provider with a measured reliability score is available to suggest.',
  };

  let recommendation: string;
  const topAlt = suggested[0]?.provider ?? null;
  if (single_point_of_failure) {
    recommendation = `You depend on a single provider (${resolved[0].provider}). One outage takes you fully offline. Add at least one independent provider${topAlt ? `; ${topAlt} is currently the most dependable alternative` : ''}.`;
  } else if (impaired.length === provider_count) {
    recommendation = `Every provider you depend on is impaired right now (${currently_impaired.join(', ')}). You have no healthy path; add an independent provider that is currently operational${topAlt ? ` such as ${topAlt}` : ''}.`;
  } else if (verdict === 'EXPOSED') {
    const why = impaired.length >= 1 ? `${currently_impaired.join(', ')} impaired right now` : 'only two providers in your set';
    recommendation = `Exposed: ${why}. Keep a healthy fallback ready${topAlt ? ` and consider adding ${topAlt}` : ''}.`;
  } else {
    recommendation = `Resilient: spread across ${provider_count} providers with none impaired right now. Re-check before a high-stakes run, since operational state moves.`;
  }

  return {
    ok: true,
    verdict_kind: 'dependency_concentration',
    verdict,
    provider_count,
    single_point_of_failure,
    providers: resolved,
    unrecognized,
    currently_impaired,
    weakest_link,
    diversification,
    recommendation,
    captured_at: reliability.capturedAt ?? now.toISOString(),
    sources: SOURCES,
  };
}
