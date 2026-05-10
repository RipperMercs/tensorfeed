/**
 * AI funding portfolio registry.
 *
 * Hand-curated catalog of disclosed AI-related capital commitments: equity
 * stakes, compute purchase commitments, and capacity partnerships. Each
 * entry is tagged with the recipient's primary silicon dependency so we
 * can analyze the customer-investor loop introduced in the 2026-05-10
 * Nvidia article (/originals/nvidia-40b-equity-customer-investor-loop).
 *
 * Curation rules:
 *   - Only entries with at least one verifiable public source URL.
 *   - Use the upper bound of the disclosed commitment range as
 *     amount_usd_max. Set amount_usd_disclosed only if a confirmed
 *     drawn-down amount is publicly reported.
 *   - silicon_dependency is the recipient's PRIMARY silicon for AI
 *     workloads at announcement time. "mixed" if the recipient runs
 *     comparable production workloads on more than one vendor.
 *   - commercial_quid_pro_quo is what the investor gets back beyond
 *     the financial return: capacity orders, supply commitments,
 *     roadmap alignment, etc.
 *
 * Update cadence: as new commitments hit the public record. The TF
 * editorial process should add an entry when a related original article
 * goes out, and standalone entries when reporting picks up something
 * we did not write about.
 */

export type FundingType =
  | 'private-equity'
  | 'public-equity'
  | 'convertible-note'
  | 'warrant'
  | 'compute-commitment'
  | 'capacity-partnership'
  | 'undisclosed';

export type SiliconDependency =
  | 'nvidia'
  | 'tpu'
  | 'trainium'
  | 'mi400'
  | 'maia'
  | 'mixed'
  | 'unknown';

export interface FundingCommitment {
  id: string;
  from: string;
  to: string;
  amount_usd_max: number;
  amount_usd_disclosed: number | null;
  announced_date: string;
  type: FundingType;
  recipient_silicon_dependency: SiliconDependency;
  commercial_quid_pro_quo: string;
  source_urls: string[];
  notes: string;
}

export const FUNDING_REGISTRY_LAST_UPDATED = '2026-05-10';

export interface FundingAttribution {
  curator: string;
  curator_url: string;
  underlying_sources: string;
  license: string;
  notes: string;
}

export const FUNDING_ATTRIBUTION: FundingAttribution = {
  curator: 'TensorFeed.ai editorial',
  curator_url: 'https://tensorfeed.ai/funding',
  underlying_sources:
    'SEC filings, hyperscaler press releases, reputable trade reporting (CNBC, The Information, etc.). Each entry carries source_urls citing the public record we drew from.',
  license:
    'TF curation, tagging, and commercial_quid_pro_quo summaries are CC-BY 4.0. Underlying public-record sources retain their original license.',
  notes:
    'Hand-curated. Update cadence is editorial: an entry is added when a related original article goes out, or when reporting picks up something we have not covered.',
};

export interface FundingFilterOptions {
  silicon_dependency?: string;
  type?: string;
  from?: string;
  to?: string;
  since?: string;
  until?: string;
}

export interface FundingSummary {
  total_commitments: number;
  total_amount_usd_max: number;
  by_silicon_dependency: Record<string, number>;
  by_type: Record<string, number>;
  by_from: Record<string, number>;
}

