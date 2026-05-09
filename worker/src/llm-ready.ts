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

// ===== OpenRouter model fact card (single model from catalog) =====

export interface LlmReadyOpenRouterModel {
  id: string;
  name: string | null;
  namespace: string | null;
  description: string | null;
  context_length: number | null;
  modality: string | null;
  tokenizer: string | null;
  instruct_type: string | null;
  created_iso: string | null;
  pricing_per_million_tokens: {
    prompt: number | null;
    completion: number | null;
    blended_5_to_1: number | null;
    image_per_image: number | null;
    request_per_call: number | null;
  };
  max_output_tokens: number | null;
  is_moderated: boolean | null;
  capabilities: {
    tools: boolean;
    vision: boolean;
    structured_outputs: boolean;
    reasoning: boolean;
    response_format: boolean;
  };
  supported_parameters_count: number;
  is_free_tier: boolean;
}

function isVisionModality(modality: string | null): boolean {
  if (!modality) return false;
  const lower = modality.toLowerCase();
  return lower.includes('image') || lower.includes('vision') || lower.includes('multimodal');
}

function unixSecondsToIso(unixSeconds: number | null | undefined): string | null {
  if (unixSeconds === null || unixSeconds === undefined) return null;
  const n = Number(unixSeconds);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString().slice(0, 10);
}

/**
 * Transform a single OpenRouter model row from the daily catalog
 * snapshot into an LLM-ready fact card. Pricing is normalized to
 * USD per million tokens (the universal convention agents reason in)
 * with a blended_5_to_1 derived field that captures the 5:1
 * input:output mix typical of agent workloads. Capability flags are
 * extracted from supported_parameters + modality so the agent can
 * boolean-filter without parsing the parameter array. Per-image and
 * per-request pricing are surfaced when the model has them.
 *
 * The compression headline this enables: agents searching for one
 * model would otherwise ingest the full ~270KB catalog (367 entries)
 * to find it. This delivers one ~500-byte card.
 */
export function transformOpenRouterModel(raw: unknown): LlmReadyEnvelope<LlmReadyOpenRouterModel> {
  const r = (raw ?? {}) as Record<string, unknown>;

  const id = safeStr(r.id) ?? '';
  const name = safeStr(r.name);
  const slashIdx = id.indexOf('/');
  const namespace = slashIdx > 0 ? id.slice(0, slashIdx) : null;
  const modality = safeStr(r.modality);

  const pricing = (r.pricing ?? {}) as Record<string, unknown>;
  const promptPerToken = safeNum(pricing.prompt);
  const completionPerToken = safeNum(pricing.completion);
  const promptPerMillion = promptPerToken !== null ? promptPerToken * 1_000_000 : null;
  const completionPerMillion = completionPerToken !== null ? completionPerToken * 1_000_000 : null;
  const blended_5_to_1 =
    promptPerMillion !== null && completionPerMillion !== null
      ? promptPerMillion * (5 / 6) + completionPerMillion * (1 / 6)
      : null;

  const supported = Array.isArray(r.supported_parameters) ? (r.supported_parameters as string[]) : [];
  const supportedSet = new Set(supported.map((s) => String(s).toLowerCase()));

  const topProvider = (r.top_provider ?? {}) as Record<string, unknown>;

  const data: LlmReadyOpenRouterModel = {
    id,
    name: name ?? id,
    namespace,
    description: safeStr(r.description),
    context_length: safeNum(r.context_length),
    modality,
    tokenizer: safeStr(r.tokenizer),
    instruct_type: safeStr(r.instruct_type),
    created_iso: unixSecondsToIso(safeNum(r.created)),
    pricing_per_million_tokens: {
      prompt: promptPerMillion !== null ? Math.round(promptPerMillion * 100) / 100 : null,
      completion: completionPerMillion !== null ? Math.round(completionPerMillion * 100) / 100 : null,
      blended_5_to_1: blended_5_to_1 !== null ? Math.round(blended_5_to_1 * 100) / 100 : null,
      image_per_image: safeNum(pricing.image),
      request_per_call: safeNum(pricing.request),
    },
    max_output_tokens: safeNum(topProvider.max_completion_tokens),
    is_moderated: typeof topProvider.is_moderated === 'boolean' ? topProvider.is_moderated : null,
    capabilities: {
      tools: supportedSet.has('tools') || supportedSet.has('tool_choice'),
      vision: isVisionModality(modality),
      structured_outputs: supportedSet.has('structured_outputs') || supportedSet.has('response_format'),
      reasoning: supportedSet.has('reasoning') || supportedSet.has('include_reasoning'),
      response_format: supportedSet.has('response_format'),
    },
    supported_parameters_count: supported.length,
    is_free_tier: promptPerToken === 0 && completionPerToken === 0,
  };

  return envelope('OpenRouter Model Catalog', data);
}

