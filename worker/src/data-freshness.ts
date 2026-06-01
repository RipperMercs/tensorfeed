/**
 * Catalog-driven data-freshness guard.
 *
 * A dataset (model benchmarks, harness leaderboard) is stale if it predates
 * the catalog's newest flagship model: the model names it covers do not
 * include the newest flagship surfaced on /api/models. It is also stale if it
 * is older than its SLA in days. The catalog (/api/models) is kept live by the
 * daily LiteLLM cron, so the moment a new flagship lands there, every dataset
 * that has not caught up flags itself. This is distinct from the premium
 * billing freshness in freshness.ts.
 */
import type { Env } from './types';
import { sendEmail } from './alerts';
import { safePut } from './kill-switch';

export interface FreshnessReport {
  dataset: string;
  last_updated: string | null;
  age_days: number | null;
  sla_days: number;
  stale: boolean;
  reason: string | null;
  newest_catalog_flagship: string | null;
  predates_flagship: boolean;
}

interface PricingModel { id?: string; name?: string; released?: string; tier?: string }
interface PricingProvider { models?: PricingModel[] }
interface PricingData { lastUpdated?: string; providers?: PricingProvider[] }

/** Latest-released flagship-tier model in the catalog. YYYY-MM string compare is chronological. */
export function newestFlagship(pricing: PricingData | null): { name: string; released: string } | null {
  if (!pricing?.providers) return null;
  let best: { name: string; released: string } | null = null;
  for (const p of pricing.providers) {
    for (const m of p.models ?? []) {
      if (m.tier !== 'flagship' || !m.name || !m.released) continue;
      if (!best || m.released > best.released) best = { name: m.name, released: m.released };
    }
  }
  return best;
}

function daysSince(lastUpdated: string, nowIso: string): number | null {
  // Accept YYYY-MM-DD, full ISO, or YYYY-MM (treated as the 1st of that month).
  const norm = /^\d{4}-\d{2}$/.test(lastUpdated) ? `${lastUpdated}-01` : lastUpdated;
  const a = Date.parse(norm);
  const b = Date.parse(nowIso);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function datasetFreshness(args: {
  dataset: string;
  lastUpdated: string | null;
  coveredModelNames: string[];
  pricing: PricingData | null;
  slaDays: number;
  now: string;
}): FreshnessReport {
  const { dataset, lastUpdated, coveredModelNames, pricing, slaDays, now } = args;
  const flagship = newestFlagship(pricing);
  const covered = new Set(coveredModelNames.map(n => n.toLowerCase().trim()));
  // A covered model "covers" the flagship if it is the flagship name or a
  // reasoning-effort variant of it. Federation boards suffix model names, so
  // "Claude Opus 4.8 Thinking" covers the catalog flagship "Claude Opus 4.8".
  const flag = flagship ? flagship.name.toLowerCase().trim() : '';
  const coversFlagship = flagship ? [...covered].some(c => c === flag || c.startsWith(`${flag} `)) : true;
  const predates = flagship ? !coversFlagship : false;
  const age = lastUpdated ? daysSince(lastUpdated, now) : null;
  const ageStale = typeof age === 'number' && age > slaDays;
  const stale = predates || ageStale;
  let reason: string | null = null;
  if (predates && flagship) reason = `leaderboard predates ${flagship.name}`;
  else if (ageStale) reason = `data is ${age} days old (SLA ${slaDays}d)`;
  return {
    dataset,
    last_updated: lastUpdated,
    age_days: age,
    sla_days: slaDays,
    stale,
    reason,
    newest_catalog_flagship: flagship?.name ?? null,
    predates_flagship: predates,
  };
}

/**
 * Daily cron self-check. Loads the catalog and the benchmark and harness model
 * coverage, computes freshness, and emails an alert listing any stale dataset.
 * Returns the reports for logging.
 */
export async function checkDataFreshness(env: Env, now: string): Promise<FreshnessReport[]> {
  const pricing = (await env.TENSORFEED_CACHE.get('models', 'json')) as PricingData | null;
  const benchmarks = (await env.TENSORFEED_CACHE.get('benchmarks', 'json')) as
    | { lastUpdated?: string; models?: { model?: string }[] }
    | null;
  const { HARNESSES_DATA } = await import('./harnesses');
  // Mirror /api/harnesses: the harnesses dataset is served as the federation
  // overlay when the TerminalFeed snapshot is present, so the freshness check
  // must measure that same view (board date + live models), not the static.
  const { getHarnessSnapshot } = await import('./terminalfeed-harnesses-fetcher');
  const { buildHarnessesView } = await import('./harnesses-view');
  const harnSnap = await getHarnessSnapshot(env);
  const harnView =
    harnSnap && Array.isArray(harnSnap.benchmarks) && harnSnap.benchmarks.length > 0
      ? buildHarnessesView(harnSnap, HARNESSES_DATA)
      : HARNESSES_DATA;

  const modelNames = (pricing?.providers ?? []).flatMap(p => (p.models ?? []).map(m => m.name ?? '')).filter(Boolean);
  const reports: FreshnessReport[] = [
    datasetFreshness({ dataset: 'models', lastUpdated: pricing?.lastUpdated ?? null, coveredModelNames: modelNames, pricing, slaDays: 7, now }),
    datasetFreshness({ dataset: 'benchmarks', lastUpdated: benchmarks?.lastUpdated ?? null, coveredModelNames: (benchmarks?.models ?? []).map(m => m.model ?? '').filter(Boolean), pricing, slaDays: 14, now }),
    datasetFreshness({ dataset: 'harnesses', lastUpdated: harnView.lastUpdated, coveredModelNames: harnView.results.map(r => r.model), pricing, slaDays: 14, now }),
  ];

  const stale = reports.filter(r => r.stale);
  // Alert only when the stale set CHANGES, so a persistently stale board does not
  // email on every daily run. Re-alerts when a new dataset goes stale or a reason
  // changes, and resets the marker once everything is fresh so a later regression
  // alerts again. The signature is the sorted dataset:reason set.
  const SIG_KEY = 'data-freshness:last-alert-signature';
  const signature = stale.map(r => `${r.dataset}:${r.reason ?? ''}`).sort().join('|');
  const lastSignature = (await env.TENSORFEED_CACHE.get(SIG_KEY)) as string | null;
  if (stale.length > 0 && signature !== lastSignature) {
    const lines = stale.map(r => `- ${r.dataset}: ${r.reason} (last updated ${r.last_updated ?? 'unknown'})`).join('\n');
    const flagship = reports[0].newest_catalog_flagship ?? 'the latest flagship';
    const text = `TensorFeed data freshness alert.\n\nStale datasets:\n${lines}\n\nThe catalog's newest flagship is ${flagship}. Update the flagged datasets (or wire their auto-pull) to clear this.`;
    const html = `<p>TensorFeed data freshness alert.</p><p>Stale datasets:</p><pre>${lines}</pre><p>The catalog's newest flagship is ${flagship}.</p>`;
    await sendEmail(env, `TensorFeed data freshness: ${stale.length} stale dataset(s)`, html, text);
    await safePut(env, env.TENSORFEED_CACHE, SIG_KEY, signature);
  } else if (stale.length === 0 && lastSignature) {
    await safePut(env, env.TENSORFEED_CACHE, SIG_KEY, '');
  }
  return reports;
}
