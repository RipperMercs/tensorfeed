/**
 * FDA mechanical severity.
 *
 * The Qwen-extracted `fda-actions` corpus carries a free-text
 * `severity` field that drifts across chunks ("high" vs "High" vs
 * "Class I" vs "serious"). The 2026-05-13 batch 2 audit (jobs 25-28,
 * 664 events) recommended computing severity DETERMINISTICALLY at
 * rollup time from the structured FDA fields, then keeping the model's
 * free-text severity as a soft label for the audit trail.
 *
 * Inputs are FDA's own standardized fields:
 *
 *   classification (drug + device recalls):
 *     Class I   reasonable probability of serious adverse health
 *               consequences or death
 *     Class II  may cause temporary or medically reversible health
 *               consequences
 *     Class III not likely to cause adverse health consequences
 *
 *   event_type (MAUDE device adverse events):
 *     Death
 *     Injury
 *     Malfunction
 *     Other
 *
 * Output: 'low' | 'medium' | 'high' | 'critical'.
 *
 * When both classification and event_type are present, the maximum
 * severity wins (e.g. a Class II recall with a Death adverse event
 * is critical). Unknown / unparseable inputs map to 'low' so we
 * don't elevate noise into the high-severity bucket.
 */

export type MechanicalSeverity = 'low' | 'medium' | 'high' | 'critical';

const SEVERITY_RANK: Record<MechanicalSeverity, number> = {
  low: 0,
  medium: 1,
  high: 2,
  critical: 3,
};

/**
 * Normalize an FDA `classification` value to a mechanical severity.
 * Accepts variants: "Class I", "class i", "Class 1", "I", "1" etc.
 * Returns 'low' for empty/unknown input.
 */
function severityFromClassification(classification: string | null | undefined): MechanicalSeverity {
  if (!classification || typeof classification !== 'string') return 'low';
  const c = classification.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
  // Strip leading "class " token if present, then look at the remaining indicator.
  const stripped = c.replace(/^class\s+/, '').trim();
  if (stripped === 'i' || stripped === '1') return 'critical';
  if (stripped === 'ii' || stripped === '2') return 'high';
  if (stripped === 'iii' || stripped === '3') return 'medium';
  return 'low';
}

const EVENT_TYPE_MAP: Record<string, MechanicalSeverity> = {
  death: 'critical',
  injury: 'high',
  malfunction: 'medium',
  other: 'low',
  // Common variants from MAUDE:
  'serious injury': 'high',
  'no answer provided': 'low',
};

/**
 * Normalize an FDA `event_type` value to a mechanical severity.
 * Returns 'low' for empty/unknown input.
 */
function severityFromEventType(eventType: string | null | undefined): MechanicalSeverity {
  if (!eventType || typeof eventType !== 'string') return 'low';
  const t = eventType.toLowerCase().replace(/[.,]/g, '').replace(/\s+/g, ' ').trim();
  return EVENT_TYPE_MAP[t] ?? 'low';
}

/**
 * Deterministic severity from the structured FDA fields.
 *
 * Pass whichever of `classification` and `event_type` are present;
 * empty/null/unknown values default to 'low' and the max wins.
 *
 * Pure function, no I/O. Safe to call at rollup time AND at
 * extraction time (DataPal-side); idempotent because the output set
 * is closed and the rank-max is associative.
 */
export function mechanicalSeverity(input: {
  classification?: string | null;
  event_type?: string | null;
}): MechanicalSeverity {
  const fromClass = severityFromClassification(input.classification);
  const fromEvent = severityFromEventType(input.event_type);
  return SEVERITY_RANK[fromClass] >= SEVERITY_RANK[fromEvent] ? fromClass : fromEvent;
}

/**
 * Compare two severities for sort/aggregate use. Returns a negative
 * number if `a` is less severe than `b`, positive if more, zero if
 * equal. (Same sign convention as Array#sort comparators.)
 */
export function compareSeverity(a: MechanicalSeverity, b: MechanicalSeverity): number {
  return SEVERITY_RANK[a] - SEVERITY_RANK[b];
}

/**
 * Severity rank for histograms / leaderboards. Higher = more severe.
 */
export function severityRank(s: MechanicalSeverity): number {
  return SEVERITY_RANK[s];
}
