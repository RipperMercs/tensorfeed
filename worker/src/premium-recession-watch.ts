import { Env } from './types';

/**
 * Premium recession watch.
 *
 * Synthesizes BLS + FRED data into a compact recession-risk signal
 * across two well-known indicators:
 *   1. Yield curve (10Y-2Y spread). Inversion is a classic
 *      recession leading indicator with ~12-18 month lead.
 *   2. Sahm rule proxy (3-month unemployment moving avg vs the
 *      lowest 3-month avg in the prior 12 months). When the
 *      current 3m avg rises 0.5pp above the trailing 12-month
 *      low, the Sahm rule has historically signaled recession.
 *
 * Output: per-signal red/yellow/green classification with editorial
 * explanation, plus a composite signal (red if either is red, green
 * if both green, yellow otherwise) and a brief synthesis paragraph.
 *
 * Distinct from /api/premium/macro/digest, which is the broad
 * snapshot. This endpoint takes a specific stance: "is recession
 * risk elevated right now."
 *
 * Cost: 1 credit per call.
 */

// ── Source shapes ──────────────────────────────────────────────────

interface BLSObservation {
  year: number;
  month: number;
  period_label: string;
  value: number;
}

interface BLSEntry {
  series_id: string;
  observations: BLSObservation[];
  latest: BLSObservation | null;
}

interface BLSSnapshot {
  capturedAt: string;
  indicators: BLSEntry[];
}

interface FREDObservation {
  date: string;
  value: number;
}

interface FREDEntry {
  series_id: string;
  observations: FREDObservation[];
  latest: FREDObservation | null;
}

interface FREDSnapshot {
  capturedAt: string;
  indicators: FREDEntry[];
}

function findBLS(snap: BLSSnapshot | null, id: string): BLSEntry | null {
  if (!snap) return null;
  return snap.indicators.find(i => i.series_id === id) ?? null;
}

function findFRED(snap: FREDSnapshot | null, id: string): FREDEntry | null {
  if (!snap) return null;
  return snap.indicators.find(i => i.series_id === id) ?? null;
}

// ── Public types ────────────────────────────────────────────────────

export type SignalLevel = 'red' | 'yellow' | 'green' | 'unknown';

export interface YieldCurveSignal {
  spread_10y_2y: number | null;
  level: SignalLevel;
  explanation: string;
}

export interface SahmRuleSignal {
  unemp_3mo_avg: number | null;
  unemp_12mo_low: number | null;
  sahm_value: number | null;       // current 3-mo avg minus 12-mo low
  threshold_pp: number;             // 0.5 (Sahm rule threshold)
  level: SignalLevel;
  explanation: string;
}

export interface RecessionWatchAttribution {
  sources: string[];
  license: string;
  notes: string;
}

export const RECESSION_WATCH_ATTRIBUTION: RecessionWatchAttribution = {
  sources: ['Federal Reserve Economic Data (T10Y2Y series)', 'U.S. Bureau of Labor Statistics (LNS14000000 unemployment series)'],
  license: 'Underlying data is in the public domain. Composite signals (red / yellow / green) and threshold definitions are TensorFeed editorial framing on top.',
  notes:
    'Sahm rule: when the current 3-month moving average of unemployment rises 0.5pp above its lowest reading in the trailing 12 months, the rule has historically signaled an in-progress recession. Originally proposed by Claudia Sahm. Yield-curve inversion is the classic 12-18 month leading indicator.',
};

export interface RecessionWatchResult {
  ok: true;
  capturedAt: string | null;
  computed_at: string;
  data_freshness: {
    bls_captured_at: string | null;
    fred_captured_at: string | null;
  };
  yield_curve: YieldCurveSignal;
  sahm_rule: SahmRuleSignal;
  composite: {
    level: SignalLevel;
    score: number;             // 0 = green, 50 = yellow, 100 = red
    explanation: string;
  };
  brief: string;
  attribution: RecessionWatchAttribution;
  notes: string[];
}

export interface RecessionWatchError {
  ok: false;
  error: string;
  hint?: string;
}

// ── Yield curve classifier ─────────────────────────────────────────

