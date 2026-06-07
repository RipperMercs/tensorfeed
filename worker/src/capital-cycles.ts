/**
 * Capital Cycles: historical technology capital-buildout registry.
 *
 * Hand-curated comparison set of past technology capital booms, each summarized
 * on a fixed metric skeleton. The only cross-era-comparable ranked metric is
 * peak_capex_pct_gdp (annual sector capex as a percent of national GDP). Absolute
 * real_capital_raised_usd_b is era-dollar and descriptive only (see
 * REAL_CAPITAL_NOTE); physical units differ across cycles and are descriptive
 * only. radio-1929 was an equities-led mania, not a capex buildout, so its
 * peak_capex_pct_gdp is null and it is excluded from the ranking. Every figure
 * carries a source; null where not reliably available. The historical rows are
 * the denominator; the live AI cycle (deriveCurrentAiCycle, from AI_CURRENT) is
 * the numerator the premium verdict ranks against them. Editorial cadence on
 * redeploy. No cron, no live ingest. Sister to ai-datacenters.ts.
 */

export type CapitalCycleEra = 'pre_1931' | 'modern';
export type CapitalCycleConfidence = 'high' | 'medium' | 'low';

export interface CapitalCycleSource {
  name: string;
  url: string;
  license: string;
}

export interface CapitalCycleEntry {
  id: string;
  name: string;
  era: CapitalCycleEra;
  period: string;
  lead_sector: string;
  peak_capex_pct_gdp: number | null; // the only ranked axis
  capex_pct_gdp_basis: string;
  real_capital_raised_usd_b: number | null; // descriptive only, not ranked
  physical_unit: string;
  physical_value: number | null;
  overbuild_ratio: number | null;
  peak_to_trough_drawdown_pct: number | null;
  boom_to_bust_years: number | null;
  survival_rate_pct: number | null;
  analogy_note: string;
  sources: CapitalCycleSource[];
  confidence: CapitalCycleConfidence;
}

export interface GdpDenominator {
  value_usd_t: number;
  source_url: string;
  as_of: string;
}

export interface AiCurrentConstant {
  annual_capex_usd_b: number;
  as_of: string;
  basis: string;
  range_low_pct: number;
  range_high_pct: number;
  source_urls: string[];
}

export interface CurrentAiCycle {
  id: 'ai-buildout';
  name: string;
  era: 'modern';
  peak_capex_pct_gdp: number | null;
  annual_capex_usd_b: number;
  capex_range_low_pct: number;
  capex_range_high_pct: number;
  physical_unit: string;
  physical_value: number | null;
  in_progress: true;
  captured_at: string;
  basis: string;
}

export const CAPITAL_CYCLES_LAST_UPDATED = '2026-06-07';

export const REAL_CAPITAL_NOTE =
  'Absolute real_capital_raised_usd_b figures are era-dollar estimates with inconsistent deflation methods across cycles and are descriptive only, not cross-comparable. The cross-era ranking uses peak_capex_pct_gdp only.';

// Transcribe from capital-cycles-data.json gdp_denominator.
export const GDP_DENOMINATOR: GdpDenominator = {
  value_usd_t: 31.8,
  source_url: 'https://fred.stlouisfed.org/series/GDP',
  as_of: 'Q1 2026 nominal GDP, seasonally adjusted annual rate, 31819.464 billion USD, BEA via FRED, updated 2026-05-28',
};

