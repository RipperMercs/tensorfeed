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

export interface LlmReadyCompressionStats {
  source_bytes: number | null;
  cleaned_bytes: number;
  reduction_pct: number | null;
  approx_tokens_saved: number | null;
}

export interface LlmReadyEnvelope<T> {
  schema_version: '1.0';
  cleaning_version: string;
  transformed_at: string;
  source: string;
  compression_stats: LlmReadyCompressionStats | null;
  data: T;
}

function envelope<T>(source: string, data: T): LlmReadyEnvelope<T> {
  return {
    schema_version: '1.0',
    cleaning_version: CLEANING_VERSION,
    transformed_at: new Date().toISOString(),
    source,
    compression_stats: null,
    data,
  };
}

/**
 * Augment a transform output with compression statistics so the agent
 * sees the explicit ROI on every call. Token approximation uses the
 * common 4-bytes-per-token rule of thumb for English JSON; agents that
 * care about exact counts can run their own tokenizer over the raw +
 * cleaned bytes, but this approximation is plenty good for cost
 * justification at the request-decision level.
 *
 * Why a separate helper instead of folding into envelope(): we don't
 * always have the source bytes at transform time. The route handler
 * has them (just fetched from upstream) and adds them after; the
 * transformer functions stay testable without needing the raw payload.
 */
export function attachCompressionStats<T>(
  env: LlmReadyEnvelope<T>,
  sourceBytes: number | null,
): LlmReadyEnvelope<T> {
  const cleanedJson = JSON.stringify(env.data);
  const cleaned_bytes = new TextEncoder().encode(cleanedJson).length;
  let reduction_pct: number | null = null;
  let approx_tokens_saved: number | null = null;
  if (sourceBytes !== null && sourceBytes > 0) {
    const saved = Math.max(0, sourceBytes - cleaned_bytes);
    reduction_pct = Math.round((saved / sourceBytes) * 1000) / 10;
    approx_tokens_saved = Math.floor(saved / 4);
  }
  return {
    ...env,
    compression_stats: {
      source_bytes: sourceBytes,
      cleaned_bytes,
      reduction_pct,
      approx_tokens_saved,
    },
  };
}

/**
 * Compute the byte length of an arbitrary upstream payload so the
 * route handler can pass it to attachCompressionStats. Stable across
 * worker isolate runs because we use the canonical JSON serialization
 * we would have served if the agent had hit the free passthrough.
 */
export function measureSourceBytes(payload: unknown): number {
  return new TextEncoder().encode(JSON.stringify(payload)).length;
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

// ===== Verified CVE (composes MITRE + KEV + EPSS + OSV + Vulnrichment) =====

export type VerifiedCveSourceName = 'MITRE' | 'KEV' | 'EPSS' | 'OSV' | 'Vulnrichment';

export interface LlmReadyVerifiedCve {
  cve_id: string;
  severity_band: 'none' | 'low' | 'medium' | 'high' | 'critical';
  cvss_v3_1_score: number | null;
  summary: string | null;
  exploited_in_wild: boolean;
  epss_probability: number | null;
  epss_percentile: number | null;
  exploit_likelihood_band: 'low' | 'medium' | 'high' | 'critical';
  cwes: string[];
  affected_products: string[];
  affected_ecosystems: string[];
  references_top: string[];
  ssvc: {
    exploitation: string | null;
    automatable: string | null;
    technical_impact: string | null;
  } | null;
  confirmed_by: VerifiedCveSourceName[];
  corroboration_count: number;
  per_source: {
    mitre: { ok: boolean; cvss_score: number | null; cwes_count: number };
    kev: { ok: boolean; date_added: string | null; ransomware_use: 'yes' | 'unknown' | 'no' | null };
    epss: { ok: boolean; probability: number | null; percentile: number | null };
    osv: { ok: boolean; ecosystems_count: number; aliases_count: number };
    vulnrichment: { ok: boolean; has_ssvc: boolean };
  };
}

export interface VerifiedCveSourceInputs {
  cveId: string;
  mitreRecord: unknown | null;
  kevEntry: unknown | null;
  epssCurrent: unknown | null;
  osvRecord: unknown | null;
  vulnrichmentRecord: unknown | null;
}

function extractOsvEcosystems(raw: unknown): string[] {
  const r = (raw ?? {}) as Record<string, unknown>;
  const affected = Array.isArray(r.affected) ? r.affected : [];
  const ecosystems = new Set<string>();
  for (const a of affected) {
    const aObj = (a ?? {}) as Record<string, unknown>;
    const pkg = (aObj.package ?? {}) as Record<string, unknown>;
    const eco = safeStr(pkg.ecosystem);
    if (eco) ecosystems.add(eco);
  }
  return Array.from(ecosystems);
}

function extractOsvAliasesCount(raw: unknown): number {
  const r = (raw ?? {}) as Record<string, unknown>;
  return Array.isArray(r.aliases) ? r.aliases.length : 0;
}

function extractOsvSummary(raw: unknown): string | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  return safeStr(r.summary) ?? safeStr(r.details);
}