export function classifyYieldCurveSignal(spread: number | null): YieldCurveSignal {
  if (spread === null) {
    return {
      spread_10y_2y: null,
      level: 'unknown',
      explanation: '10Y-2Y spread not available; FRED snapshot may not be captured yet.',
    };
  }
  if (spread < -0.25) {
    return {
      spread_10y_2y: spread,
      level: 'red',
      explanation: `10Y-2Y spread at ${spread.toFixed(2)}pp: deeply inverted. Inversion has preceded most recent US recessions with a 12-18 month lead.`,
    };
  }
  if (spread < 0) {
    return {
      spread_10y_2y: spread,
      level: 'yellow',
      explanation: `10Y-2Y spread at ${spread.toFixed(2)}pp: mildly inverted. Watching for sustained inversion.`,
    };
  }
  if (spread < 0.5) {
    return {
      spread_10y_2y: spread,
      level: 'yellow',
      explanation: `10Y-2Y spread at ${spread.toFixed(2)}pp: flat. Recession risk moderated but the curve has not steepened decisively.`,
    };
  }
  return {
    spread_10y_2y: spread,
    level: 'green',
    explanation: `10Y-2Y spread at ${spread.toFixed(2)}pp: normally shaped. No inversion signal.`,
  };
}

// ── Sahm rule computation ──────────────────────────────────────────

function rollingAverage(values: number[], window: number): number | null {
  if (values.length < window) return null;
  const slice = values.slice(values.length - window);
  return slice.reduce((a, b) => a + b, 0) / window;
}

/**
 * Compute the Sahm rule value:
 *   sahm = current 3-month unemployment avg
 *        - lowest 3-month avg in the trailing 12 months
 *
 * Returns null when there are fewer than 14 monthly observations
 * (need 12 trailing 3-mo windows).
 */
export function computeSahm(unemp: BLSEntry | null): {
  three_mo_avg: number | null;
  twelve_mo_low: number | null;
  sahm: number | null;
} {
  if (!unemp || unemp.observations.length < 14) {
    return { three_mo_avg: null, twelve_mo_low: null, sahm: null };
  }
  const values = unemp.observations.map(o => o.value);
  const currentAvg = rollingAverage(values, 3);
  if (currentAvg === null) return { three_mo_avg: null, twelve_mo_low: null, sahm: null };

  // Build 12 trailing 3-mo averages, ending one month before the current.
  // The current 3-mo window covers indices len-3..len-1, so the first
  // trailing window must end at index len-2 (indices len-4..len-2) and the
  // loop walks back exactly 12 windows to the one ending at index len-13.
  const trailing: number[] = [];
  for (let endIdx = values.length - 2; endIdx >= 0 && trailing.length < 12; endIdx--) {
    if (endIdx + 1 >= 3) {
      const window = values.slice(endIdx - 2, endIdx + 1);
      trailing.push(window.reduce((a, b) => a + b, 0) / 3);
    }
  }
  if (trailing.length === 0) return { three_mo_avg: currentAvg, twelve_mo_low: null, sahm: null };
  const twelveMoLow = Math.min(...trailing);
  return {
    three_mo_avg: Math.round(currentAvg * 100) / 100,
    twelve_mo_low: Math.round(twelveMoLow * 100) / 100,
    sahm: Math.round((currentAvg - twelveMoLow) * 100) / 100,
  };
}

const SAHM_THRESHOLD_PP = 0.5;

export function classifySahmSignal(unemp: BLSEntry | null): SahmRuleSignal {
  const { three_mo_avg, twelve_mo_low, sahm } = computeSahm(unemp);
  if (sahm === null) {
    return {
      unemp_3mo_avg: three_mo_avg,
      unemp_12mo_low: twelve_mo_low,
      sahm_value: null,
      threshold_pp: SAHM_THRESHOLD_PP,
      level: 'unknown',
      explanation:
        'Insufficient unemployment history to compute the Sahm rule (need 14+ monthly observations). Fills in once the BLS snapshot has accumulated.',
    };
  }
  if (sahm >= SAHM_THRESHOLD_PP) {
    return {
      unemp_3mo_avg: three_mo_avg,
      unemp_12mo_low: twelve_mo_low,
      sahm_value: sahm,
      threshold_pp: SAHM_THRESHOLD_PP,
      level: 'red',
      explanation: `Sahm value ${sahm.toFixed(2)}pp: current 3-month unemployment avg is ${sahm.toFixed(2)}pp above its 12-month low (${twelve_mo_low}%). Sahm rule has triggered.`,
    };
  }
  if (sahm >= 0.3) {
    return {
      unemp_3mo_avg: three_mo_avg,
      unemp_12mo_low: twelve_mo_low,
      sahm_value: sahm,
      threshold_pp: SAHM_THRESHOLD_PP,
      level: 'yellow',
      explanation: `Sahm value ${sahm.toFixed(2)}pp: approaching the 0.5pp Sahm threshold. Watch.`,
    };
  }
  return {
    unemp_3mo_avg: three_mo_avg,
    unemp_12mo_low: twelve_mo_low,
    sahm_value: sahm,
    threshold_pp: SAHM_THRESHOLD_PP,
    level: 'green',
    explanation: `Sahm value ${sahm.toFixed(2)}pp: well below the 0.5pp threshold. No Sahm-rule recession signal.`,
  };
}

