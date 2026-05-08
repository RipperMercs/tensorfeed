/**
 * Institutional data licensing offering.
 *
 * Curated bulk-data products for buyers that don't fit the per-call agent
 * model: hedge funds tracking AI ecosystem signals, research firms with
 * proprietary models, training-data buyers, news/dataset aggregators.
 *
 * Surface on /api/data-licensing — read-only catalog of available
 * datasets, suggested pricing, refresh cadence, and license terms.
 * Actual fulfillment is manual for v1: buyers email contact@tensorfeed.ai
 * with the dataset they want, we negotiate, deliver via signed S3 URLs
 * (or equivalent), collect payment in USDC over x402 or wire.
 *
 * v2 work (when there's customer demand): generate datasets on a
 * scheduled cron, auto-deliver via per-customer signed URLs, charge
 * via the credits flow with a higher per-unit cost.
 *
 * Everything below is OUR data — no third-party redistribution. License
 * type is enterprise/commercial, distinct from the inference-only
 * license on the per-call premium API.
 */

export interface LicensableDataset {
  id: string;
  name: string;
  description: string;
  /** Suggested target buyer profile in one phrase. */
  targetBuyer: string;
  /** Refresh cadence. */
  refresh: 'daily' | 'weekly' | 'monthly';
  /** Approximate row/record count, helps buyers size what they're getting. */
  approxScale: string;
  /** Available export windows. */
  windows: Array<'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'historical'>;
  /** Format options at delivery. */
  formats: Array<'json' | 'jsonl' | 'csv' | 'parquet'>;
  /** Suggested entry price for a single export, in USD. Can be negotiated for bulk/recurring. */
  suggestedPriceUsd: number;
  /** What this dataset is built from on the TF side; transparency for buyers. */
  derivedFrom: string;
  /** Sample fields included in a row. */
  sampleFields: string[];
}

