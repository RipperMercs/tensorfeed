/**
 * LLM-ready transform layer.
 *
 * The thesis: TF's deep moat is not the underlying data (anyone can hit
 * MITRE/CISA/NASA/FDA/EIA directly) but the transformation. Agents pay
 * because their context-window-tax savings exceed our $0.02 cost. We
 * pre-pay the parsing, schema-normalization, and field-extraction cost
 * once, deliver dense token-efficient payloads, and the agent skips
 * 80%+ of the tokens it would otherwise spend reading raw upstream
 * formats.
 *
 * Design principles:
 *   1. Flatten aggressively. Raw upstream formats are deeply nested
 *      because they're optimized for completeness. LLM-ready formats
 *      are flat because they're optimized for read-once consumption.
 *   2. Single-language outputs. Multilingual fields collapse to one
 *      English string; agents can hit raw if they need other languages.
 *   3. Derived fields. Severity bands, regime tags, MoM/YoY deltas,
 *      affected_count rollups. Save the agent the math.
 *   4. Versioned output. Every payload carries `cleaning_version` so
 *      agents can rely on schema stability, and `transformed_at` for
 *      cache-busting on transform updates.
 *   5. Token-efficient field names without sacrificing clarity.
 *      `severity` not `s`, but `cwes` not `commonWeaknessEnumerations`.
 */

const CLEANING_VERSION = '1.0';

export interface LlmReadyEnvelope<T> {
  schema_version: '1.0';
  cleaning_version: string;
  transformed_at: string;
  source: string;
  data: T;
}

function envelope<T>(source: string, data: T): LlmReadyEnvelope<T> {
  return {
    schema_version: '1.0',
    cleaning_version: CLEANING_VERSION,
    transformed_at: new Date().toISOString(),
    source,
    data,
  };
}

function safeStr(v: unknown): string | null {
  if (typeof v === 'string') return v.trim() || null;
  if (typeof v === 'number') return String(v);
  return null;
}