// Transcribe from capital-cycles-data.json ai_current_cycle.
export const AI_CURRENT: AiCurrentConstant = {
  annual_capex_usd_b: 600,
  as_of: '2026',
  basis:
    'AI infrastructure annual capex numerator for the current cycle, expressed on the same annual-flow-over-national-GDP basis as the historical rows. Point estimate: the largest US hyperscalers (Microsoft, Alphabet, Amazon, Meta) guided roughly 600 to 725 billion dollars of 2026 capital expenditure, the bulk of it AI and datacenter (IEEE ComSoc; Tom’s Hardware; datacenterrichness). 600 billion is the conservative low end of that 2026 range; on US GDP near 31.8 trillion dollars that is about 1.9 percent. This is a current run-rate, not a realized peak, because the cycle is in progress. It is also a lower bound: it excludes the AI labs and neoclouds (OpenAI, Oracle, xAI, CoreWeave, Anthropic) and sovereign buildouts, which add hundreds of billions more. Estimates of AI capex as a share of GDP range widely by definition: about 0.8 percent when total AI capex is divided by GLOBAL GDP (Goldman Sachs), up to about 2.2 to 2.4 percent on the broadest 2026 hyperscaler guidance over US GDP. The ranking uses the US-capex-over-US-GDP point (about 1.9 percent) to match the national-GDP basis of the historical cycles and carries the wider range as a caveat.',
  range_low_pct: 0.8,
  range_high_pct: 2.4,
  source_urls: [
    'https://techblog.comsoc.org/2025/12/22/hyperscaler-capex-600-bn-in-2026-a-36-increase-over-2025-while-global-spending-on-cloud-infrastructure-services-skyrockets/',
    'https://www.tomshardware.com/tech-industry/big-tech/big-techs-ai-spending-plans-reach-725-billion',
    'https://www.goldmansachs.com/insights/articles/tracking-trillions-the-assumptions-shaping-scale-of-the-ai-build-out',
  ],
};

export const CAPITAL_CYCLES_ATTRIBUTION = {
  source: 'TensorFeed editorial capital-cycles registry',
  policy:
    'Each row summarizes a historical technology capital buildout on a fixed metric skeleton. Figures are sourced; null where not reliably available (see capex_pct_gdp_basis and analogy_note per row). Cross-cycle ranking uses peak capex as a percent of national GDP only; absolute dollars and physical units are descriptive. radio-1929 was an equities-led mania, not a capex buildout, so it carries a null capex share and is excluded from the ranking.',
};

// Transcribe from capital-cycles-data.json considered_excluded.
export const CONSIDERED_EXCLUDED = [
  { id: 'canal-mania', reason: 'Sparse, hard-to-source pre-1840 capital figures.' },
  { id: 'crypto-spac-2021', reason: 'Off-thesis for a physical capex-buildout frame.' },
];

