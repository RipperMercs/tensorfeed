/**
 * Per-ticker AI-company intelligence envelope.
 *
 * Aggregates four free siblings into a single paid call:
 *   1. /api/sec/filings/{cik}/recent  (the latest 10 EDGAR filings)
 *   2. /api/news                       (latest 10 news mentions for the ticker)
 *   3. /api/funding                    (rounds where the company is an investor)
 *   4. Company cohort metadata         (display name, category, AI angle)
 *
 * The premium layer is the join + freshness guarantee: one captured-at
 * timestamp per envelope, the four buckets gathered in parallel, the
 * news + funding panels filtered by the cohort's curated alias list so
 * agents do not get false positives on overloaded terms ("Apple",
 * "Meta", etc).
 *
 * Why pay for this: a Robinhood-Agentic-Trading agent doing pre-trade
 * context on NVDA would otherwise issue 3 separate free calls (filings,
 * news, funding) and then run its own alias filter. The envelope here
 * is one call, alias-filtered, with a single freshness SLA. Worth a
 * credit when the agent is in a hot path.
 *
 * AI_COMPANY_NEWS_ALIASES MUST stay in sync with the news_aliases
 * arrays in src/data/ai-companies/companies.ts. The Pages page filter
 * (client-side, on /ai-stocks/{ticker}) and the Worker filter (here,
 * server-side) read the same canonical list. Drift = surprised agents.
 */

import type { Env, Article } from './types';
import { AI_BELLWETHERS, type SecFiling, getCompanyFilingsSnapshot } from './sec-filings-fetcher';
import { FUNDING_ROUNDS, type FundingRound } from './funding';

// ─── Cohort aliases (mirror of src/data/ai-companies/companies.ts) ─

export const AI_COMPANY_NEWS_ALIASES: Record<string, ReadonlyArray<string>> = {
  NVDA: ['NVIDIA', 'Nvidia'],
  AMD: ['AMD Instinct', 'AMD MI', 'AMD Ryzen', 'AMD ROCm', 'Lisa Su'],
  AVGO: ['Broadcom'],
  TSM: ['TSMC', 'Taiwan Semiconductor'],
  ARM: ['Arm Holdings', 'Arm Ltd'],
  MSFT: ['Microsoft', 'Satya Nadella', 'Mustafa Suleyman'],
  GOOGL: ['Google', 'Alphabet', 'DeepMind', 'Sundar Pichai', 'Demis Hassabis'],
  AMZN: ['Amazon AWS', 'AWS Bedrock', 'AWS Trainium', 'Andy Jassy'],
  ORCL: ['Oracle Cloud', 'Larry Ellison', 'Safra Catz'],
  PLTR: ['Palantir', 'Alex Karp'],
  SMCI: ['Super Micro', 'Supermicro'],
  AAPL: ['Apple Intelligence', 'Apple Inc', 'Tim Cook', 'iPhone Intelligence'],
  META: ['Meta Platforms', 'Mark Zuckerberg', 'Llama 3', 'Llama 4', 'Meta AI'],
  TSLA: ['Tesla FSD', 'Tesla Optimus', 'Tesla Dojo', 'Tesla Autopilot'],
};

export const AI_COMPANY_AI_ANGLE: Record<string, string> = {
  NVDA: 'The dominant supplier of AI training and inference GPUs (H100, H200, B200, Rubin). Every frontier lab buys from here.',
  AMD: 'MI300 / MI325 / MI350 series Instinct accelerators; the credible second-source story for hyperscaler AI compute.',
  AVGO: 'Custom AI ASICs (Google TPU partner, Meta MTIA partner), networking silicon for hyperscale fabrics.',
  TSM: 'The fab. N3 and N2 capacity backs every leading-edge AI accelerator (NVIDIA, AMD, Apple, AVGO, ARM customers).',
  ARM: 'CPU architecture underneath NVIDIA Grace, AWS Graviton, Apple silicon, and the on-device inference cohort.',
  MSFT: 'Azure OpenAI Service, Copilot product line, capex leader, sole exclusive OpenAI cloud partner (until the 2025 Microsoft-OpenAI reset).',
  GOOGL: 'Gemini frontier model line, TPU silicon, Google Cloud + DeepMind, owner of the Android Gemini Intelligence distribution lever.',
  AMZN: 'AWS Bedrock + Trainium + Inferentia, $8B Anthropic investment, Project Rainier compute build for Anthropic training.',
  ORCL: 'OCI GPU capacity reseller to OpenAI, xAI, and Microsoft; Stargate datacenter program partner.',
  PLTR: 'AIP enterprise + government deployments; the canonical pure-play public AI software vendor by revenue.',
  SMCI: 'High-volume integrator of NVIDIA + AMD AI servers for hyperscaler and enterprise build-outs.',
  AAPL: 'Apple Intelligence on-device + Private Cloud Compute; iOS distribution; partner of OpenAI, Anthropic, and Google through the Extensions framework.',
  META: 'Llama open-weights line, Reality Labs, MSL talent group, Meta AI consumer + enterprise rollout.',
  TSLA: 'FSD + Optimus humanoid robotics + Dojo training compute; xAI Colossus orbital infrastructure ties.',
};

