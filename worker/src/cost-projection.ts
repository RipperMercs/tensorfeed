import { Env } from './types';

/**
 * Premium cost projection.
 *
 * Given a token-usage workload (input + output tokens per day) and 1-10
 * model identifiers, returns the projected cost across daily, weekly,
 * monthly, and yearly horizons, plus a ranking by monthly cost so agents
 * can spot the cheapest option for a given workload.
 *
 * Pure compute on the live `models` KV payload. Agents could do this math
 * themselves; the endpoint earns 1 credit by being the canonical
 * abstraction (right rates, correct rounding, ranking included) so they
 * don't have to maintain pricing tables in their own code.
 */

const MAX_MODELS_PER_REQUEST = 10;

interface ModelPricing {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
  contextWindow?: number;
}

interface ProviderPricing {
  id: string;
  name: string;
  models: ModelPricing[];
}

interface PricingPayload {
  providers: ProviderPricing[];
}

export interface CostProjectionOptions {
  /** Model ids or display names. Comma-separated when passed via query string. */
  models: string[];
  inputTokensPerDay: number;
  outputTokensPerDay: number;
  /** Default 'monthly'. */
  primaryHorizon?: 'daily' | 'weekly' | 'monthly' | 'yearly';
}

interface PerModelProjection {
  model: string;
  provider: string;
  matched: true;
  rates: { input_per_1m: number; output_per_1m: number; blended_per_1m: number };
  daily: { input_cost: number; output_cost: number; total: number };
  weekly_total: number;
  monthly_total: number;
  yearly_total: number;
}

interface UnmatchedProjection {
  model: string;
  matched: false;
  reason: 'model_not_found';
}

export type ProjectionEntry = PerModelProjection | UnmatchedProjection;

export interface CostProjectionResult {
  ok: true;
  workload: {
    input_tokens_per_day: number;
    output_tokens_per_day: number;
    total_tokens_per_day: number;
  };
  primary_horizon: 'daily' | 'weekly' | 'monthly' | 'yearly';
  computed_at: string;
  projections: ProjectionEntry[];
  ranked_cheapest_monthly: { model: string; provider: string; monthly_total: number }[];
  notes: string[];
}

export interface CostProjectionError {
  ok: false;
  error: string;
}

const HORIZON_DAYS: Record<'daily' | 'weekly' | 'monthly' | 'yearly', number> = {
  daily: 1,
  weekly: 7,
  monthly: 30,
  yearly: 365,
};

function round4(n: number): number {
  return parseFloat(n.toFixed(4));
}

function findModel(
  payload: PricingPayload | null,
  key: string,
): { provider: ProviderPricing; model: ModelPricing } | null {
  if (!payload?.providers) return null;
  const k = key.toLowerCase();
  for (const provider of payload.providers) {
    for (const model of provider.models) {
      if (model.id.toLowerCase() === k || model.name.toLowerCase() === k) {
        return { provider, model };
      }
    }
  }
  return null;
}

function projectOne(
  match: { provider: ProviderPricing; model: ModelPricing },
  inputPerDay: number,
  outputPerDay: number,
): PerModelProjection {
  const inputDailyCost = (inputPerDay / 1_000_000) * match.model.inputPrice;
  const outputDailyCost = (outputPerDay / 1_000_000) * match.model.outputPrice;
  const dailyTotal = inputDailyCost + outputDailyCost;

  return {
    model: match.model.name,
    provider: match.provider.name,
    matched: true,
    rates: {
      input_per_1m: match.model.inputPrice,
      output_per_1m: match.model.outputPrice,
      blended_per_1m: round4((match.model.inputPrice + match.model.outputPrice) / 2),
    },
    daily: {
      input_cost: round4(inputDailyCost),
      output_cost: round4(outputDailyCost),
      total: round4(dailyTotal),
    },
    weekly_total: round4(dailyTotal * HORIZON_DAYS.weekly),
    monthly_total: round4(dailyTotal * HORIZON_DAYS.monthly),
    yearly_total: round4(dailyTotal * HORIZON_DAYS.yearly),
  };
}

export async function computeCostProjection(
  env: Env,
  options: CostProjectionOptions,
): Promise<CostProjectionResult | CostProjectionError> {
  if (!Array.isArray(options.models) || options.models.length === 0) {
    return { ok: false, error: 'models_required' };
  }
  if (options.models.length > MAX_MODELS_PER_REQUEST) {
    return { ok: false, error: `max_${MAX_MODELS_PER_REQUEST}_models_per_request` };
  }
  if (!Number.isFinite(options.inputTokensPerDay) || options.inputTokensPerDay < 0) {
    return { ok: false, error: 'input_tokens_per_day_invalid' };
  }
  if (!Number.isFinite(options.outputTokensPerDay) || options.outputTokensPerDay < 0) {
    return { ok: false, error: 'output_tokens_per_day_invalid' };
  }

  const horizon: 'daily' | 'weekly' | 'monthly' | 'yearly' =
    options.primaryHorizon &&
    ['daily', 'weekly', 'monthly', 'yearly'].includes(options.primaryHorizon)
      ? options.primaryHorizon
      : 'monthly';

  const pricing = (await env.TENSORFEED_CACHE.get(
    'models',
    'json',
  )) as PricingPayload | null;

  const projections: ProjectionEntry[] = [];
  for (const key of options.models) {
    const trimmed = key.trim();
    if (!trimmed) continue;
    const match = findModel(pricing, trimmed);
    if (!match) {
      projections.push({ model: trimmed, matched: false, reason: 'model_not_found' });
      continue;
    }
    projections.push(
      projectOne(match, options.inputTokensPerDay, options.outputTokensPerDay),
    );
  }

  const matched = projections.filter((p): p is PerModelProjection => p.matched === true);
  const ranked = matched
    .slice()
    .sort((a, b) => a.monthly_total - b.monthly_total)
    .map(p => ({
      model: p.model,
      provider: p.provider,
      monthly_total: p.monthly_total,
    }));

  const notes: string[] = [
    'monthly = 30 days, yearly = 365 days. Real billing cycles vary; treat as a planning estimate.',
    'Rates are USD per 1M tokens from live pricing data. Provider tiers and volume discounts beyond what is published in /api/models are not applied.',
  ];
  if (matched.length === 0) {
    notes.push('No requested models matched the live pricing catalog. Try /api/models to confirm exact ids and names.');
  }

  return {
    ok: true,
    workload: {
      input_tokens_per_day: options.inputTokensPerDay,
      output_tokens_per_day: options.outputTokensPerDay,
      total_tokens_per_day: options.inputTokensPerDay + options.outputTokensPerDay,
    },
    primary_horizon: horizon,
    computed_at: new Date().toISOString(),
    projections,
    ranked_cheapest_monthly: ranked,
    notes,
  };
}