export const CAPITAL_CYCLES: CapitalCycleEntry[] = [
  {
    id: 'uk-railway-mania',
    name: 'UK Railway Mania',
    era: 'pre_1931',
    period: '1844-1850',
    lead_sector: 'railways',
    peak_capex_pct_gdp: 7.0,
    capex_pct_gdp_basis:
      'Definition: UK railway capital investment as a percent of national income (GDP). Peak year roughly 1847, when annual railway investment ran near 44 million pounds (Odlyzko notes this exceeded the roughly 50 million pound national government budget of the period) and cumulative authorized commitments reached about 100 million pounds, putting peak annual railway spend in the neighborhood of 5 to 7 percent of GDP. Sources: Andrew Odlyzko, The British Railway Mania of the 1840s (University of Minnesota working papers, hallucinations.pdf and related); G. R. Hawke, Railways and Economic Growth in England and Wales 1840-1870; corroborated by Wikipedia Railway Mania entry citing the roughly 7 percent figure for 1845-1847 commitments. Caveat: some economic historians put peak railway investment as high as 10 to 20 percent of private capital formation or GDP in individual peak years; 7.0 is the conservative low end of the defensible range, chosen because higher figures conflate authorized commitments and cumulative outlays with single-year flow. Disagreement recorded here rather than resolved.',
    real_capital_raised_usd_b: 5.5,
    physical_unit: 'track miles built',
    physical_value: 6220,
    overbuild_ratio: null,
    peak_to_trough_drawdown_pct: 64.1,
    boom_to_bust_years: 5,
    survival_rate_pct: null,
    analogy_note:
      'Privately financed through equity calls on partly paid shares, which forced ongoing capital from shareholders even as dividends collapsed; railway investment ran near 5 to 7 percent of UK GDP at the 1847 peak and cumulative outlay reached about 250 million pounds by 1850, close to half of one year of British GDP. The real_capital figure here is a conservative CPI conversion of 250 million 1850 pounds (roughly 4.4 billion 2026 pounds, about 5.5 billion USD); measured as a share of GDP instead, the buildout is an order of magnitude larger, which is the honest divergence between CPI and GDP-share methods. The Railway Share Index fell about 64 percent from its October 1845 peak to its April 1850 trough (Campbell and Turner index). Losses fell on individual British investors, not the state.',
    sources: [
      {
        name: 'Odlyzko, British Railway Mania',
        url: 'https://www-users.cse.umn.edu/~odlyzko/doc/hallucinations.pdf',
        license: 'Editorial citation of a public source.',
      },
    ],
    confidence: 'medium',
  },
  {
    id: 'us-railroad-1873',
    name: 'US Railroad Boom and Panic of 1873',
    era: 'pre_1931',
    period: '1868-1873',
    lead_sector: 'railways',
    peak_capex_pct_gdp: 4.8,
    capex_pct_gdp_basis:
      'Definition: US railroad capital raised (stocks and bonds issued by railroad companies) as a percent of GNP. Best-sourced railroad-era peak value is 4.8 percent of GNP, equal to 25.3 percent of gross fixed capital investment, computed for 1880-1884: railroad securities issued totaled about 2.72 billion dollars (Tufano 1997) against GNP of about 56 billion dollars and gross fixed capital investment of about 10.73 billion dollars over those five years (Gallman GNP series, 2020). Sources: Robert Gallman GNP series; Peter Tufano (1997) on 19th-century US railroad securities issuance; cross-referenced through the David Chi Zhang MReview synthesis of both. Caveat (important): this 4.8 percent figure is the 1880-1884 railroad-investment peak, NOT the 1868-1873 boom window that defines this cycle. No equally clean securities-issuance-over-GNP calc exists specifically for 1868-1873, but the two windows are the same secular railroad-capital era and 1880-1884 is the documented peak intensity, so it is used here as the era benchmark with this caveat stated plainly. Broader economic-history accounts put railroad investment at roughly 15 to 20 percent of total US national investment across the 1870s; the 4.8 percent of GNP figure is narrower (capital raised over total output) and is the conservative, best-documented choice.',
    real_capital_raised_usd_b: null,
    physical_unit: 'route miles of track added',
    physical_value: 33000,
    overbuild_ratio: null,
    peak_to_trough_drawdown_pct: null,
    boom_to_bust_years: 5,
    survival_rate_pct: null,
    analogy_note:
      'Debt and equity financed, with roughly three quarters of US railroad securities held by British and Dutch investors chasing yield unavailable in Europe; railroad expansion absorbed an estimated 15 to 20 percent of total US national investment across the 1870s, and railroad securities issuance ran near 4.8 percent of GNP (25.3 percent of gross fixed capital investment) at the 1880-1884 peak. About 33000 miles of track were laid between 1868 and 1873, doubling the network from roughly 35000 to 70000 miles, much of it duplicate routes competing for the same freight. New construction collapsed about 78 percent from 1872 to 1875 after Jay Cooke and Company failed in September 1873. A clean lead-sector equity peak-to-trough is left null because no reliable continuous US railroad stock index exists for this window (the Dow rail average began only in 1884). Losses fell on foreign and domestic private investors; the federal role was land grants, not bailouts.',
    sources: [
      {
        name: 'David Chi Zhang, US Railway 19C synthesis',
        url: 'https://david-chi-zhang.github.io/MReview/2022/02/19/USRailway19C/',
        license: 'Editorial citation of a public source.',
      },
    ],
    confidence: 'medium',
  },
  {
    id: 'electrification',
    name: 'US Electrification Buildout',
    era: 'pre_1931',
    period: '1882-1930',
    lead_sector: 'electric utilities',
    peak_capex_pct_gdp: 1.1,
    capex_pct_gdp_basis:
      'Definition: US electric utility (electric light and power) capital expenditure as a percent of GNP. Estimated near 1.0 to 1.2 percent of GNP at the buildout high-intensity phase. The firmest anchor: in the early 1910s the electric power industry was projected to need about 2 billion dollars of capex over five years (about 400 million dollars per year) against US GNP near 35 to 40 billion dollars, which is roughly 1.0 to 1.1 percent of GNP, and the industry was described as second only to railroads in capital requirements (Brian Potter, Construction Physics, The Grid Part II, citing period National Electric Light Association and FTC material). The canonical underlying series is Melville J. Ulmer, Capital in Transportation, Communications, and Public Utilities (NBER, 1960), which traces plant and equipment value rising from about 5 billion dollars in the 1870s to about 10 billion just after 1900 and into the tens of billions by the late 1920s. Caveat: a single clean single-year electric-utility-capex-over-GNP figure for the late-1920s peak could not be extracted from a primary series within this pass (the Census Historical Statistics chapter S and the Ulmer chapter tables were not machine-readable), so 1.1 is a conservative derived estimate anchored on the well-documented early-1910s ratio and the qualitative second-to-railroads framing, not a single-source single-year primary read. Confidence is therefore low.',
    real_capital_raised_usd_b: null,
    physical_unit: 'billion kWh generated annually by 1930',
    physical_value: 114,
    overbuild_ratio: null,
    peak_to_trough_drawdown_pct: 92.7,
    boom_to_bust_years: 3,
    survival_rate_pct: null,
    analogy_note:
      'Financed increasingly through highly leveraged utility holding companies (Insull and peers) stacked on top of operating utilities, a structure that magnified both returns and the eventual collapse; the industry was described as second only to railroads in capital requirements, needing about 2 billion dollars of capex in just the early 1910s, on the order of 1.0 to 1.1 percent of contemporaneous GNP. By 1930 the US generated about 114 billion kWh a year from more than 4000 plants, with 68 percent of homes electrified. A single clean total-buildout dollar figure across 1882 to 1930 is left null because contemporaneous sources do not give one comparable series. The drawdown shown is the Dow Jones Utility Average, which fell about 92.7 percent from its 1929 peak to the 1932 low as the holding-company pyramids unwound; losses fell on millions of retail utility shareholders and prompted the 1935 Public Utility Holding Company Act.',
    sources: [
      {
        name: 'Construction Physics, The Grid Part II',
        url: 'https://www.construction-physics.com/p/the-grid-part-ii-the-golden-age-of',
        license: 'Editorial citation of a public source.',
      },
    ],
    confidence: 'low',
  },
  {
    id: 'bell-telephone',
    name: 'Bell Telephone Buildout',
    era: 'pre_1931',
    period: '1880-1920',
    lead_sector: 'telephone',
    peak_capex_pct_gdp: 0.6,
    capex_pct_gdp_basis:
      'Definition: Bell System (AT&T) telephone plant construction expenditure as a percent of GNP. Estimated near 0.6 percent of GNP at the late buildout. Anchor: by 1930 Bell was spending about 585 million dollars per year on construction (Brian Potter, Construction Physics, Building the Bell System), against US GNP of about 92.2 billion dollars in 1930 (MeasuringWorth nominal GDP series), which is about 0.63 percent of GNP. Bell plant value rose from about 181 million dollars in 1900 to about 1.4 billion dollars by 1920 (about 1.6 percent of the roughly 89 billion dollar 1920 GNP measured as a stock, not an annual flow). Caveat: this cycle window is 1880 to 1920, but the cleanest annual construction-flow figure available (585 million dollars) is for 1930, just past the window; it is used as the best-documented proxy for peak annual telephone construction intensity. Telephone capex never reached the GDP share of railroads or electric utilities; this is the deliberate capital-intensive-but-no-mania control case. Confidence is low because the headline ratio rests on one annual construction figure (single source) divided by an independent GNP series, with the year-vs-window mismatch noted.',
    real_capital_raised_usd_b: null,
    physical_unit: 'telephones in service by 1920',
    physical_value: 12000000,
    overbuild_ratio: null,
    peak_to_trough_drawdown_pct: null,
    boom_to_bust_years: null,
    survival_rate_pct: null,
    analogy_note:
      'Financed mainly through retained earnings and bond issuance by the Bell System rather than a speculative public mania, which is exactly why this cycle is a control case: a capital-intensive network buildout that grew steadily without a defining crash. Telephones in service rose from about 134000 in 1880 to roughly 12 million by 1920, and Bell System assets reached about 1.4 billion dollars by 1920 (up from a 181 million dollar plant value in 1900). Annual Bell construction spend reached about 585 million dollars by 1930, on the order of 0.6 percent of GNP, well below the railroad and electric-utility peaks. Drawdown, overbuild, and boom-to-bust years are null because there was no single boom-bust event; the relevant disruption was the post-1894 patent-expiry entry of independents and the 1913 Kingsbury Commitment regulatory settlement, neither of which is a stock-market crash. Capital risk sat with AT&T bondholders and shareholders.',
    sources: [
      {
        name: 'Construction Physics, Building the Bell System',
        url: 'https://www.construction-physics.com/p/building-the-bell-system',
        license: 'Editorial citation of a public source.',
      },
    ],
    confidence: 'low',
  },
  {
    id: 'radio-1929',
    name: '1920s Radio Boom and 1929 Crash',
    era: 'pre_1931',
    period: '1920-1929',
    lead_sector: 'radio/broadcasting',
    peak_capex_pct_gdp: null,
    capex_pct_gdp_basis:
      'peak_capex_pct_gdp is null on purpose: this was an equities-led bubble, not a physical capex buildout, so capex-to-GDP is not the right lens for this cycle. The 1929 radio boom was a stock-price mania concentrated in RCA, which rose roughly 200-fold during the 1920s to a peak near 549 dollars (about 114.75 split-adjusted) in September 1929 at a price-to-earnings ratio around 72, paid no dividends, and then fell about 98 percent to roughly 2.50 to 2.63 dollars by May 1932 (Finaeon, RCA and the Roaring Twenties; corroborated by The Motley Fool and Sicart Associates accounts of RCA as the defining no-dividend speculative growth stock of the era). Radio broadcasting and set manufacturing were genuinely capital-light relative to railroads and electric utilities (no national track, grid, or copper-plant equivalent), so there is no large sunk-infrastructure spend to express as a share of GNP; consumer set sales did rise from about 60 million dollars in 1922 to 842 million in 1929, but that is consumer purchases, not industry capital formation, and is not the right numerator for a capex-to-GDP comparator. Including a fabricated capex-to-GDP number here would misrepresent the cycle; it is retained in the dataset as the pure sentiment/equities analogue and should be ranked on its drawdown and valuation behavior, not on capex intensity.',
    real_capital_raised_usd_b: null,
    physical_unit: 'US households with a radio set by 1929',
    physical_value: 10000000,
    overbuild_ratio: null,
    peak_to_trough_drawdown_pct: 98.0,
    boom_to_bust_years: 3,
    survival_rate_pct: null,
    analogy_note:
      'Less a physical-capex buildout than an equity mania around a new platform technology, included as the purest sentiment analogue; consumer demand was real (radio set sales rose from about 60 million dollars in 1922 to 842 million in 1929, and roughly 10 million households owned a set by 1929) but stock prices detached from earnings. The bellwether, RCA, peaked near 114.75 in September 1929 (post a 5-for-1 split) and fell to about 2.50 by May 1932, a decline of roughly 98 percent, and did not recover on a dividend-adjusted basis until the 1960s. Losses fell on retail and margin investors. peak_capex_pct_gdp and real_capital are null because the boom was equity valuation, not sunk infrastructure spend; radio was capital-light relative to the railroad, electric-utility, and telephone buildouts.',
    sources: [
      {
        name: 'Finaeon, RCA and the Roaring Twenties',
        url: 'https://finaeon.com/rca-and-the-roaring-twenties/',
        license: 'Editorial citation of a public source.',
      },
    ],
    confidence: 'medium',
  },
  {
    id: 'dotcom-fiber',
    name: 'Dotcom and Telecom-Fiber Overbuild',
    era: 'modern',
    period: '1995-2002',
    lead_sector: 'telecom and internet infrastructure',
    peak_capex_pct_gdp: 1.2,
    capex_pct_gdp_basis:
      'Definition: US telecom capital expenditure as a percent of US GDP. Peak about 1.0 to 1.2 percent of GDP around 2000. Sources agree across multiple independent analyses: 7GC and Co (AI Capex and the Telecom Bubble, stating peak telecom capex reached 1.0 to 1.2 percent of US GDP); Fabricated Knowledge (Lessons from History, The Rise and Fall of the Telecom Bubble); plus corroborating IEEE ComSoc and Fortune retrospectives citing the same roughly 1 percent of GDP over the late 1990s and a peak annual telecom capex near 100 to 200 billion dollars in 2000. 1.2 is the top of the cited 1.0 to 1.2 range and is the figure carried in the analogy note. Confidence high because at least three independent reputable sources converge on the 1.0 to 1.2 percent band for the same peak year.',
    real_capital_raised_usd_b: 1000,
    physical_unit: 'miles of fiber laid in North America and Europe',
    physical_value: 80000000,
    overbuild_ratio: 20.0,
    peak_to_trough_drawdown_pct: 78.0,
    boom_to_bust_years: 7,
    survival_rate_pct: null,
    analogy_note:
      'Debt-financed buildout (the industry accumulated over 1 trillion dollars in debt by 2002) premised on the false claim that internet traffic was doubling every 100 days when it was roughly doubling annually; telecom capex peaked near 1.0 to 1.2 percent of US GDP. Operators laid roughly 80 million miles of fiber, of which only about 5 percent was lit and carrying traffic by 2001 to 2002, implying an overbuild ratio near 20x at the trough; the dark glass was later cheaply relit and underpinned the broadband and cloud eras. The Nasdaq fell about 78 percent from its March 2000 peak to October 2002, and WorldCom and Global Crossing went bankrupt. The 1 trillion dollar figure is already roughly in early-2000s dollars and is close to current dollars for the purpose of this row; treat it as order-of-magnitude. Losses fell on equity and bondholders, not taxpayers.',
    sources: [
      {
        name: '7GC telecom-bubble analysis',
        url: 'https://www.7gc.co/insights/ai-capex-and-the-telecom-bubble-a-comparative-analysis',
        license: 'Editorial citation of a public source.',
      },
    ],
    confidence: 'high',
  },
];