// ===== NASA POWER (daily or hourly point) =====

export interface LlmReadyPowerRow {
  date: string;
  [parameter: string]: string | number | null;
}

export interface LlmReadyPowerDaily {
  location: {
    latitude: number | null;
    longitude: number | null;
    elevation_meters: number | null;
  };
  parameters_meta: Record<string, { units: string | null; longname: string | null }>;
  rows: LlmReadyPowerRow[];
  summary: {
    row_count: number;
    parameter_count: number;
    date_start: string | null;
    date_end: string | null;
    sources: string[];
  };
}

function isoDateFromYYYYMMDD(s: string): string {
  if (/^\d{8}$/.test(s)) {
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  }
  if (/^\d{10}$/.test(s)) {
    // hourly format YYYYMMDDHH -> YYYY-MM-DD HH:00 UTC
    return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:00:00Z`;
  }
  return s;
}

export function transformNasaPowerPoint(raw: unknown): LlmReadyEnvelope<LlmReadyPowerDaily> {
  const r = (raw ?? {}) as Record<string, unknown>;
  const geom = (r.geometry ?? {}) as Record<string, unknown>;
  const coords = Array.isArray(geom.coordinates) ? geom.coordinates : [];
  const longitude = safeNum(coords[0]);
  const latitude = safeNum(coords[1]);
  const elevation_meters = safeNum(coords[2]);

  const properties = (r.properties ?? {}) as Record<string, unknown>;
  const parameter = (properties.parameter ?? {}) as Record<string, Record<string, unknown>>;

  const parameters_meta: Record<string, { units: string | null; longname: string | null }> = {};
  const parametersMetaRaw = (r.parameters ?? {}) as Record<string, Record<string, unknown>>;
  for (const [name, meta] of Object.entries(parametersMetaRaw)) {
    parameters_meta[name] = {
      units: safeStr(meta.units),
      longname: safeStr(meta.longname),
    };
  }

  // Pivot: NASA returns parameter-keyed dicts; we want date-keyed rows.
  const dateSet = new Set<string>();
  for (const param of Object.keys(parameter)) {
    for (const date of Object.keys(parameter[param])) dateSet.add(date);
  }
  const dates = Array.from(dateSet).sort();
  const rows: LlmReadyPowerRow[] = dates.map((rawDate) => {
    const row: LlmReadyPowerRow = { date: isoDateFromYYYYMMDD(rawDate) };
    for (const param of Object.keys(parameter)) {
      const v = parameter[param][rawDate];
      const num = safeNum(v);
      // NASA POWER uses fill_value (typically -999) to signal missing
      // observations. Surface as null instead of the magic value.
      if (num !== null && num <= -999) row[param] = null;
      else row[param] = num;
    }
    return row;
  });

  const header = (r.header ?? {}) as Record<string, unknown>;
  const sources = Array.isArray(header.sources)
    ? (header.sources as unknown[]).map((s) => safeStr(s)).filter((s): s is string => Boolean(s))
    : [];

  return envelope('NASA POWER', {
    location: { latitude, longitude, elevation_meters },
    parameters_meta,
    rows,
    summary: {
      row_count: rows.length,
      parameter_count: Object.keys(parameter).length,
      date_start: rows.length > 0 ? rows[0].date : null,
      date_end: rows.length > 0 ? rows[rows.length - 1].date : null,
      sources,
    },
  });
}

// ===== EIA Open Data (time series) =====

export interface LlmReadyEiaPoint {
  period: string;
  value: number | null;
  units: string | null;
}

export interface LlmReadyEiaSeries {
  frequency: string | null;
  period_format: string | null;
  description: string | null;
  primary_units: string | null;
  points: LlmReadyEiaPoint[];
  summary: {
    count: number;
    first: { period: string; value: number | null } | null;
    latest: { period: string; value: number | null } | null;
    min: { period: string; value: number | null } | null;
    max: { period: string; value: number | null } | null;
    mom_delta_pct: number | null;
    yoy_delta_pct: number | null;
  };
}

function deltaPct(latest: number | null, prior: number | null): number | null {
  if (latest === null || prior === null || prior === 0) return null;
  return Math.round(((latest - prior) / prior) * 10000) / 100;
}

export function transformEiaSeries(raw: unknown): LlmReadyEnvelope<LlmReadyEiaSeries> {
  const r = (raw ?? {}) as Record<string, unknown>;
  const response = (r.response ?? {}) as Record<string, unknown>;
  const data = Array.isArray(response.data) ? (response.data as Record<string, unknown>[]) : [];
  const frequency = safeStr(response.frequency);
  const period_format = safeStr(response.dateFormat);
  const description = safeStr(response.description);

  // EIA returns points in DESC order by period (most recent first). We
  // sort ASC for deterministic delta math then re-extract latest/first.
  const points: LlmReadyEiaPoint[] = data
    .map((row) => ({
      period: safeStr(row.period) ?? '',
      value: safeNum(row.value),
      units: safeStr(row.unit) ?? safeStr(row.units),
    }))
    .filter((p) => p.period.length > 0);
  points.sort((a, b) => a.period.localeCompare(b.period));

  let primary_units: string | null = null;
  for (const p of points) {
    if (p.units) {
      primary_units = p.units;
      break;
    }
  }

  let firstPoint: { period: string; value: number | null } | null = null;
  let latestPoint: { period: string; value: number | null } | null = null;
  let minPoint: { period: string; value: number | null } | null = null;
  let maxPoint: { period: string; value: number | null } | null = null;
  for (const p of points) {
    if (p.value === null) continue;
    if (firstPoint === null) firstPoint = { period: p.period, value: p.value };
    latestPoint = { period: p.period, value: p.value };
    if (minPoint === null || (minPoint.value !== null && p.value < minPoint.value)) {
      minPoint = { period: p.period, value: p.value };
    }
    if (maxPoint === null || (maxPoint.value !== null && p.value > maxPoint.value)) {
      maxPoint = { period: p.period, value: p.value };
    }
  }

  // Month-over-month and year-over-year deltas. EIA periods are ISO-8601
  // prefixes (YYYY for annual, YYYY-MM for monthly, YYYY-MM-DD for daily).
  // We compute MoM as latest valid point vs the immediate prior valid
  // point (works for any frequency) and YoY as latest vs the same period
  // one year prior (computed via period string surgery for monthly +
  // daily). "valid" means value is not null; missing observations are
  // skipped on both sides of the comparison.
  let mom_delta_pct: number | null = null;
  let yoy_delta_pct: number | null = null;
  if (latestPoint) {
    const validPoints = points.filter((p) => p.value !== null);
    if (validPoints.length >= 2) {
      const prev = validPoints[validPoints.length - 2];
      mom_delta_pct = deltaPct(latestPoint.value, prev.value);
    }
  }
  if (latestPoint) {
    const yoyPeriod = (() => {
      const m = latestPoint.period;
      if (/^\d{4}-\d{2}-\d{2}$/.test(m)) {
        return `${parseInt(m.slice(0, 4), 10) - 1}${m.slice(4)}`;
      }
      if (/^\d{4}-\d{2}$/.test(m)) {
        return `${parseInt(m.slice(0, 4), 10) - 1}${m.slice(4)}`;
      }
      if (/^\d{4}$/.test(m)) {
        return String(parseInt(m, 10) - 1);
      }
      return null;
    })();
    if (yoyPeriod) {
      const yoyPoint = points.find((p) => p.period === yoyPeriod);
      if (yoyPoint && yoyPoint.value !== null) {
        yoy_delta_pct = deltaPct(latestPoint.value, yoyPoint.value);
      }
    }
  }

  return envelope('EIA Open Data', {
    frequency,
    period_format,
    description,
    primary_units,
    points,
    summary: {
      count: points.length,
      first: firstPoint,
      latest: latestPoint,
      min: minPoint,
      max: maxPoint,
      mom_delta_pct,
      yoy_delta_pct,
    },
  });
}

// ===== OpenFDA (5 categories) =====

function joinFirstN(arr: unknown, max = 1): string | null {
  if (!Array.isArray(arr) || arr.length === 0) return null;
  const slice = arr.slice(0, max).map((s) => safeStr(s)).filter((s): s is string => Boolean(s));
  return slice.length > 0 ? slice.join(' | ') : null;
}

function joinAll(arr: unknown): string | null {
  if (!Array.isArray(arr)) return null;
  const items = arr.map((s) => safeStr(s)).filter((s): s is string => Boolean(s));
  return items.length > 0 ? items.join(' | ') : null;
}

function uniq(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of arr) {
    if (!item) continue;
    const k = item.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

function isoFromFdaDate(s: string | null): string | null {
  if (!s) return null;
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  return s;
}

export interface LlmReadyFdaDrugEvent {
  id: string | null;
  country: string | null;
  received_at: string | null;
  occurred_at: string | null;
  serious: boolean | null;
  seriousness_flags: string[];
  patient_age: number | null;
  patient_sex: string | null;
  drugs: string[];
  reactions: string[];
  outcomes: string[];
  primary_drug: string | null;
  primary_reaction: string | null;
  drug_count: number;
  reaction_count: number;
}

export function transformFdaDrugEvent(raw: unknown): LlmReadyFdaDrugEvent {
  const r = (raw ?? {}) as Record<string, unknown>;
  const patient = (r.patient ?? {}) as Record<string, unknown>;
  const drugsRaw = Array.isArray(patient.drug) ? (patient.drug as Record<string, unknown>[]) : [];
  const reactionsRaw = Array.isArray(patient.reaction) ? (patient.reaction as Record<string, unknown>[]) : [];

  const drugs = uniq(drugsRaw.map((d) => safeStr(d.medicinalproduct) ?? '').filter(Boolean));
  const reactions = uniq(
    reactionsRaw.map((r2) => safeStr(r2.reactionmeddrapt) ?? '').filter(Boolean),
  );
  const outcomes = uniq(
    reactionsRaw
      .map((r2) => safeStr(r2.reactionoutcome))
      .filter((s): s is string => Boolean(s)),
  );

  const seriousness_flags: string[] = [];
  if (safeStr(r.seriousnessdeath) === '1') seriousness_flags.push('death');
  if (safeStr(r.seriousnesshospitalization) === '1') seriousness_flags.push('hospitalization');
  if (safeStr(r.seriousnesslifethreatening) === '1') seriousness_flags.push('life_threatening');
  if (safeStr(r.seriousnessdisabling) === '1') seriousness_flags.push('disabling');
  if (safeStr(r.seriousnesscongenitalanomali) === '1') seriousness_flags.push('congenital_anomaly');

  const seriousRaw = safeStr(r.serious);
  const serious = seriousRaw === '1' ? true : seriousRaw === '2' ? false : null;

  const patient_sex = (() => {
    const s = safeStr(patient.patientsex);
    if (s === '1') return 'male';
    if (s === '2') return 'female';
    return null;
  })();

  return {
    id: safeStr(r.safetyreportid),
    country: safeStr(r.primarysourcecountry) ?? safeStr(r.occurcountry),
    received_at: isoFromFdaDate(safeStr(r.receivedate)),
    occurred_at: isoFromFdaDate(safeStr(r.transmissiondate)),
    serious,
    seriousness_flags,
    patient_age: safeNum(patient.patientonsetage),
    patient_sex,
    drugs,
    reactions,
    outcomes,
    primary_drug: drugs[0] ?? null,
    primary_reaction: reactions[0] ?? null,
    drug_count: drugs.length,
    reaction_count: reactions.length,
  };
}

export interface LlmReadyFdaDrugLabel {
  id: string | null;
  set_id: string | null;
  brand_names: string[];
  generic_names: string[];
  manufacturer: string | null;
  product_type: string | null;
  route: string[];
  indications: string | null;
  dosage: string | null;
  warnings: string | null;
  adverse_reactions: string | null;
  contraindications: string | null;
  effective_time: string | null;
}

export function transformFdaDrugLabel(raw: unknown): LlmReadyFdaDrugLabel {
  const r = (raw ?? {}) as Record<string, unknown>;
  const openfda = (r.openfda ?? {}) as Record<string, unknown>;
  const brandRaw = Array.isArray(openfda.brand_name) ? openfda.brand_name : [];
  const genericRaw = Array.isArray(openfda.generic_name) ? openfda.generic_name : [];
  const manufRaw = Array.isArray(openfda.manufacturer_name) ? openfda.manufacturer_name : [];
  const routeRaw = Array.isArray(openfda.route) ? openfda.route : [];

  return {
    id: safeStr(r.id),
    set_id: safeStr(r.set_id),
    brand_names: uniq(brandRaw.map((s) => safeStr(s) ?? '').filter(Boolean)),
    generic_names: uniq(genericRaw.map((s) => safeStr(s) ?? '').filter(Boolean)),
    manufacturer: safeStr(manufRaw[0]),
    product_type: safeStr((openfda.product_type as unknown[] | undefined)?.[0]),
    route: uniq(routeRaw.map((s) => safeStr(s) ?? '').filter(Boolean)),
    indications: joinAll(r.indications_and_usage),
    dosage: joinAll(r.dosage_and_administration),
    warnings: joinAll(r.warnings),
    adverse_reactions: joinAll(r.adverse_reactions),
    contraindications: joinAll(r.contraindications),
    effective_time: isoFromFdaDate(safeStr(r.effective_time)),
  };
}

export interface LlmReadyFdaRecall {
  id: string | null;
  status: string | null;
  classification: string | null;
  product: string | null;
  reason: string | null;
  distribution: string | null;
  firm: string | null;
  voluntary: boolean | null;
  state: string | null;
  country: string | null;
  initiated_at: string | null;
  reported_at: string | null;
  termination_at: string | null;
}

export function transformFdaRecall(raw: unknown): LlmReadyFdaRecall {
  const r = (raw ?? {}) as Record<string, unknown>;
  const voluntaryRaw = safeStr(r.voluntary_mandated)?.toLowerCase() ?? '';
  const voluntary = voluntaryRaw.includes('voluntary')
    ? true
    : voluntaryRaw.includes('mandated')
      ? false
      : null;
  return {
    id: safeStr(r.recall_number),
    status: safeStr(r.status),
    classification: safeStr(r.classification),
    product: safeStr(r.product_description),
    reason: safeStr(r.reason_for_recall),
    distribution: safeStr(r.distribution_pattern),
    firm: safeStr(r.recalling_firm),
    voluntary,
    state: safeStr(r.state),
    country: safeStr(r.country),
    initiated_at: isoFromFdaDate(safeStr(r.recall_initiation_date)),
    reported_at: isoFromFdaDate(safeStr(r.report_date)),
    termination_at: isoFromFdaDate(safeStr(r.termination_date)),
  };
}

export interface LlmReadyFdaDeviceEvent {
  id: string | null;
  event_type: string | null;
  date_of_event: string | null;
  date_received: string | null;
  device_name: string | null;
  device_manufacturer: string | null;
  product_problems: string[];
  patient_outcomes: string[];
  source_type: string | null;
  narrative: string | null;
}

export function transformFdaDeviceEvent(raw: unknown): LlmReadyFdaDeviceEvent {
  const r = (raw ?? {}) as Record<string, unknown>;
  const devices = Array.isArray(r.device) ? (r.device as Record<string, unknown>[]) : [];
  const patients = Array.isArray(r.patient) ? (r.patient as Record<string, unknown>[]) : [];
  const mdrText = Array.isArray(r.mdr_text) ? (r.mdr_text as Record<string, unknown>[]) : [];

  const patient_outcomes: string[] = [];
  for (const p of patients) {
    const arr = Array.isArray(p.patient_problems) ? p.patient_problems : [];
    for (const o of arr) {
      const s = safeStr(o);
      if (s && !patient_outcomes.includes(s)) patient_outcomes.push(s);
    }
  }

  const product_problems = Array.isArray(r.product_problems)
    ? uniq((r.product_problems as unknown[]).map((s) => safeStr(s) ?? '').filter(Boolean))
    : [];

  const narrative = (() => {
    if (mdrText.length === 0) return null;
    const parts: string[] = [];
    for (const m of mdrText) {
      const txt = safeStr(m.text);
      if (txt) parts.push(txt);
    }
    if (parts.length === 0) return null;
    const joined = parts.join('\n\n');
    return joined.length > 4000 ? joined.slice(0, 4000) + '...' : joined;
  })();

  return {
    id: safeStr(r.report_number) ?? safeStr(r.mdr_report_key),
    event_type: safeStr(r.event_type),
    date_of_event: isoFromFdaDate(safeStr(r.date_of_event)),
    date_received: isoFromFdaDate(safeStr(r.date_received)),
    device_name: safeStr(devices[0]?.brand_name ?? devices[0]?.generic_name),
    device_manufacturer: safeStr(devices[0]?.manufacturer_d_name),
    product_problems,
    patient_outcomes,
    source_type: safeStr(r.source_type) ?? safeStr(r.type_of_report),
    narrative,
  };
}

export interface LlmReadyFdaResults<T> {
  category: string;
  upstream_total: number | null;
  count: number;
  results: T[];
}

type FdaTransformer =
  | ((raw: unknown) => LlmReadyFdaDrugEvent)
  | ((raw: unknown) => LlmReadyFdaDrugLabel)
  | ((raw: unknown) => LlmReadyFdaRecall)
  | ((raw: unknown) => LlmReadyFdaDeviceEvent);

const FDA_TRANSFORMERS: Record<string, FdaTransformer> = {
  'drug/events': transformFdaDrugEvent,
  'drug/labels': transformFdaDrugLabel,
  'drug/recalls': transformFdaRecall,
  'food/recalls': transformFdaRecall,
  'device/events': transformFdaDeviceEvent,
};

export function transformFdaQueryResults(
  category: string,
  raw: unknown,
): LlmReadyEnvelope<LlmReadyFdaResults<unknown>> | null {
  // hasOwnProperty.call guards against prototype-chain keys like
  // `__proto__` resolving to Object.prototype and being invoked as a
  // function on line 859, which would crash the worker.
  if (!Object.prototype.hasOwnProperty.call(FDA_TRANSFORMERS, category)) {
    return null;
  }
  const transformer = FDA_TRANSFORMERS[category];
  if (typeof transformer !== 'function') return null;
  const r = (raw ?? {}) as Record<string, unknown>;
  const meta = (r.meta ?? {}) as Record<string, unknown>;
  const metaResults = (meta.results ?? {}) as Record<string, unknown>;
  const results = Array.isArray(r.results) ? r.results : [];
  const transformed = results.map((row) => transformer(row));
  return envelope(`OpenFDA ${category}`, {
    category,
    upstream_total: safeNum(metaResults.total),
    count: transformed.length,
    results: transformed,
  });
}

export const LLM_READY_CLEANING_VERSION = CLEANING_VERSION;

// Exported for tests. Not part of the public surface.
export const __test = { severityBand, epssRiskBand, safeStr, safeNum, deltaPct, isoDateFromYYYYMMDD };
