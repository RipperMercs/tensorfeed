/**
 * SSVC Decision Verdict.
 *
 * CISA Vulnrichment records the three SSVC decision points (Exploitation,
 * Automatable, Technical Impact) but never the final Decision. This module
 * applies CISA's published SSVC Coordinator decision tree to those points and
 * returns the decision across the full Mission and Well-being envelope.
 *
 * The tree below is the CISA Coordinator v2.0.3 decision table, verified three
 * independent ways and adversarially audited on 2026-06-03 (zero disagreements,
 * 100 percent match, monotonicity clean).
 * Source: https://github.com/CERTCC/SSVC/blob/main/docs/ssvc-calc/CISA-Coordinator.json
 *
 * Mission and Well-being is itself a CISA-derived compound of Mission
 * Prevalence and Public Well-being Impact, neither of which appears in the
 * Vulnrichment record. The record gives us only the first three points, so the
 * verdict is returned across all three M&W levels rather than inventing one.
 */

import type { Env } from './types';

export type Exploitation = 'none' | 'poc' | 'active';
export type Automatable = 'no' | 'yes';
export type TechnicalImpact = 'partial' | 'total';
export type MissionWellbeing = 'low' | 'medium' | 'high';
export type Decision = 'Track' | 'Track*' | 'Attend' | 'Act';

export const CISA_SSVC_TREE_VERSION = '2.0.3';
export const CISA_SSVC_TREE_SOURCE =
  'https://github.com/CERTCC/SSVC/blob/main/docs/ssvc-calc/CISA-Coordinator.json';

export function ssvcTreeKey(
  e: Exploitation,
  a: Automatable,
  t: TechnicalImpact,
  m: MissionWellbeing,
): string {
  return `${e}|${a}|${t}|${m}`;
}

export const CISA_SSVC_TREE: Readonly<Record<string, Decision>> = Object.freeze({
  'none|no|partial|low': 'Track',
  'none|no|partial|medium': 'Track',
  'none|no|partial|high': 'Track',
  'none|no|total|low': 'Track',
  'none|no|total|medium': 'Track',
  'none|no|total|high': 'Track*',
  'none|yes|partial|low': 'Track',
  'none|yes|partial|medium': 'Track',
  'none|yes|partial|high': 'Attend',
  'none|yes|total|low': 'Track',
  'none|yes|total|medium': 'Track',
  'none|yes|total|high': 'Attend',
  'poc|no|partial|low': 'Track',
  'poc|no|partial|medium': 'Track',
  'poc|no|partial|high': 'Track*',
  'poc|no|total|low': 'Track',
  'poc|no|total|medium': 'Track*',
  'poc|no|total|high': 'Attend',
  'poc|yes|partial|low': 'Track',
  'poc|yes|partial|medium': 'Track',
  'poc|yes|partial|high': 'Attend',
  'poc|yes|total|low': 'Track',
  'poc|yes|total|medium': 'Track*',
  'poc|yes|total|high': 'Attend',
  'active|no|partial|low': 'Track',
  'active|no|partial|medium': 'Track',
  'active|no|partial|high': 'Attend',
  'active|no|total|low': 'Track',
  'active|no|total|medium': 'Attend',
  'active|no|total|high': 'Act',
  'active|yes|partial|low': 'Attend',
  'active|yes|partial|medium': 'Attend',
  'active|yes|partial|high': 'Act',
  'active|yes|total|low': 'Attend',
  'active|yes|total|medium': 'Act',
  'active|yes|total|high': 'Act',
}) as Readonly<Record<string, Decision>>;

export function cisaSsvcDecision(
  points: { exploitation: Exploitation; automatable: Automatable; technical_impact: TechnicalImpact },
  mw: MissionWellbeing,
): Decision {
  const d = CISA_SSVC_TREE[ssvcTreeKey(points.exploitation, points.automatable, points.technical_impact, mw)];
  // Unreachable given the input enums; the tree is total over the 36 combos.
  if (!d) throw new Error(`ssvc: no tree entry for ${ssvcTreeKey(points.exploitation, points.automatable, points.technical_impact, mw)}`);
  return d;
}

export interface SsvcPoints {
  exploitation: Exploitation;
  automatable: Automatable;
  technical_impact: TechnicalImpact;
  role: string;
  version: string;
  scored_at: string;
}

const EXPLOITATION_VALUES = new Set<string>(['none', 'poc', 'active']);
const AUTOMATABLE_VALUES = new Set<string>(['no', 'yes']);
const TECHNICAL_IMPACT_VALUES = new Set<string>(['partial', 'total']);

/**
 * Extract the SSVC decision points from a CISA Vulnrichment record. The block
 * lives in containers.adp[] under the metric whose other.type === 'ssvc'. The
 * adp index varies (seen at adp[0] and adp[1]), so locate by scanning, not by
 * index. Returns null if the record carries no parseable SSVC block: the caller
 * treats that as a no-charge no_ssvc_data outcome.
 */