// ── Composite ──────────────────────────────────────────────────────

export function classifyComposite(yc: SignalLevel, sahm: SignalLevel): { level: SignalLevel; score: number; explanation: string } {
  // Score: red=100, yellow=50, green=0, unknown=null
  const valueOf = (s: SignalLevel): number | null =>
    s === 'red' ? 100 : s === 'yellow' ? 50 : s === 'green' ? 0 : null;
  const v1 = valueOf(yc);
  const v2 = valueOf(sahm);
  const known = [v1, v2].filter((x): x is number => x !== null);
  if (known.length === 0) {
    return { level: 'unknown', score: 0, explanation: 'Both signals unavailable. Recession watch will populate after data lands.' };
  }
  const score = Math.round(known.reduce((a, b) => a + b, 0) / known.length);
  let level: SignalLevel;
  let explanation: string;
  if (yc === 'red' || sahm === 'red') {
    level = 'red';
    explanation = 'At least one signal is red. Elevated recession risk; review the per-signal breakdown for which lever is firing.';
  } else if (yc === 'green' && sahm === 'green') {
    level = 'green';
    explanation = 'Both signals are green. No recession indicator firing on this dashboard.';
  } else {
    level = 'yellow';
    explanation = 'Mixed signals. At least one indicator is in the watch zone but neither has fully triggered.';
  }
  return { level, score, explanation };
}

// ── Top-level entry ────────────────────────────────────────────────

export async function computeRecessionWatch(env: Env): Promise<RecessionWatchResult | RecessionWatchError> {
  const [bls, fred] = await Promise.all([
    env.TENSORFEED_CACHE.get('bls-indicators:current', 'json') as Promise<BLSSnapshot | null>,
    env.TENSORFEED_CACHE.get('fred-indicators:current', 'json') as Promise<FREDSnapshot | null>,
  ]);

  if (!bls && !fred) {
    return {
      ok: false,
      error: 'no_snapshots_yet',
      hint:
        'Both BLS and FRED snapshots must be present. BLS daily 05:00 UTC, FRED 05:30 UTC. After deploy + key configuration, the watch populates within 24 hours.',
    };
  }

  const t10y2y = findFRED(fred, 'T10Y2Y');
  const unemp = findBLS(bls, 'LNS14000000');

  const ycSpread = t10y2y?.latest?.value ?? null;
  const yieldCurve = classifyYieldCurveSignal(ycSpread);
  const sahmRule = classifySahmSignal(unemp);
  const composite = classifyComposite(yieldCurve.level, sahmRule.level);

  const briefParts: string[] = [];
  if (composite.level === 'red') briefParts.push('Recession risk is elevated.');
  else if (composite.level === 'green') briefParts.push('No recession signal firing on this dashboard.');
  else if (composite.level === 'yellow') briefParts.push('Watch zone: at least one indicator is in transition.');
  if (yieldCurve.level !== 'unknown') briefParts.push(yieldCurve.explanation.split('.')[0] + '.');
  if (sahmRule.level !== 'unknown') briefParts.push(sahmRule.explanation.split('.')[0] + '.');

  const notes: string[] = [];
  if (!bls) notes.push('BLS snapshot missing; Sahm rule unavailable.');
  if (!fred) notes.push('FRED snapshot missing; yield-curve signal unavailable.');

  // capturedAt is the freshness boundary premiumResponse bills against. The
  // watch is only as fresh as its STALEST input, so use the OLDEST of the
  // available BLS / FRED snapshot times (ISO strings compare lexicographically).
  // Null only when both are missing. Without this field the endpoint never
  // no-charged on stale macro data (computed_at is not read by the extractor).
  const macroTimes = [bls?.capturedAt, fred?.capturedAt].filter(
    (t): t is string => typeof t === 'string',
  );
  const recessionCapturedAt = macroTimes.length > 0 ? macroTimes.reduce((a, b) => (a < b ? a : b)) : null;

  return {
    ok: true,
    capturedAt: recessionCapturedAt,
    computed_at: new Date().toISOString(),
    data_freshness: {
      bls_captured_at: bls?.capturedAt ?? null,
      fred_captured_at: fred?.capturedAt ?? null,
    },
    yield_curve: yieldCurve,
    sahm_rule: sahmRule,
    composite,
    brief: briefParts.join(' '),
    attribution: RECESSION_WATCH_ATTRIBUTION,
    notes,
  };
}