// ─── Types ──────────────────────────────────────────────────────────

export interface AiCompanyMeta {
  ticker: string;
  cik: string;
  display_name: string;
  category: string;
  ai_angle: string;
  exchange: 'NASDAQ' | 'NYSE';
}

export interface AiCompanyNewsArticle {
  id: string;
  title: string;
  url: string;
  source: string;
  publishedAt: string;
  matched_aliases: ReadonlyArray<string>;
}

export interface AiCompanyEnvelope {
  ok: true;
  capturedAt: string;
  ticker: string;
  cohort_size: number;
  company: AiCompanyMeta;
  filings: {
    count: number;
    items: SecFiling[];
    source: 'data.sec.gov/submissions';
    license: 'Public domain (17 USC 105). SEC EDGAR.';
  };
  news: {
    count: number;
    items: AiCompanyNewsArticle[];
    aliases_used: ReadonlyArray<string>;
    sanitization: 'enabled';
  };
  funding_as_investor: {
    count: number;
    items: FundingRound[];
    description: string;
  };
  attribution: {
    sources: ReadonlyArray<string>;
    notes: string;
  };
}

// ─── Exchange lookup (mirror) ───────────────────────────────────────

const EXCHANGE: Record<string, 'NASDAQ' | 'NYSE'> = {
  NVDA: 'NASDAQ',
  AMD: 'NASDAQ',
  AVGO: 'NASDAQ',
  TSM: 'NYSE',
  ARM: 'NASDAQ',
  MSFT: 'NASDAQ',
  GOOGL: 'NASDAQ',
  AMZN: 'NASDAQ',
  ORCL: 'NYSE',
  PLTR: 'NASDAQ',
  SMCI: 'NASDAQ',
  AAPL: 'NASDAQ',
  META: 'NASDAQ',
  TSLA: 'NASDAQ',
};

// ─── Pure helpers ───────────────────────────────────────────────────

export function findBellwether(ticker: string) {
  const upper = ticker.toUpperCase();
  return AI_BELLWETHERS.find((b) => b.ticker === upper);
}

export function isInCohort(ticker: string): boolean {
  return findBellwether(ticker) !== undefined;
}

/**
 * Filter an article list against a ticker's curated alias set. Returns
 * articles with at least one alias hit, tagged with which aliases hit.
 * Matching is case-insensitive substring over title + snippet.
 */
