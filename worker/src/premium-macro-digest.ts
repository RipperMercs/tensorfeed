import { Env } from './types';

/**
 * Premium macro digest.
 *
 * Joins the free /api/economy/bls/indicators and /api/economy/fred/indicators
 * snapshots into a single agent-shaped morning brief. Pure synthesis on top
 * of public-domain data: rates, yield curve, inflation, employment, growth,
 * money, FX, commodities, plus templated headline calls per section and a
 * 2-3 sentence overall brief.
 *
 * Cost: 1 credit per call. The compute that justifies the gate:
 *   - YoY computation for monthly series (find observation ~12 months back)
 *   - Yield-curve regime classification (inverted / flat / normal / steep)
 *   - Inflation regime classification (hot / above-target / steady / cooling)
 *   - Employment regime classification (tight / loosening / steady)
 *   - Templated narrative headlines per section
 *
 * Agents would otherwise stitch together two endpoints, look up a dozen
 * series IDs, compute YoY deltas themselves, and write the regime logic.
 * This is one paid call.
 */

// ── Pull helpers ────────────────────────────────────────────────────

interface BLSObservation {
  year: number;
  month: number;
  period_label: string;
  value: number;
}

interface BLSSnapshotEntry {
  series_id: string;
  name: string;
  category: string;
  unit: string;
  observations: BLSObservation[];
  latest: BLSObservation | null;
  prior: BLSObservation | null;
  delta_absolute: number | null;
  delta_pct: number | null;
}

interface BLSSnapshot {
  capturedAt: string;
  count: number;
  indicators: BLSSnapshotEntry[];
}

interface FREDObservation {
  date: string;
  value: number;
}

interface FREDSnapshotEntry {
  series_id: string;
  name: string;
  category: string;
  frequency: string;
  unit: string;
  observations: FREDObservation[];
  latest: FREDObservation | null;
  prior: FREDObservation | null;
  delta_absolute: number | null;
  delta_pct: number | null;
}

interface FREDSnapshot {
  capturedAt: string;
  count: number;
  indicators: FREDSnapshotEntry[];
}

function findBLS(snap: BLSSnapshot | null, id: string): BLSSnapshotEntry | null {
  if (!snap) return null;
  return snap.indicators.find(i => i.series_id === id) ?? null;
}