function extractVulnrichmentSsvc(raw: unknown): {
  exploitation: string | null;
  automatable: string | null;
  technical_impact: string | null;
} | null {
  const r = (raw ?? {}) as Record<string, unknown>;
  const containers = (r.containers ?? {}) as Record<string, unknown>;
  const adp = Array.isArray(containers.adp) ? containers.adp : [];
  for (const entry of adp) {
    const e = (entry ?? {}) as Record<string, unknown>;
    const metrics = Array.isArray(e.metrics) ? e.metrics : [];
    for (const m of metrics) {
      const mObj = (m ?? {}) as Record<string, unknown>;
      const ssvc = (mObj.other ?? mObj.ssvc) as Record<string, unknown> | undefined;
      if (ssvc) {
        const content = (ssvc.content ?? ssvc) as Record<string, unknown>;
        const options = (content.options ?? {}) as Record<string, unknown> | unknown[];
        if (Array.isArray(options)) {
          let exploitation: string | null = null;
          let automatable: string | null = null;
          let technical_impact: string | null = null;
          for (const opt of options) {
            const o = (opt ?? {}) as Record<string, unknown>;
            if (typeof o.Exploitation === 'string') exploitation = o.Exploitation;
            if (typeof o.Automatable === 'string') automatable = o.Automatable;
            if (typeof o['Technical Impact'] === 'string') technical_impact = o['Technical Impact'] as string;
          }
          if (exploitation || automatable || technical_impact) {
            return { exploitation, automatable, technical_impact };
          }
        }
      }
    }
  }
  return null;
}

/**
 * Compose a single verified-CVE fact card from up to 5 independent
 * security databases. Each source contributes whatever it has; missing
 * sources just don't appear in confirmed_by. The agent gets one call
 * with cross-source corroboration instead of fanning out to 5 different
 * APIs and parsing 5 different formats. This is the single biggest
 * "save the agent time + reduce hallucination risk" lever in the
 * security suite.
 */
export function composeVerifiedCve(
  inputs: VerifiedCveSourceInputs,
): LlmReadyEnvelope<LlmReadyVerifiedCve> {
  const mitreClean = inputs.mitreRecord ? transformCveRecord(inputs.mitreRecord).data : null;
  const kevClean = inputs.kevEntry ? transformKevEntry(inputs.kevEntry).data : null;
  const epssClean = inputs.epssCurrent ? transformEpssScore(inputs.epssCurrent).data : null;

  const confirmed_by: VerifiedCveSourceName[] = [];
  if (inputs.mitreRecord) confirmed_by.push('MITRE');
  if (inputs.kevEntry) confirmed_by.push('KEV');
  if (inputs.epssCurrent) confirmed_by.push('EPSS');
  if (inputs.osvRecord) confirmed_by.push('OSV');
  if (inputs.vulnrichmentRecord) confirmed_by.push('Vulnrichment');

  const summary =
    mitreClean?.summary ??
    kevClean?.short_description ??
    extractOsvSummary(inputs.osvRecord) ??
    null;

  const cwes: string[] = [];
  if (mitreClean) for (const c of mitreClean.cwes) if (!cwes.includes(c)) cwes.push(c);
  if (kevClean) for (const c of kevClean.cwes) if (!cwes.includes(c)) cwes.push(c);

  const affected_ecosystems = inputs.osvRecord ? extractOsvEcosystems(inputs.osvRecord) : [];
  const ssvc = inputs.vulnrichmentRecord ? extractVulnrichmentSsvc(inputs.vulnrichmentRecord) : null;

  const data: LlmReadyVerifiedCve = {
    cve_id: inputs.cveId,
    severity_band: mitreClean?.severity_band ?? 'none',
    cvss_v3_1_score: mitreClean?.cvss_v3_1_score ?? null,
    summary,
    exploited_in_wild: Boolean(inputs.kevEntry),
    epss_probability: epssClean?.epss_probability ?? null,
    epss_percentile: epssClean?.percentile ?? null,
    exploit_likelihood_band: epssRiskBand(epssClean?.epss_probability ?? null),
    cwes,
    affected_products: mitreClean?.affected_products ?? [],
    affected_ecosystems,
    references_top: mitreClean?.references_top ?? [],
    ssvc,
    confirmed_by,
    corroboration_count: confirmed_by.length,
    per_source: {
      mitre: {
        ok: Boolean(inputs.mitreRecord),
        cvss_score: mitreClean?.cvss_v3_1_score ?? null,
        cwes_count: mitreClean?.cwes.length ?? 0,
      },
      kev: {
        ok: Boolean(inputs.kevEntry),
        date_added: kevClean?.date_added ?? null,
        ransomware_use: kevClean?.ransomware_use ?? null,
      },
      epss: {
        ok: Boolean(inputs.epssCurrent),
        probability: epssClean?.epss_probability ?? null,
        percentile: epssClean?.percentile ?? null,
      },
      osv: {
        ok: Boolean(inputs.osvRecord),
        ecosystems_count: affected_ecosystems.length,
        aliases_count: extractOsvAliasesCount(inputs.osvRecord),
      },
      vulnrichment: {
        ok: Boolean(inputs.vulnrichmentRecord),
        has_ssvc: ssvc !== null,
      },
    },
  };

  return envelope('TensorFeed Verified CVE (MITRE + KEV + EPSS + OSV + Vulnrichment)', data);
}

export const LLM_READY_CLEANING_VERSION = CLEANING_VERSION;

// Exported for tests. Not part of the public surface.
export const __test = { severityBand, epssRiskBand, safeStr, safeNum };
