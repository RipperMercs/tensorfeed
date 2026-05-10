import { Env } from './types';
import {
  FUNDING_REGISTRY,
  FUNDING_REGISTRY_LAST_UPDATED,
  FUNDING_ATTRIBUTION,
  FundingAttribution,
  FundingCommitment,
} from './ai-funding-registry';

/**
 * Premium funding exposure analytics.
 *
 * Derived metrics over the free /api/funding/portfolio registry. The
 * free endpoint serves per-commitment records; this paid endpoint
 * computes the analytical lens introduced in the Nvidia $40B equity
 * loop article: who is funding whom, what silicon the capital flows
 * back to, and how circular the loop is per investor.
 *
 * Compute that justifies the gate:
 *   - Silicon concentration: total dollars + commitment count by
 *     recipient_silicon_dependency.
 *   - Circular exposure per investor: of an investor's commitments,
 *     what fraction land on recipients dependent on that investor's
 *     own silicon brand (Nvidia investing in Nvidia-dependent labs,
 *     etc.). Heuristic: investor's "silicon brand" is inferred from
 *     name (Nvidia -> nvidia, Google -> tpu, Amazon -> trainium,
 *     Microsoft -> maia, AMD -> mi400). Investors not tagged in this
 *     map are treated as silicon-agnostic and excluded from the loop
 *     metric.
 *   - Top recipients by capital received.
 *   - Co-investor pairs: investors that both hold stakes in the same
 *     recipient (clusters of consensus).
 *
 * Cost: 1 credit per call. SLA: 7 days (the registry refreshes on
 * redeploy when new entries land; older snapshots trigger no-charge).
 */

// ── Investor-to-silicon mapping ─────────────────────────────────────

const INVESTOR_SILICON: Record<string, string> = {
  Nvidia: 'nvidia',
  Google: 'tpu',
  Amazon: 'trainium',
  AWS: 'trainium',
  Microsoft: 'maia',
  AMD: 'mi400',
};

function silicon_brand_of(investor: string): string | null {
  return INVESTOR_SILICON[investor] ?? null;
}

// ── Public types ────────────────────────────────────────────────────

export interface SiliconConcentrationEntry {
  silicon_dependency: string;
  commitment_count: number;
  total_amount_usd_max: number;
  share_of_total_pct: number;
}

export interface CircularExposureEntry {
  investor: string;
  investor_silicon_brand: string;
  total_commitments: number;
  total_amount_usd_max: number;
  commitments_to_own_silicon: number;
  amount_to_own_silicon_usd_max: number;
  circular_ratio_by_count: number;
  circular_ratio_by_amount: number;
  loop_classification: 'fully-circular' | 'partial-loop' | 'agnostic' | 'insufficient-data';
}

export interface RecipientEntry {
  recipient: string;
  inbound_commitments: number;
  inbound_amount_usd_max: number;
  silicon_dependency: string;
  investors: string[];
}

export interface CoInvestorPair {
  investor_a: string;
  investor_b: string;
  shared_recipients: string[];
}

export interface FundingExposureResult {
  ok: true;
  capturedAt: string;
  total_commitments: number;
  total_amount_usd_max: number;
  silicon_concentration: SiliconConcentrationEntry[];
  circular_exposure: CircularExposureEntry[];
  top_recipients: RecipientEntry[];
  co_investor_pairs: CoInvestorPair[];
  attribution: FundingAttribution;
}

export interface FundingExposureError {
  ok: false;
  error: string;
  hint?: string;
}

// ── classifyLoop ─────────────────────────────────────────────────────

export function classifyLoop(ratio_by_count: number, investor_silicon_brand: string | null): CircularExposureEntry['loop_classification'] {
  if (!investor_silicon_brand) return 'agnostic';
  if (ratio_by_count >= 0.85) return 'fully-circular';
  if (ratio_by_count >= 0.25) return 'partial-loop';
  return 'agnostic';
}

// ── computeFundingExposure ───────────────────────────────────────────