export interface FundingRegistryResponse {
  ok: true;
  count: number;
  last_updated: string;
  filters: FundingFilterOptions;
  summary: FundingSummary;
  commitments: FundingCommitment[];
  attribution: FundingAttribution;
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function buildSummary(items: FundingCommitment[]): FundingSummary {
  const bySilicon: Record<string, number> = {};
  const byType: Record<string, number> = {};
  const byFrom: Record<string, number> = {};
  let totalUsd = 0;
  for (const c of items) {
    bySilicon[c.recipient_silicon_dependency] = (bySilicon[c.recipient_silicon_dependency] ?? 0) + 1;
    byType[c.type] = (byType[c.type] ?? 0) + 1;
    byFrom[c.from] = (byFrom[c.from] ?? 0) + 1;
    totalUsd += c.amount_usd_max;
  }
  return {
    total_commitments: items.length,
    total_amount_usd_max: totalUsd,
    by_silicon_dependency: bySilicon,
    by_type: byType,
    by_from: byFrom,
  };
}

export function readFundingRegistry(options: FundingFilterOptions = {}): FundingRegistryResponse {
  const filters: FundingFilterOptions = {};
  let items = FUNDING_REGISTRY.slice();

  if (options.silicon_dependency) {
    filters.silicon_dependency = options.silicon_dependency;
    items = items.filter((c) => c.recipient_silicon_dependency === options.silicon_dependency);
  }
  if (options.type) {
    filters.type = options.type;
    items = items.filter((c) => c.type === options.type);
  }
  if (options.from) {
    filters.from = options.from;
    items = items.filter((c) => c.from.toLowerCase() === options.from!.toLowerCase());
  }
  if (options.to) {
    filters.to = options.to;
    items = items.filter((c) => c.to.toLowerCase() === options.to!.toLowerCase());
  }
  if (options.since && ISO_DATE_RE.test(options.since)) {
    filters.since = options.since;
    items = items.filter((c) => c.announced_date >= options.since!);
  }
  if (options.until && ISO_DATE_RE.test(options.until)) {
    filters.until = options.until;
    items = items.filter((c) => c.announced_date <= options.until!);
  }

  // Sort by amount desc within date desc: most recent first, ties broken by size.
  items.sort((a, b) => {
    if (a.announced_date !== b.announced_date) {
      return a.announced_date < b.announced_date ? 1 : -1;
    }
    return b.amount_usd_max - a.amount_usd_max;
  });

  return {
    ok: true,
    count: items.length,
    last_updated: FUNDING_REGISTRY_LAST_UPDATED,
    filters,
    summary: buildSummary(items),
    commitments: items,
    attribution: FUNDING_ATTRIBUTION,
  };
}

export const FUNDING_REGISTRY: FundingCommitment[] = [
  {
    id: 'nvidia-openai-feb-2026',
    from: 'Nvidia',
    to: 'OpenAI',
    amount_usd_max: 30_000_000_000,
    amount_usd_disclosed: null,
    announced_date: '2026-02-15',
    type: 'private-equity',
    recipient_silicon_dependency: 'nvidia',
    commercial_quid_pro_quo:
      'Multi-year compute orders, roadmap alignment on the silicon side. Functions as a ten-year option on OpenAI staying primarily on Nvidia silicon.',
    source_urls: [
      'https://www.cnbc.com/2026/05/08/nvidia-ai-equity-investments.html',
    ],
    notes:
      'The anchor of the 2026 Nvidia equity book. Roughly 75% of the disclosed $40B+ portfolio sits in this single position.',
  },
  {
    id: 'nvidia-corning-may-2026',
    from: 'Nvidia',
    to: 'Corning',
    amount_usd_max: 3_200_000_000,
    amount_usd_disclosed: null,
    announced_date: '2026-05-08',
    type: 'public-equity',
    recipient_silicon_dependency: 'nvidia',
    commercial_quid_pro_quo:
      'Three new US fiber-optic facilities retooled to Nvidia rack-scale specifications. Required for the GB200 NVL72 form factor and the Rubin generation that follows.',
    source_urls: [
      'https://www.cnbc.com/2026/05/08/nvidia-ai-equity-investments.html',
    ],
    notes:
      'Capital is the lever to commit Corning to fab capex on Nvidia\'s timeline rather than acquire Corning outright.',
  },
  {
    id: 'nvidia-iren-may-2026',
    from: 'Nvidia',
    to: 'IREN',
    amount_usd_max: 2_100_000_000,
    amount_usd_disclosed: null,
    announced_date: '2026-05-08',
    type: 'public-equity',
    recipient_silicon_dependency: 'nvidia',
    commercial_quid_pro_quo:
      'Up to 5 GW of Nvidia DSX-branded data center capacity across IREN facilities. Roughly 2-3 million accelerators worth of deployment runway by current rack densities.',
    source_urls: [
      'https://www.cnbc.com/2026/05/08/nvidia-ai-equity-investments.html',
    ],
    notes:
      'Cleanest read of the customer-investor loop: equity in, system orders out, all on Nvidia paper.',
  },
  {
    id: 'anthropic-google-tpu-200b-2026',
    from: 'Anthropic',
    to: 'Google Cloud + Broadcom',
    amount_usd_max: 200_000_000_000,
    amount_usd_disclosed: null,
    announced_date: '2026-05-05',
    type: 'compute-commitment',
    recipient_silicon_dependency: 'tpu',
    commercial_quid_pro_quo:
      'Anthropic gets five years of TPU capacity at gigawatt scale (new builds online starting 2027). Google effectively recollects most of its $40B Anthropic equity stake on the compute side.',
    source_urls: [
      'https://www.theinformation.com/articles/anthropic-200-billion-google-cloud-tpu-deal',
    ],
    notes:
      'Direction reversed: this is Anthropic committing capital to Google Cloud, not equity flowing to Anthropic. Reported May 5 by The Information; neither side has confirmed or denied.',
  },
  {
    id: 'google-anthropic-equity-40b',
    from: 'Google',
    to: 'Anthropic',
    amount_usd_max: 40_000_000_000,
    amount_usd_disclosed: null,
    announced_date: '2025-10-15',
    type: 'private-equity',
    recipient_silicon_dependency: 'mixed',
    commercial_quid_pro_quo:
      'Anthropic runs production workloads on both Google TPU and Nvidia silicon at announcement time. The compute commitment in 2026-05 effectively recycles most of this equity back to Google.',
    source_urls: [
      'https://www.theinformation.com/articles/anthropic-google-equity-tranches',
    ],
    notes:
      'Multi-tranche commitment. Pairs with the 2026-05 $200B TPU compute deal as one half of a circular flow.',
  },
  {
    id: 'amazon-anthropic-25b-2026-04',
    from: 'Amazon',
    to: 'Anthropic',
    amount_usd_max: 25_000_000_000,
    amount_usd_disclosed: 25_000_000_000,
    announced_date: '2026-04-25',
    type: 'private-equity',
    recipient_silicon_dependency: 'mixed',
    commercial_quid_pro_quo:
      'Over $100B of AWS infrastructure spending committed over the following decade. AWS Trainium adoption deepens on the Anthropic side.',
    source_urls: [
      'https://aws.amazon.com/about-aws/whats-new/2026/04/anthropic-investment/',
    ],
    notes:
      'Brings Amazon\'s total Anthropic commitment to $33B. Compounds the pre-existing $4B baseline plus the 2024 $2.75B follow-on.',
  },
  {
    id: 'microsoft-openai-2019-2023',
    from: 'Microsoft',
    to: 'OpenAI',
    amount_usd_max: 13_000_000_000,
    amount_usd_disclosed: 13_000_000_000,
    announced_date: '2023-01-23',
    type: 'private-equity',
    recipient_silicon_dependency: 'nvidia',
    commercial_quid_pro_quo:
      'Exclusive Azure cloud partnership for OpenAI training and inference, profit-share rights, deep API integration into Microsoft products.',
    source_urls: [
      'https://blogs.microsoft.com/blog/2023/01/23/microsoftandopenaiextendpartnership/',
    ],
    notes:
      'Multi-tranche through 2019-2023 totaling roughly $13B. The original anchor of the modern AI capital stack; remains the largest AI lab equity stake outside Nvidia\'s 2026 portfolio.',
  },
  {
    id: 'anthropic-spacexai-colossus-2026-05',
    from: 'Anthropic',
    to: 'SpaceXAI',
    amount_usd_max: 0,
    amount_usd_disclosed: null,
    announced_date: '2026-05-09',
    type: 'capacity-partnership',
    recipient_silicon_dependency: 'nvidia',
    commercial_quid_pro_quo:
      'Anthropic gains routing access to Colossus 1 (220K+ Nvidia H100/H200/GB200 accelerators) for Claude Pro and Max. Stated interest in multi-gigawatt orbital AI compute capacity. Financial terms undisclosed.',
    source_urls: [
      'https://www.spacex.com/news/2026/05/colossus-anthropic-partnership',
    ],
    notes:
      'Capacity partnership rather than direct equity. amount_usd_max set to 0 because no monetary commitment was disclosed; the deal is structurally non-financial in the public record.',
  },
];
