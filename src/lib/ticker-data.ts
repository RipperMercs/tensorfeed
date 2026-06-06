// Derives the homepage LiveTicker's evergreen rows (model prices + benchmark
// leaders) from the canonical data files instead of hardcoding the numbers.
// This is the durable fix for the ticker silently drifting out of sync with
// data/pricing.json and data/benchmarks.json.
//
// Pure and data-injected: callers (the server layout) pass the already-imported
// JSON, so no data file is bundled into the client ticker. Unit-tested in
// ticker-data.test.ts.

export type TickerKind = 'news' | 'status' | 'price' | 'benchmark' | 'release';
export type TickerCls = 'up' | 'down' | 'warn' | 'info' | 'ok';

export interface TickerItem {
  kind: TickerKind;
  tag: string;
  text: string;
  mono?: string;
  cls?: TickerCls;
}

// Minimal shapes we read from data/pricing.json and data/benchmarks.json. The
// real files carry more fields; structural typing lets the imported JSON pass.
export interface PricingModelLite {
  id: string;
  name: string;
  inputPrice: number;
  outputPrice: number;
  tier?: string;
  released?: string;
}
export interface PricingProviderLite {
  id: string;
  models: PricingModelLite[];
}
export interface PricingDataLite {
  providers: PricingProviderLite[];
}
export interface BenchmarkModelLite {
  model: string;
  scores: Record<string, number>;
}
export interface BenchmarkDataLite {
  models: BenchmarkModelLite[];
}

// Which providers' current flagship to show, and any extra models to feature
// by id. Editorial selection only; every displayed price comes from the data.
const FLAGSHIP_PROVIDERS = ['anthropic', 'openai', 'google'];
const ALSO_FEATURE_IDS = ['claude-sonnet-4-6'];

// Benchmarks to surface a live leader for. Score and leading model are computed
// from data/benchmarks.json. suffix keeps the existing "%" vs bare-number look.
const FEATURED_BENCHMARKS: { id: string; tag: string; suffix: string }[] = [
  { id: 'swe_bench', tag: 'SWE-BENCH', suffix: '%' },
  { id: 'mmlu_pro', tag: 'MMLU-PRO', suffix: '' },
  { id: 'gpqa_diamond', tag: 'GPQA', suffix: '' },
];

const AFTA_ITEM: TickerItem = {
  kind: 'release',
  tag: 'AFTA',
  text: 'v1.0 whitepaper live at /whitepaper',
};

// "Claude Opus 4.8" -> "OPUS 4.8"; "GPT-5.5" -> "GPT-5.5".
function shortTag(name: string): string {
  return name.replace(/^Claude\s+/i, '').toUpperCase();
}

function priceItem(m: PricingModelLite): TickerItem {
  return { kind: 'price', tag: shortTag(m.name), text: `$${m.inputPrice} / $${m.outputPrice}`, mono: 'per Mtok' };
}

function allModels(pricing: PricingDataLite): PricingModelLite[] {
  return pricing.providers.flatMap((p) => p.models);
}

// The newest-released flagship model for a provider, or null if none.
function newestFlagship(pricing: PricingDataLite, providerId: string): PricingModelLite | null {
  const provider = pricing.providers.find((p) => p.id === providerId);
  if (!provider) return null;
  const flagships = provider.models.filter((m) => m.tier === 'flagship');
  if (!flagships.length) return null;
  return flagships.reduce((newest, m) => ((m.released ?? '') > (newest.released ?? '') ? m : newest));
}

export function buildPriceItems(pricing: PricingDataLite): TickerItem[] {
  const picks: PricingModelLite[] = [];
  for (const providerId of FLAGSHIP_PROVIDERS) {
    const m = newestFlagship(pricing, providerId);
    if (m) picks.push(m);
  }
  const all = allModels(pricing);
  for (const id of ALSO_FEATURE_IDS) {
    const m = all.find((x) => x.id === id);
    if (m) picks.push(m);
  }
  return picks.map(priceItem);
}

export function buildBenchmarkItems(benchmarks: BenchmarkDataLite): TickerItem[] {
  const items: TickerItem[] = [];
  for (const b of FEATURED_BENCHMARKS) {
    const scored = benchmarks.models.filter((m) => typeof m.scores?.[b.id] === 'number');
    if (!scored.length) continue;
    const leader = scored.reduce((best, m) => (m.scores[b.id] > best.scores[b.id] ? m : best));
    items.push({
      kind: 'benchmark',
      tag: b.tag,
      text: `leader ${leader.model}`,
      mono: `${leader.scores[b.id]}${b.suffix}`,
      cls: 'info',
    });
  }
  return items;
}

export function buildEvergreenTickerItems(
  pricing: PricingDataLite,
  benchmarks: BenchmarkDataLite,
): TickerItem[] {
  return [...buildPriceItems(pricing), ...buildBenchmarkItems(benchmarks), AFTA_ITEM];
}