export function computeFundingExposure(
  registry: FundingCommitment[] = FUNDING_REGISTRY,
  capturedAt: string = FUNDING_REGISTRY_LAST_UPDATED,
): FundingExposureResult | FundingExposureError {
  if (registry.length === 0) {
    return {
      ok: false,
      error: 'empty_registry',
      hint: 'No funding commitments are currently registered.',
    };
  }

  const totalCommitments = registry.length;
  const totalUsd = registry.reduce((acc, c) => acc + c.amount_usd_max, 0);

  // ── Silicon concentration ──────────────────────────────────────────
  const siliconBuckets: Record<string, { count: number; total: number }> = {};
  for (const c of registry) {
    const k = c.recipient_silicon_dependency;
    if (!siliconBuckets[k]) siliconBuckets[k] = { count: 0, total: 0 };
    siliconBuckets[k].count += 1;
    siliconBuckets[k].total += c.amount_usd_max;
  }
  const siliconConcentration: SiliconConcentrationEntry[] = Object.entries(siliconBuckets)
    .map(([k, v]) => ({
      silicon_dependency: k,
      commitment_count: v.count,
      total_amount_usd_max: v.total,
      share_of_total_pct: totalUsd === 0 ? 0 : Math.round((v.total / totalUsd) * 10000) / 100,
    }))
    .sort((a, b) => b.total_amount_usd_max - a.total_amount_usd_max);

  // ── Circular exposure per investor ─────────────────────────────────
  const investorMap: Record<string, FundingCommitment[]> = {};
  for (const c of registry) {
    if (!investorMap[c.from]) investorMap[c.from] = [];
    investorMap[c.from].push(c);
  }
  const circularExposure: CircularExposureEntry[] = Object.entries(investorMap)
    .map(([investor, items]) => {
      const brand = silicon_brand_of(investor);
      const investorTotal = items.length;
      const investorUsd = items.reduce((acc, c) => acc + c.amount_usd_max, 0);
      const toOwnSilicon = brand ? items.filter((c) => c.recipient_silicon_dependency === brand) : [];
      const toOwnCount = toOwnSilicon.length;
      const toOwnUsd = toOwnSilicon.reduce((acc, c) => acc + c.amount_usd_max, 0);
      const ratioCount = investorTotal === 0 ? 0 : toOwnCount / investorTotal;
      const ratioAmount = investorUsd === 0 ? 0 : toOwnUsd / investorUsd;
      const classification = brand
        ? classifyLoop(ratioCount, brand)
        : (items.length < 2 ? 'insufficient-data' : 'agnostic');
      return {
        investor,
        investor_silicon_brand: brand ?? 'unknown',
        total_commitments: investorTotal,
        total_amount_usd_max: investorUsd,
        commitments_to_own_silicon: toOwnCount,
        amount_to_own_silicon_usd_max: toOwnUsd,
        circular_ratio_by_count: Math.round(ratioCount * 1000) / 1000,
        circular_ratio_by_amount: Math.round(ratioAmount * 1000) / 1000,
        loop_classification: classification,
      };
    })
    .sort((a, b) => b.total_amount_usd_max - a.total_amount_usd_max);

  // ── Top recipients ─────────────────────────────────────────────────
  const recipientMap: Record<string, { items: FundingCommitment[]; investors: Set<string>; silicons: Set<string> }> = {};
  for (const c of registry) {
    if (!recipientMap[c.to]) recipientMap[c.to] = { items: [], investors: new Set(), silicons: new Set() };
    recipientMap[c.to].items.push(c);
    recipientMap[c.to].investors.add(c.from);
    recipientMap[c.to].silicons.add(c.recipient_silicon_dependency);
  }
  const topRecipients: RecipientEntry[] = Object.entries(recipientMap)
    .map(([recipient, v]) => ({
      recipient,
      inbound_commitments: v.items.length,
      inbound_amount_usd_max: v.items.reduce((acc, c) => acc + c.amount_usd_max, 0),
      // If a recipient appears with multiple silicon tags (rare; shouldn't happen
      // in a well-curated registry), surface as "mixed" rather than pick arbitrarily.
      silicon_dependency: v.silicons.size === 1 ? [...v.silicons][0] : 'mixed',
      investors: [...v.investors].sort(),
    }))
    .sort((a, b) => b.inbound_amount_usd_max - a.inbound_amount_usd_max);

  // ── Co-investor pairs ───────────────────────────────────────────────
  // Find pairs (A, B) such that both have at least one commitment to the
  // same recipient. Output up to 25 pairs, sorted by number of shared
  // recipients descending.
  const pairKey = (a: string, b: string) => (a < b ? `${a}\x00${b}` : `${b}\x00${a}`);
  const pairShared: Record<string, Set<string>> = {};
  for (const [recipient, v] of Object.entries(recipientMap)) {
    const investors = [...v.investors];
    if (investors.length < 2) continue;
    for (let i = 0; i < investors.length; i++) {
      for (let j = i + 1; j < investors.length; j++) {
        const k = pairKey(investors[i], investors[j]);
        if (!pairShared[k]) pairShared[k] = new Set();
        pairShared[k].add(recipient);
      }
    }
  }
  const coInvestorPairs: CoInvestorPair[] = Object.entries(pairShared)
    .map(([key, recipients]) => {
      const [a, b] = key.split('\x00');
      return { investor_a: a, investor_b: b, shared_recipients: [...recipients].sort() };
    })
    .sort((a, b) => b.shared_recipients.length - a.shared_recipients.length)
    .slice(0, 25);

  return {
    ok: true,
    capturedAt,
    total_commitments: totalCommitments,
    total_amount_usd_max: totalUsd,
    silicon_concentration: siliconConcentration,
    circular_exposure: circularExposure,
    top_recipients: topRecipients,
    co_investor_pairs: coInvestorPairs,
    attribution: FUNDING_ATTRIBUTION,
  };
}

// env unused on this endpoint (compute is over the bundled registry) but
// kept in the signature so the route handler stays consistent with the
// other compute functions.
export async function computeFundingExposureAsync(_env: Env): Promise<FundingExposureResult | FundingExposureError> {
  return computeFundingExposure();
}
