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

export const LLM_READY_CLEANING_VERSION = CLEANING_VERSION;

// Exported for tests. Not part of the public surface.
export const __test = { severityBand, epssRiskBand, safeStr, safeNum, deltaPct, isoDateFromYYYYMMDD };