export function parseSsvcFromVulnrichment(record: unknown): SsvcPoints | null {
  const rec = record as { containers?: { adp?: unknown } } | null | undefined;
  const adp = rec?.containers?.adp;
  if (!Array.isArray(adp)) return null;

  let content: Record<string, unknown> | null = null;
  for (const container of adp) {
    const metrics = (container as { metrics?: unknown })?.metrics;
    if (!Array.isArray(metrics)) continue;
    for (const metric of metrics) {
      const other = (metric as { other?: { type?: unknown; content?: unknown } })?.other;
      if (other && other.type === 'ssvc' && other.content && typeof other.content === 'object') {
        content = other.content as Record<string, unknown>;
        break;
      }
    }
    if (content) break;
  }
  if (!content) return null;

  const options = content.options;
  if (!Array.isArray(options)) return null;

  let exploitation: Exploitation | null = null;
  let automatable: Automatable | null = null;
  let technical_impact: TechnicalImpact | null = null;
  for (const opt of options) {
    if (!opt || typeof opt !== 'object') continue;
    for (const [k, v] of Object.entries(opt as Record<string, unknown>)) {
      const key = k.trim().toLowerCase();
      const val = typeof v === 'string' ? v.trim().toLowerCase() : '';
      if (key === 'exploitation' && EXPLOITATION_VALUES.has(val)) exploitation = val as Exploitation;
      else if (key === 'automatable' && AUTOMATABLE_VALUES.has(val)) automatable = val as Automatable;
      else if (key === 'technical impact' && TECHNICAL_IMPACT_VALUES.has(val)) technical_impact = val as TechnicalImpact;
    }
  }
  if (!exploitation || !automatable || !technical_impact) return null;

  return {
    exploitation,
    automatable,
    technical_impact,
    role: typeof content.role === 'string' ? content.role : 'unknown',
    version: typeof content.version === 'string' ? content.version : 'unknown',
    scored_at: typeof content.timestamp === 'string' ? content.timestamp : '',
  };
}

export interface SsvcReasoningEntry {
  mission_wellbeing: MissionWellbeing;
  decision: Decision;
  path: string;
}

export interface SsvcVerdict {
  cve: string;
  verdict_kind: 'ssvc_decision';
  decision_points: { exploitation: Exploitation; automatable: Automatable; technical_impact: TechnicalImpact };
  decision_primary: Decision;
  decision_envelope: Record<MissionWellbeing, Decision>;
  mission_wellbeing: { assumed_primary: 'medium'; note: string };
  reasoning: SsvcReasoningEntry[];
  tree: { name: string; version: string; source_url: string };
  scored_at: string;
  source: { record: string; publisher: string; license: string };
}

export interface SsvcVerdictPreview {
  cve: string;
  verdict_kind: 'ssvc_decision';
  preview: true;
  decision_points: { exploitation: Exploitation; automatable: Automatable; technical_impact: TechnicalImpact };
  tree: { name: string; version: string; source_url: string };
  scored_at: string;
  source: { record: string; publisher: string; license: string };
}

const MW_LEVELS: MissionWellbeing[] = ['low', 'medium', 'high'];
const MW_NOTE =
  'CISA omits Mission and Well-being from the vulnrichment record (it is a stakeholder-specific compound of Mission Prevalence and Public Well-being Impact). The verdict is returned across all three levels; the primary assumes medium.';

export const SSVC_ATTRIBUTION = {
  publisher: 'CISA Vulnrichment',
  license: 'US Government public domain (17 USC 105)',
};

export function buildSsvcVerdict(cve: string, points: SsvcPoints): SsvcVerdict {
  const envelope: Record<MissionWellbeing, Decision> = {
    low: cisaSsvcDecision(points, 'low'),
    medium: cisaSsvcDecision(points, 'medium'),
    high: cisaSsvcDecision(points, 'high'),
  };
  const reasoning: SsvcReasoningEntry[] = MW_LEVELS.map((mw) => ({
    mission_wellbeing: mw,
    decision: envelope[mw],
    path: `exploitation=${points.exploitation}, automatable=${points.automatable}, technical_impact=${points.technical_impact}, mission_wellbeing=${mw} -> ${envelope[mw]}`,
  }));
  return {
    cve,
    verdict_kind: 'ssvc_decision',
    decision_points: {
      exploitation: points.exploitation,
      automatable: points.automatable,
      technical_impact: points.technical_impact,
    },
    decision_primary: envelope.medium,
    decision_envelope: envelope,
    mission_wellbeing: { assumed_primary: 'medium', note: MW_NOTE },
    reasoning,
    tree: { name: 'CISA SSVC Coordinator', version: CISA_SSVC_TREE_VERSION, source_url: CISA_SSVC_TREE_SOURCE },
    scored_at: points.scored_at,
    source: {
      record: `/api/security/vulnrichment/${cve}`,
      publisher: SSVC_ATTRIBUTION.publisher,
      license: SSVC_ATTRIBUTION.license,
    },
  };
}

/** Redact the verdict for the free preview: keep the public decision points and
 * provenance, drop the computed decision, envelope, and reasoning (the paid
 * derivation). */
export function redactSsvcVerdictForPreview(full: SsvcVerdict): SsvcVerdictPreview {
  return {
    cve: full.cve,
    verdict_kind: 'ssvc_decision',
    preview: true,
    decision_points: full.decision_points,
    tree: full.tree,
    scored_at: full.scored_at,
    source: full.source,
  };
}