export function filterNewsByAliases(
  articles: ReadonlyArray<Article>,
  aliases: ReadonlyArray<string>,
  limit = 10,
): AiCompanyNewsArticle[] {
  const lowerAliases = aliases.map((a) => a.toLowerCase());
  const out: AiCompanyNewsArticle[] = [];
  for (const article of articles) {
    const haystack = `${article.title} ${article.snippet ?? ''}`.toLowerCase();
    const matched = aliases.filter((_alias, idx) => haystack.includes(lowerAliases[idx]));
    if (matched.length === 0) continue;
    out.push({
      id: article.id,
      title: article.title,
      url: article.url,
      source: article.source,
      publishedAt: article.publishedAt,
      matched_aliases: matched,
    });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * Filter FUNDING_ROUNDS for rounds where the company shows up in
 * leadInvestors or notableInvestors. Public-equity companies sometimes
 * lead strategic rounds in AI startups (Google to Anthropic, Amazon to
 * Anthropic). This surfaces that exposure as a per-ticker signal.
 * Match is case-insensitive substring against the display_name + any
 * alias that looks like a company name (skips person-name aliases).
 */
export function filterFundingByInvestor(
  rounds: ReadonlyArray<FundingRound>,
  displayName: string,
  aliases: ReadonlyArray<string>,
  limit = 10,
): FundingRound[] {
  const candidates = [displayName, ...aliases].map((s) => s.toLowerCase());
  const out: FundingRound[] = [];
  for (const round of rounds) {
    const investorList = [...round.leadInvestors, ...round.notableInvestors];
    const investorMatched = investorList.some((inv) => {
      const lowerInv = inv.toLowerCase();
      return candidates.some((c) => lowerInv.includes(c) || c.includes(lowerInv));
    });
    if (!investorMatched) continue;
    out.push(round);
    if (out.length >= limit) break;
  }
  return out;
}

// ─── Pure builder ───────────────────────────────────────────────────

/**
 * Pure builder. Takes pre-loaded inputs and returns the envelope shape.
 * Unit-testable without env or KV. The KV-aware wrapper below loads
 * the inputs and calls this.
 */
export function buildAiCompanyEnvelope(
  ticker: string,
  filings: ReadonlyArray<SecFiling>,
  articles: ReadonlyArray<Article>,
  fundingRounds: ReadonlyArray<FundingRound>,
  capturedAt: string,
): AiCompanyEnvelope | null {
  const bellwether = findBellwether(ticker);
  if (!bellwether) return null;
  const aliases = AI_COMPANY_NEWS_ALIASES[bellwether.ticker] ?? [];
  const news = filterNewsByAliases(articles, aliases, 10);
  const investorFunding = filterFundingByInvestor(
    fundingRounds,
    bellwether.display_name,
    aliases,
    10,
  );
  const filingsTop = filings.slice(0, 10);
  const exchange = EXCHANGE[bellwether.ticker] ?? 'NASDAQ';
  return {
    ok: true,
    capturedAt,
    ticker: bellwether.ticker,
    cohort_size: AI_BELLWETHERS.length,
    company: {
      ticker: bellwether.ticker,
      cik: bellwether.cik,
      display_name: bellwether.display_name,
      category: bellwether.category,
      ai_angle: AI_COMPANY_AI_ANGLE[bellwether.ticker] ?? '',
      exchange,
    },
    filings: {
      count: filingsTop.length,
      items: filingsTop,
      source: 'data.sec.gov/submissions',
      license: 'Public domain (17 USC 105). SEC EDGAR.',
    },
    news: {
      count: news.length,
      items: news,
      aliases_used: aliases,
      sanitization: 'enabled',
    },
    funding_as_investor: {
      count: investorFunding.length,
      items: investorFunding,
      description:
        'Strategic and equity rounds where this company is listed as a lead or notable investor in TensorFeed funding registry.',
    },
    attribution: {
      sources: [
        'SEC EDGAR (data.sec.gov/submissions). Public domain (17 USC 105).',
        'TensorFeed.ai news aggregator (sanitized for agents).',
        'TensorFeed.ai funding registry (editorial).',
      ],
      notes:
        'Envelope captured at one moment in time; filings refresh every 6 hours, news every 10 minutes. Freshness SLA: 9h (filings cadence dominates).',
    },
  };
}

// ─── KV-aware wrapper ──────────────────────────────────────────────

/**
 * Loads the four inputs (cohort snapshot for the ticker, articles from
 * KV, funding rounds from in-Worker static, plus the cohort registry)
 * and composes the envelope. Returns null if the ticker is not in the
 * cohort; callers translate that to 404.
 */
export async function getAiCompanyEnvelope(env: Env, ticker: string): Promise<AiCompanyEnvelope | null> {
  const bellwether = findBellwether(ticker);
  if (!bellwether) return null;

  const filingsSnap = await getCompanyFilingsSnapshot(env, bellwether.cik);
  const filings: SecFiling[] = filingsSnap?.filings ?? [];

  const rawArticles = (await env.TENSORFEED_NEWS.get('articles', 'json')) as Article[] | null;
  const articles = rawArticles ?? [];

  // Bill staleness against the REAL SEC filings snapshot capture time (the 6h
  // cron), not build/request time. Stamping new Date() here defeated the 9h
  // freshness no-charge: the staleness check always saw age ~= 0, so a stalled
  // SEC cron still charged 1 credit per ticker for stale filings. Fall back to
  // build time only when no snapshot exists (cold start before first cron run).
  const capturedAt = filingsSnap?.capturedAt ?? new Date().toISOString();
  return buildAiCompanyEnvelope(ticker, filings, articles, FUNDING_ROUNDS, capturedAt);
}