function safeNum(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function pickFirst<T>(arr: unknown, predicate: (item: unknown) => T | null): T | null {
  if (!Array.isArray(arr)) return null;
  for (const item of arr) {
    const out = predicate(item);
    if (out !== null) return out;
  }
  return null;
}

function severityBand(score: number | null): 'none' | 'low' | 'medium' | 'high' | 'critical' {
  if (score === null) return 'none';
  if (score < 0.1) return 'none';
  if (score < 4) return 'low';
  if (score < 7) return 'medium';
  if (score < 9) return 'high';
  return 'critical';
}

function epssRiskBand(prob: number | null): 'low' | 'medium' | 'high' | 'critical' {
  if (prob === null) return 'low';
  if (prob < 0.05) return 'low';
  if (prob < 0.5) return 'medium';
  if (prob < 0.9) return 'high';
  return 'critical';
}

// ===== CVE (MITRE Record v5.2) =====

export interface LlmReadyCve {
  id: string | null;
  state: string | null;
  published_at: string | null;
  updated_at: string | null;
  assigner: string | null;
  summary: string | null;
  cvss_v3_1_score: number | null;
  cvss_v3_1_severity: string | null;
  cvss_vector: string | null;
  severity_band: 'none' | 'low' | 'medium' | 'high' | 'critical';
  cwes: string[];
  affected_products: string[];
  affected_count: number;
  references_count: number;
  references_top: string[];
}

export function transformCveRecord(raw: unknown): LlmReadyEnvelope<LlmReadyCve> {
  const r = (raw ?? {}) as Record<string, unknown>;
  const meta = (r.cveMetadata ?? {}) as Record<string, unknown>;
  const containers = (r.containers ?? {}) as Record<string, unknown>;
  const cna = (containers.cna ?? {}) as Record<string, unknown>;

  const id = safeStr(meta.cveId);
  const state = safeStr(meta.state);
  const published_at = safeStr(meta.datePublished);
  const updated_at = safeStr(meta.dateUpdated);
  const assigner = safeStr(meta.assignerShortName);

  const summary = pickFirst(cna.descriptions, (item) => {
    const d = (item ?? {}) as Record<string, unknown>;
    if (d.lang === 'en' || d.lang === 'eng') return safeStr(d.value);
    return null;
  });

  let cvss_v3_1_score: number | null = null;
  let cvss_v3_1_severity: string | null = null;
  let cvss_vector: string | null = null;
  if (Array.isArray(cna.metrics)) {
    for (const m of cna.metrics) {
      const metric = (m ?? {}) as Record<string, unknown>;
      const cvss31 = (metric.cvssV3_1 ?? metric['cvssV3.1']) as Record<string, unknown> | undefined;
      if (cvss31) {
        cvss_v3_1_score = safeNum(cvss31.baseScore) ?? cvss_v3_1_score;
        cvss_v3_1_severity = safeStr(cvss31.baseSeverity) ?? cvss_v3_1_severity;
        cvss_vector = safeStr(cvss31.vectorString) ?? cvss_vector;
        if (cvss_v3_1_score !== null) break;
      }
    }
  }

  const cwes: string[] = [];
  if (Array.isArray(cna.problemTypes)) {
    for (const pt of cna.problemTypes) {
      const ptObj = (pt ?? {}) as Record<string, unknown>;
      if (Array.isArray(ptObj.descriptions)) {
        for (const d of ptObj.descriptions) {
          const dObj = (d ?? {}) as Record<string, unknown>;
          const cwe = safeStr(dObj.cweId);
          if (cwe && !cwes.includes(cwe)) cwes.push(cwe);
        }
      }
    }
  }

  const affected_products: string[] = [];
  if (Array.isArray(cna.affected)) {
    for (const a of cna.affected) {
      const aObj = (a ?? {}) as Record<string, unknown>;
      const vendor = safeStr(aObj.vendor) ?? '';
      const product = safeStr(aObj.product) ?? '';
      const combined = [vendor, product].filter(Boolean).join(' ');
      if (combined && !affected_products.includes(combined)) affected_products.push(combined);
    }
  }

  const refs = Array.isArray(cna.references) ? cna.references : [];
  const references_top: string[] = [];
  for (const ref of refs) {
    const rObj = (ref ?? {}) as Record<string, unknown>;
    const url = safeStr(rObj.url);
    if (url && references_top.length < 5) references_top.push(url);
  }

  return envelope('MITRE CVE List', {
    id,
    state,
    published_at,
    updated_at,
    assigner,
    summary,
    cvss_v3_1_score,
    cvss_v3_1_severity,
    cvss_vector,
    severity_band: severityBand(cvss_v3_1_score),
    cwes,
    affected_products,
    affected_count: affected_products.length,
    references_count: refs.length,
    references_top,
  });
}

// ===== KEV (CISA Known Exploited Vulnerabilities) =====

export interface LlmReadyKev {
  cve_id: string | null;
  vendor: string | null;
  product: string | null;
  vulnerability_name: string | null;
  date_added: string | null;
  due_date: string | null;
  short_description: string | null;
  required_action: string | null;
  ransomware_use: 'yes' | 'unknown' | 'no';
  cwes: string[];
  notes_urls: string[];
}

export function transformKevEntry(raw: unknown): LlmReadyEnvelope<LlmReadyKev> {
  const r = (raw ?? {}) as Record<string, unknown>;
  const ransomwareRaw = safeStr(r.knownRansomwareCampaignUse) ?? 'Unknown';
  const ransomware_use: 'yes' | 'unknown' | 'no' =
    ransomwareRaw.toLowerCase() === 'known'
      ? 'yes'
      : ransomwareRaw.toLowerCase() === 'unknown'
        ? 'unknown'
        : 'no';

  const notes = safeStr(r.notes) ?? '';
  const notes_urls: string[] = [];
  for (const part of notes.split(/[\s;,]+/)) {
    const trimmed = part.trim();
    if (trimmed.startsWith('http')) notes_urls.push(trimmed);
  }

  const cwes = Array.isArray(r.cwes)
    ? (r.cwes as unknown[]).map((c) => safeStr(c)).filter((c): c is string => Boolean(c))
    : [];

  return envelope('CISA KEV', {
    cve_id: safeStr(r.cveID),
    vendor: safeStr(r.vendorProject),
    product: safeStr(r.product),
    vulnerability_name: safeStr(r.vulnerabilityName),
    date_added: safeStr(r.dateAdded),
    due_date: safeStr(r.dueDate),
    short_description: safeStr(r.shortDescription),
    required_action: safeStr(r.requiredAction),
    ransomware_use,
    cwes,
    notes_urls,
  });
}

// ===== EPSS (Exploit Prediction Scoring System) =====

export interface LlmReadyEpss {
  cve_id: string | null;
  date: string | null;
  epss_probability: number | null;
  percentile: number | null;
  risk_band: 'low' | 'medium' | 'high' | 'critical';
  series_points: number;
  series_first: { date: string | null; epss: number | null } | null;
  series_min: { date: string | null; epss: number | null } | null;
  series_max: { date: string | null; epss: number | null } | null;
}

interface EpssPoint {
  date?: unknown;
  epss?: unknown;
  percentile?: unknown;
}

export function transformEpssScore(raw: unknown): LlmReadyEnvelope<LlmReadyEpss> {
  const r = (raw ?? {}) as Record<string, unknown>;
  const cve_id = safeStr(r.cve);
  const date = safeStr(r.date);
  const epss_probability = safeNum(r.epss);
  const percentile = safeNum(r.percentile);

  const series = Array.isArray(r['time-series']) ? (r['time-series'] as EpssPoint[]) : [];
  let firstPoint: { date: string | null; epss: number | null } | null = null;
  let minPoint: { date: string | null; epss: number | null } | null = null;
  let maxPoint: { date: string | null; epss: number | null } | null = null;

  for (const p of series) {
    const pDate = safeStr(p.date);
    const pEpss = safeNum(p.epss);
    if (pEpss === null) continue;
    if (firstPoint === null || (pDate && firstPoint.date && pDate < firstPoint.date)) {
      firstPoint = { date: pDate, epss: pEpss };
    }
    if (minPoint === null || (minPoint.epss !== null && pEpss < minPoint.epss)) {
      minPoint = { date: pDate, epss: pEpss };
    }
    if (maxPoint === null || (maxPoint.epss !== null && pEpss > maxPoint.epss)) {
      maxPoint = { date: pDate, epss: pEpss };
    }
  }

  return envelope('FIRST.org EPSS', {
    cve_id,
    date,
    epss_probability,
    percentile,
    risk_band: epssRiskBand(epss_probability),
    series_points: series.length,
    series_first: firstPoint,
    series_min: minPoint,
    series_max: maxPoint,
  });
}

export const LLM_READY_CLEANING_VERSION = CLEANING_VERSION;

// Exported for tests. Not part of the public surface.
export const __test = { severityBand, epssRiskBand, safeStr, safeNum };