function findFRED(snap: FREDSnapshot | null, id: string): FREDSnapshotEntry | null {
  if (!snap) return null;
  return snap.indicators.find(i => i.series_id === id) ?? null;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── YoY computation for monthly series ─────────────────────────────

/**
 * Find the observation ~12 months before the most recent one. Uses the
 * (year, month) tuple for BLS and ISO date string for FRED. Returns null
 * if not present in the kept history.
 */
function blsYoYPct(entry: BLSSnapshotEntry | null): number | null {
  if (!entry || !entry.latest) return null;
  const latest = entry.latest;
  // Look for the same calendar month one year prior. BLS keeps 24
  // months of history so this is present whenever the series has at
  // least one full year of data. If absent (newly-tracked series,
  // not-yet-published prior year), return null.
  const yearAgo = entry.observations.find(
    o => o.year === latest.year - 1 && o.month === latest.month,
  );
  if (!yearAgo || yearAgo.value === 0) return null;
  return round2(((latest.value - yearAgo.value) / yearAgo.value) * 100);
}

function fredYoYPct(entry: FREDSnapshotEntry | null): number | null {
  if (!entry || !entry.latest || entry.observations.length === 0) return null;
  const latestDate = entry.latest.date;
  // Compute target YYYY-MM-DD = one year before
  const dt = new Date(`${latestDate}T00:00:00Z`);
  dt.setUTCFullYear(dt.getUTCFullYear() - 1);
  const targetIso = dt.toISOString().slice(0, 10);
  // Find the closest observation on-or-before target
  const eligible = entry.observations.filter(o => o.date <= targetIso);
  if (eligible.length === 0) return null;
  const yearAgo = eligible[eligible.length - 1];
  if (yearAgo.value === 0) return null;
  return round2(((entry.latest.value - yearAgo.value) / yearAgo.value) * 100);
}

// Daily-series WoW: find observation 5 trading days back (simplest: 7 calendar days)
function fredWoWPct(entry: FREDSnapshotEntry | null): number | null {
  if (!entry || !entry.latest || entry.observations.length < 6) return null;
  const latestDate = entry.latest.date;
  const dt = new Date(`${latestDate}T00:00:00Z`);
  dt.setUTCDate(dt.getUTCDate() - 7);
  const targetIso = dt.toISOString().slice(0, 10);
  const eligible = entry.observations.filter(o => o.date <= targetIso);
  if (eligible.length === 0) return null;
  const weekAgo = eligible[eligible.length - 1];
  if (weekAgo.value === 0) return null;
  return round2(((entry.latest.value - weekAgo.value) / weekAgo.value) * 100);
}

// ── Regime classifiers ─────────────────────────────────────────────

export type YieldCurveRegime = 'inverted' | 'flat' | 'normal' | 'steep' | 'unknown';

export function classifyYieldCurve(spread10y2y: number | null): YieldCurveRegime {
  if (spread10y2y === null) return 'unknown';
  if (spread10y2y < 0) return 'inverted';
  if (spread10y2y < 0.5) return 'flat';
  if (spread10y2y > 1.5) return 'steep';
  return 'normal';
}

export type InflationRegime = 'hot' | 'above-target' | 'steady' | 'cooling' | 'unknown';

export function classifyInflation(cpiYoY: number | null): InflationRegime {
  if (cpiYoY === null) return 'unknown';
  if (cpiYoY > 4) return 'hot';
  if (cpiYoY > 2.5) return 'above-target';
  if (cpiYoY < 1.5) return 'cooling';
  return 'steady';
}

export type EmploymentRegime = 'tight' | 'softening' | 'loosening' | 'steady' | 'unknown';

export function classifyEmployment(unempDeltaPp: number | null, unempLevel: number | null): EmploymentRegime {
  if (unempLevel === null) return 'unknown';
  if (unempLevel < 4 && (unempDeltaPp === null || unempDeltaPp <= 0)) return 'tight';
  if (unempDeltaPp !== null && unempDeltaPp >= 0.2) return 'loosening';
  if (unempDeltaPp !== null && unempDeltaPp >= 0.1) return 'softening';
  return 'steady';
}

// ── Public response type ───────────────────────────────────────────

export interface RatesSection {
  fed_funds_rate: number | null;
  treasury_10y: number | null;
  treasury_2y: number | null;
  yield_spread_10y_2y: number | null;
  yield_curve_regime: YieldCurveRegime;
  mortgage_30y: number | null;
  mortgage_30y_yoy_pp: number | null;
  headline: string;
}

export interface InflationSection {
  cpi_yoy_pct: number | null;
  cpi_mom_pct: number | null;
  cpi_core_yoy_pct: number | null;
  ppi_yoy_pct: number | null;
  regime: InflationRegime;
  headline: string;
}

export interface EmploymentSection {
  unemployment_rate: number | null;
  unemployment_mom_pp: number | null;
  payrolls_mom_thousands: number | null;
  avg_hourly_earnings_yoy_pct: number | null;
  labor_force_participation: number | null;
  jolts_openings_thousands: number | null;
  jolts_hires_thousands: number | null;
  regime: EmploymentRegime;
  headline: string;
}

export interface GrowthMoneySection {
  gdp_real_yoy_pct: number | null;
  gdp_real_latest_billions: number | null;
  m2_yoy_pct: number | null;
  m2_latest_billions: number | null;
  headline: string;
}

export interface FXCommoditiesSection {
  usd_index: number | null;
  usd_index_wow_pct: number | null;
  wti_oil_usd_per_bbl: number | null;
  wti_oil_wow_pct: number | null;
  headline: string;
}

export interface MacroDigestAttribution {
  sources: string[];
  license: string;
  notes: string;
}

export const MACRO_DIGEST_ATTRIBUTION: MacroDigestAttribution = {
  sources: ['U.S. Bureau of Labor Statistics (bls.gov)', 'Federal Reserve Economic Data (fred.stlouisfed.org)'],
  license: 'Underlying data is in the public domain. TensorFeed regime classifications and headline narratives are editorial synthesis on top of that data.',
  notes:
    'Series IDs preserved per section. Free-tier raw access at /api/economy/bls/indicators and /api/economy/fred/indicators. This endpoint adds YoY computation, regime classification, and section + overall narrative on top.',
};

export interface MacroDigestResult {
  ok: true;
  capturedAt: string;
  data_freshness: {
    bls_captured_at: string | null;
    bls_indicator_count: number;
    fred_captured_at: string | null;
    fred_indicator_count: number;
  };
  rates: RatesSection;
  inflation: InflationSection;
  employment: EmploymentSection;
  growth_money: GrowthMoneySection;
  fx_commodities: FXCommoditiesSection;
  brief: string;
  attribution: MacroDigestAttribution;
  notes: string[];
}

export interface MacroDigestError {
  ok: false;
  error: string;
  hint?: string;
}

// ── Section builders ───────────────────────────────────────────────

function buildRatesSection(fred: FREDSnapshot | null): RatesSection {
  const dff = findFRED(fred, 'DFF');
  const dgs10 = findFRED(fred, 'DGS10');
  const dgs2 = findFRED(fred, 'DGS2');
  const t10y2y = findFRED(fred, 'T10Y2Y');
  const mortgage = findFRED(fred, 'MORTGAGE30US');

  const spread = t10y2y?.latest?.value ?? null;
  const regime = classifyYieldCurve(spread);
  const fedFunds = dff?.latest?.value ?? null;
  const ten = dgs10?.latest?.value ?? null;
  const two = dgs2?.latest?.value ?? null;
  const mort = mortgage?.latest?.value ?? null;
  const mortYoY = fredYoYPct(mortgage);

  let headline = 'Rates data not yet captured.';
  if (fedFunds !== null && spread !== null) {
    const regimeWord =
      regime === 'inverted' ? 'inverted'
      : regime === 'flat' ? 'flat'
      : regime === 'steep' ? 'steep'
      : 'normal-shaped';
    const tenStr = ten !== null ? ` 10Y at ${ten.toFixed(2)}%,` : '';
    headline = `Fed funds at ${fedFunds.toFixed(2)}%;${tenStr} 10Y-2Y spread ${spread >= 0 ? '+' : ''}${spread.toFixed(2)}pp (${regimeWord}).`;
  }

  return {
    fed_funds_rate: fedFunds,
    treasury_10y: ten,
    treasury_2y: two,
    yield_spread_10y_2y: spread,
    yield_curve_regime: regime,
    mortgage_30y: mort,
    mortgage_30y_yoy_pp: mortYoY !== null && mort !== null ? round2((mortYoY * mort) / 100) : null,
    headline,
  };
}

function buildInflationSection(bls: BLSSnapshot | null): InflationSection {
  const cpi = findBLS(bls, 'CUUR0000SA0');
  const cpiCore = findBLS(bls, 'CUUR0000SA0L1E');
  const ppi = findBLS(bls, 'WPSFD49207');

  const cpiYoY = blsYoYPct(cpi);
  const cpiMoM = cpi?.delta_pct ?? null;
  const coreYoY = blsYoYPct(cpiCore);
  const ppiYoY = blsYoYPct(ppi);
  const regime = classifyInflation(cpiYoY);

  let headline = 'Inflation data not yet captured.';
  if (cpiYoY !== null) {
    const regimeWord =
      regime === 'hot' ? 'running hot'
      : regime === 'above-target' ? 'above the Fed target'
      : regime === 'cooling' ? 'cooling'
      : 'near steady';
    const coreClause = coreYoY !== null ? `, core ${coreYoY.toFixed(1)}%` : '';
    headline = `CPI ${cpiYoY.toFixed(1)}% YoY${coreClause}: ${regimeWord}.`;
  }

  return {
    cpi_yoy_pct: cpiYoY,
    cpi_mom_pct: cpiMoM,
    cpi_core_yoy_pct: coreYoY,
    ppi_yoy_pct: ppiYoY,
    regime,
    headline,
  };
}

function buildEmploymentSection(bls: BLSSnapshot | null): EmploymentSection {
  const unemp = findBLS(bls, 'LNS14000000');
  const payrolls = findBLS(bls, 'CES0000000001');
  const ahe = findBLS(bls, 'CES0500000003');
  const lfpr = findBLS(bls, 'LNS11300000');
  const jolo = findBLS(bls, 'JTS000000000000000JOL');
  const johi = findBLS(bls, 'JTS000000000000000HIL');

  const unempLevel = unemp?.latest?.value ?? null;
  const unempDelta = unemp?.delta_absolute ?? null;
  const payrollsDelta = payrolls?.delta_absolute ?? null;
  const aheYoY = blsYoYPct(ahe);
  const regime = classifyEmployment(unempDelta, unempLevel);

  let headline = 'Employment data not yet captured.';
  if (unempLevel !== null) {
    const regimeWord =
      regime === 'tight' ? 'tight'
      : regime === 'loosening' ? 'loosening'
      : regime === 'softening' ? 'softening at the margin'
      : 'steady';
    const payrollsClause =
      payrollsDelta !== null
        ? `; payrolls +${Math.round(payrollsDelta)}K MoM`
        : '';
    headline = `Unemployment ${unempLevel.toFixed(1)}%${payrollsClause}: ${regimeWord}.`;
  }

  return {
    unemployment_rate: unempLevel,
    unemployment_mom_pp: unempDelta,
    payrolls_mom_thousands: payrollsDelta,
    avg_hourly_earnings_yoy_pct: aheYoY,
    labor_force_participation: lfpr?.latest?.value ?? null,
    jolts_openings_thousands: jolo?.latest?.value ?? null,
    jolts_hires_thousands: johi?.latest?.value ?? null,
    regime,
    headline,
  };
}

function buildGrowthMoneySection(fred: FREDSnapshot | null): GrowthMoneySection {
  const gdpReal = findFRED(fred, 'GDPC1');
  const m2 = findFRED(fred, 'M2SL');
  const gdpYoY = fredYoYPct(gdpReal);
  const m2YoY = fredYoYPct(m2);

  let headline = 'Growth and money supply data not yet captured.';
  if (gdpYoY !== null && m2YoY !== null) {
    headline = `Real GDP ${gdpYoY >= 0 ? '+' : ''}${gdpYoY.toFixed(1)}% YoY; M2 ${m2YoY >= 0 ? '+' : ''}${m2YoY.toFixed(1)}% YoY.`;
  } else if (gdpYoY !== null) {
    headline = `Real GDP ${gdpYoY >= 0 ? '+' : ''}${gdpYoY.toFixed(1)}% YoY (M2 not yet captured).`;
  } else if (m2YoY !== null) {
    headline = `M2 ${m2YoY >= 0 ? '+' : ''}${m2YoY.toFixed(1)}% YoY (GDP not yet captured).`;
  }

  return {
    gdp_real_yoy_pct: gdpYoY,
    gdp_real_latest_billions: gdpReal?.latest?.value ?? null,
    m2_yoy_pct: m2YoY,
    m2_latest_billions: m2?.latest?.value ?? null,
    headline,
  };
}

function buildFXCommoditiesSection(fred: FREDSnapshot | null): FXCommoditiesSection {
  const usd = findFRED(fred, 'DTWEXBGS');
  const oil = findFRED(fred, 'DCOILWTICO');
  const usdLevel = usd?.latest?.value ?? null;
  const usdWoW = fredWoWPct(usd);
  const oilLevel = oil?.latest?.value ?? null;
  const oilWoW = fredWoWPct(oil);

  let headline = 'FX and commodities data not yet captured.';
  if (usdLevel !== null && oilLevel !== null) {
    const usdMove = usdWoW !== null ? ` (${usdWoW >= 0 ? '+' : ''}${usdWoW.toFixed(1)}% WoW)` : '';
    const oilMove = oilWoW !== null ? ` (${oilWoW >= 0 ? '+' : ''}${oilWoW.toFixed(1)}% WoW)` : '';
    headline = `Broad USD index ${usdLevel.toFixed(1)}${usdMove}; WTI crude $${oilLevel.toFixed(2)}${oilMove}.`;
  }

  return {
    usd_index: usdLevel,
    usd_index_wow_pct: usdWoW,
    wti_oil_usd_per_bbl: oilLevel,
    wti_oil_wow_pct: oilWoW,
    headline,
  };
}

function buildOverallBrief(
  rates: RatesSection,
  infl: InflationSection,
  emp: EmploymentSection,
): string {
  const parts: string[] = [];
  if (rates.yield_curve_regime !== 'unknown' && rates.fed_funds_rate !== null) {
    const curveDesc =
      rates.yield_curve_regime === 'inverted'
        ? 'an inverted yield curve'
        : rates.yield_curve_regime === 'flat'
        ? 'a flat yield curve'
        : rates.yield_curve_regime === 'steep'
        ? 'a steep yield curve'
        : 'a normal-shaped yield curve';
    parts.push(`Policy rate at ${rates.fed_funds_rate.toFixed(2)}% with ${curveDesc}.`);
  }
  if (infl.regime !== 'unknown' && infl.cpi_yoy_pct !== null) {
    const inflPhrase =
      infl.regime === 'hot' ? 'still hot'
      : infl.regime === 'above-target' ? 'above target'
      : infl.regime === 'cooling' ? 'cooling'
      : 'near steady';
    parts.push(`Inflation ${inflPhrase} at ${infl.cpi_yoy_pct.toFixed(1)}% YoY.`);
  }
  if (emp.regime !== 'unknown' && emp.unemployment_rate !== null) {
    const empPhrase =
      emp.regime === 'tight' ? 'tight'
      : emp.regime === 'loosening' ? 'loosening'
      : emp.regime === 'softening' ? 'softening at the edge'
      : 'steady';
    parts.push(`Labor market ${empPhrase} at ${emp.unemployment_rate.toFixed(1)}% unemployment.`);
  }
  if (parts.length === 0) {
    return 'Snapshots not yet captured for either upstream. Brief will populate after the first daily refresh.';
  }
  return parts.join(' ');
}

// ── Top-level entry ────────────────────────────────────────────────

export async function computeMacroDigest(env: Env): Promise<MacroDigestResult | MacroDigestError> {
  const [bls, fred] = await Promise.all([
    env.TENSORFEED_CACHE.get('bls-indicators:current', 'json') as Promise<BLSSnapshot | null>,
    env.TENSORFEED_CACHE.get('fred-indicators:current', 'json') as Promise<FREDSnapshot | null>,
  ]);

  if (!bls && !fred) {
    return {
      ok: false,
      error: 'no_snapshots_yet',
      hint:
        'Both BLS and FRED snapshots are empty. BLS refreshes daily at 05:00 UTC, FRED at 05:30 UTC. After deploy and key configuration, the digest populates within 24 hours.',
    };
  }

  const rates = buildRatesSection(fred);
  const inflation = buildInflationSection(bls);
  const employment = buildEmploymentSection(bls);
  const growthMoney = buildGrowthMoneySection(fred);
  const fxCommodities = buildFXCommoditiesSection(fred);
  const brief = buildOverallBrief(rates, inflation, employment);

  const notes: string[] = [];
  if (!bls) notes.push('BLS snapshot unavailable; inflation and employment sections incomplete.');
  if (!fred) notes.push('FRED snapshot unavailable; rates, growth, and FX/commodities sections incomplete.');

  // capturedAt is the freshness boundary premiumResponse bills against. The
  // digest is only as fresh as its STALEST input, so use the OLDEST of the
  // available BLS / FRED snapshot times (ISO strings compare lexicographically,
  // so the min is the oldest). Null only when both snapshots are missing. This
  // is the data-capture time, NOT build time.
  const macroTimes = [bls?.capturedAt, fred?.capturedAt].filter(
    (t): t is string => typeof t === 'string',
  );
  const macroCapturedAt = macroTimes.length > 0 ? macroTimes.reduce((a, b) => (a < b ? a : b)) : null;

  return {
    ok: true,
    capturedAt: macroCapturedAt,
    data_freshness: {
      bls_captured_at: bls?.capturedAt ?? null,
      bls_indicator_count: bls?.count ?? 0,
      fred_captured_at: fred?.capturedAt ?? null,
      fred_indicator_count: fred?.count ?? 0,
    },
    rates,
    inflation,
    employment,
    growth_money: growthMoney,
    fx_commodities: fxCommodities,
    brief,
    attribution: MACRO_DIGEST_ATTRIBUTION,
    notes,
  };
}