export function deriveCurrentAiCycle(
  ai: AiCurrentConstant,
  announcedPowerMw: number,
  gdpUsdT: number,
  capturedAt: string,
): CurrentAiCycle | null {
  if (ai.annual_capex_usd_b <= 0) return null;
  const gdpUsdB = gdpUsdT * 1000;
  const pct = gdpUsdB > 0 ? Math.round((ai.annual_capex_usd_b / gdpUsdB) * 100 * 1000) / 1000 : null;
  return {
    id: 'ai-buildout',
    name: 'AI infrastructure buildout',
    era: 'modern',
    peak_capex_pct_gdp: pct,
    annual_capex_usd_b: ai.annual_capex_usd_b,
    capex_range_low_pct: ai.range_low_pct,
    capex_range_high_pct: ai.range_high_pct,
    physical_unit: 'datacenter MW (disclosed)',
    physical_value: announcedPowerMw > 0 ? announcedPowerMw : null,
    in_progress: true,
    captured_at: capturedAt,
    basis: ai.basis,
  };
}

export interface CapitalCycleFilter {
  era?: string;
}

export function filterCapitalCycles(
  entries: CapitalCycleEntry[],
  f: CapitalCycleFilter,
): CapitalCycleEntry[] {
  let items = entries.slice();
  if (f.era) {
    const needle = f.era.toLowerCase();
    items = items.filter((c) => c.era.toLowerCase() === needle);
  }
  return items;
}