export const LICENSABLE_DATASETS: LicensableDataset[] = [
  {
    id: 'ai_news_corpus',
    name: 'AI News Corpus',
    description:
      'Full text + categorization of AI news articles ingested across 15+ sources, deduplicated by URL+title hash, enriched with source domain, publish timestamp, and category labels.',
    targetBuyer: 'NLP/sentiment researchers, hedge fund AI desks, news aggregators',
    refresh: 'daily',
    approxScale: '~200-400 articles/day, ~100K articles since launch',
    windows: ['monthly', 'quarterly', 'annual', 'historical'],
    formats: ['jsonl', 'parquet'],
    suggestedPriceUsd: 500,
    derivedFrom: 'TF news ingestion crons; permitted-redistribution sources only.',
    sampleFields: ['id', 'title', 'url', 'source', 'sourceDomain', 'snippet', 'categories', 'publishedAt', 'fetchedAt'],
  },
  {
    id: 'model_pricing_history',
    name: 'AI Model Pricing History',
    description:
      'Daily snapshots of input/output/blended pricing per model across providers, normalized to per-1M-token rates, with provider metadata and pricing-tier classification.',
    targetBuyer: 'Quant desks tracking AI cost trends, AI procurement teams, model-routing infrastructure builders',
    refresh: 'daily',
    approxScale: '~150 models tracked daily, multi-month history',
    windows: ['monthly', 'quarterly', 'annual', 'historical'],
    formats: ['jsonl', 'csv', 'parquet'],
    suggestedPriceUsd: 750,
    derivedFrom: 'Live ingestion from public provider pricing pages, normalized into TF canonical schema.',
    sampleFields: ['date', 'model', 'provider', 'input_per_1m', 'output_per_1m', 'blended_per_1m', 'currency', 'tier'],
  },
  {
    id: 'benchmark_history',
    name: 'Benchmark Score History',
    description:
      'Daily benchmark scores (SWE-Bench, MMLU-Pro, GPQA Diamond, MATH, HumanEval, etc.) per model, with provenance and union-of-keys normalization.',
    targetBuyer: 'AI research firms, model evaluation companies, leaderboard aggregators',
    refresh: 'weekly',
    approxScale: '~150 models × 5+ benchmarks',
    windows: ['monthly', 'quarterly', 'annual', 'historical'],
    formats: ['jsonl', 'csv', 'parquet'],
    suggestedPriceUsd: 750,
    derivedFrom: 'Public benchmark publications, vendor self-reports with citation.',
    sampleFields: ['date', 'model', 'benchmark', 'score', 'normalized', 'source_url'],
  },
  {
    id: 'service_status_history',
    name: 'AI Service Status History',
    description:
      'Per-provider status timeline: operational/degraded/down classification per check interval, incident events, derived uptime percentages.',
    targetBuyer: 'SLA monitoring vendors, AI infrastructure teams, agent reliability platforms',
    refresh: 'daily',
    approxScale: '~10 major providers polled every 2-10 min',
    windows: ['monthly', 'quarterly', 'annual', 'historical'],
    formats: ['jsonl', 'parquet'],
    suggestedPriceUsd: 500,
    derivedFrom: 'TF active probes + public status pages, recorded continuously since launch.',
    sampleFields: ['provider', 'check_at', 'status', 'description', 'components', 'uptime_pct'],
  },
  {
    id: 'agent_traffic_anonymized',
    name: 'Agent Traffic (Anonymized)',
    description:
      'Aggregated agent traffic patterns on TensorFeed: User-Agent fingerprints, request volumes per category, time-of-day distributions, geographic distributions. Wallets and tokens excluded; this is a pure traffic-shape product.',
    targetBuyer: 'AI agent platform companies, infrastructure providers sizing agent demand, market research firms',
    refresh: 'weekly',
    approxScale: 'TF live agent traffic, growing',
    windows: ['monthly', 'quarterly'],
    formats: ['jsonl', 'parquet'],
    suggestedPriceUsd: 1500,
    derivedFrom: 'TF Worker request logs, anonymized: no wallet, no token, no payload content. UA-bucketed.',
    sampleFields: ['week_start', 'agent_ua_bucket', 'category', 'request_count', 'top_endpoints', 'tod_distribution'],
  },
  {
    id: 'mcp_ecosystem_telemetry',
    name: 'MCP Ecosystem Telemetry',
    description:
      'Daily snapshots of the official Model Context Protocol server registry: total servers, active/deprecated, daily added/removed, by-category counts.',
    targetBuyer: 'MCP infrastructure vendors, agent platform researchers, ecosystem analysts',
    refresh: 'daily',
    approxScale: 'Full MCP registry, daily since 2026',
    windows: ['monthly', 'quarterly', 'annual', 'historical'],
    formats: ['jsonl', 'csv'],
    suggestedPriceUsd: 500,
    derivedFrom: 'registry.modelcontextprotocol.io daily ingestion.',
    sampleFields: ['date', 'total', 'active', 'deprecated', 'added_today', 'removed_today', 'by_category'],
  },
];

export const DATA_LICENSING_LAST_UPDATED = '2026-05-08';

export function dataLicensingPayload(): {
  ok: true;
  source: 'tensorfeed.ai';
  lastUpdated: string;
  contact: string;
  license_type: string;
  count: number;
  note: string;
  datasets: LicensableDataset[];
  process: {
    step: number;
    description: string;
  }[];
} {
  return {
    ok: true,
    source: 'tensorfeed.ai',
    lastUpdated: DATA_LICENSING_LAST_UPDATED,
    contact: 'contact@tensorfeed.ai',
    license_type:
      'Enterprise commercial license. Distinct from the inference-only license on the per-call premium API. Bulk redistribution within the licensed buyer\'s organization permitted; resale to third parties or public republication requires separate agreement.',
    count: LICENSABLE_DATASETS.length,
    note:
      'Suggested pricing is a starting point for a single export. Recurring deliveries, custom date ranges, and multi-dataset bundles are negotiable. Payment in USDC over x402, USDC direct on Base, or wire transfer.',
    datasets: LICENSABLE_DATASETS,
    process: [
      {
        step: 1,
        description:
          'Email contact@tensorfeed.ai with the dataset id(s) you want, your buyer organization, and the date window or recurrence cadence.',
      },
      {
        step: 2,
        description: 'We confirm scope, finalize pricing, and send a per-customer signed delivery URL.',
      },
      {
        step: 3,
        description:
          'You pay via USDC on Base (lowest friction) or wire. Delivery URL becomes active on confirmed payment.',
      },
      {
        step: 4,
        description:
          'For recurring deliveries, we set up a per-customer cron + per-customer S3 prefix. Automated v2 will land at /api/data-licensing/orders.',
      },
    ],
  };
}
