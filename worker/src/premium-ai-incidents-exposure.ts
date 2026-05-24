/**
 * Premium AI safety incidents exposure analytics.
 *
 * Derives exposure metrics over the AVID snapshot stored at `avid:current`
 * (worker/src/avid-fetcher.ts). For every developer + deployer + risk
 * domain + AVID SEP-view (Security / Ethics / Performance) category that
 * appears in the recent snapshot, computes incident counts and a recency-
 * weighted exposure score so an agent can ask "which AI vendors have the
 * most recent reported AI-safety incidents."
 *
 * Free /api/ai-safety/incidents/avid returns the raw snapshot.
 * This endpoint is the agent-decision-ready aggregation.
 *
 * Cost: 1 credit. NULL_SLA freshness because the exposure math runs at
 * request time over whatever the most-recent avid:current snapshot is;
 * the underlying snapshot freshness is governed by the AVID fetcher cron.
 *
 * AIID coverage is a follow-up: AIID's only Worker-viable access is a
 * 100MB weekly R2 tarball (their GraphQL is origin-gated). When that
 * lands, this module will fold AIID rows into the same exposure shape
 * under an extra source: 'aiid' tag per entry.
 */

import type { AvidSnapshot, AvidEntry } from './avid-fetcher';

// ─── Filter ─────────────────────────────────────────────────────────

export interface ExposureFilter {
  /** Substring (case-insensitive) match against developer + deployer + artifact name. null = all. */
  vendor: string | null;
  /** Substring (case-insensitive) match against risk_domains. null = all. */
  risk_domain: string | null;
  /** Limit the window to entries reported in the last N days. null = no window. */
  within_days: number | null;
}

export const DEFAULT_WITHIN_DAYS: number | null = null;
export const MIN_WITHIN_DAYS = 7;
export const MAX_WITHIN_DAYS = 730;

export function parseVendor(raw: string | null): string | null {
  if (raw === null) return null;
  const t = raw.trim();
  return t || null;
}

export function parseRiskDomain(raw: string | null): string | null {
  if (raw === null) return null;
  const t = raw.trim();
  return t || null;
}

export function parseWithinDays(raw: string | null): number | null {
  if (raw === null || raw === '') return null;
  const n = parseInt(raw, 10);
  if (Number.isNaN(n)) return null;
  if (n < MIN_WITHIN_DAYS) return MIN_WITHIN_DAYS;
  if (n > MAX_WITHIN_DAYS) return MAX_WITHIN_DAYS;
  return n;
}

// ─── Response shape ─────────────────────────────────────────────────

export interface VendorExposureRow {
  vendor: string;
  role: 'developer' | 'deployer';
  incident_count: number;
  recent_count_30d: number;
  exposure_score: number;     // recency-weighted: 1.0 last 30d, 0.5 next 60d, 0.25 rest
  risk_domains: string[];     // distinct risk_domains seen for this vendor
  latest_report_id: string;
  latest_reported_date: string;
}

export interface RiskDomainRow {
  risk_domain: string;
  incident_count: number;
  recent_count_30d: number;
}

export interface SepViewRow {
  sep_view: string;
  incident_count: number;
}

export interface ArtifactRow {
  name: string;
  type: string;
  incident_count: number;
  developers: string[];
}

export interface ExposureResponse {
  ok: true;
  capturedAt: string;
  snapshot_captured_at: string;
  source: 'avidml/avid-db';
  source_license: 'MIT';
  filter: { vendor: string | null; risk_domain: string | null; within_days: number | null };
  window: { window_days: number | null; cutoff_date: string | null };
  entries_count: number;
  developers: VendorExposureRow[];
  deployers: VendorExposureRow[];
  risk_domains: RiskDomainRow[];
  sep_view: SepViewRow[];
  top_artifacts: ArtifactRow[];
  attribution: {
    source: string;
    license: string;
    notes: string;
  };
}

const DAY_MS = 24 * 60 * 60 * 1000;

function daysAgo(iso: string, now: Date): number | null {
  if (!iso) return null;
  const t = new Date(`${iso}T00:00:00Z`).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((now.getTime() - t) / DAY_MS);
}

/**
 * Recency-weight an entry. Last 30 days = 1.0, days 31-90 = 0.5, older = 0.25.
 * Undated entries weight 0.25 (older-than-90 floor).
 */
export function recencyWeight(entry: AvidEntry, now: Date): number {
  const days = daysAgo(entry.reported_date, now);
  if (days === null) return 0.25;
  if (days <= 30) return 1.0;
  if (days <= 90) return 0.5;
  return 0.25;
}

function filterEntries(snapshot: AvidSnapshot, filter: ExposureFilter, now: Date): { entries: AvidEntry[]; cutoff_date: string | null } {
  const vendorNeedle = filter.vendor?.toLowerCase();
  const riskNeedle = filter.risk_domain?.toLowerCase();
  let cutoffMs: number | null = null;
  let cutoffDate: string | null = null;
  if (filter.within_days !== null) {
    cutoffMs = now.getTime() - filter.within_days * DAY_MS;
    cutoffDate = new Date(cutoffMs).toISOString().slice(0, 10);
  }

  const out = snapshot.entries.filter((e) => {
    if (vendorNeedle) {
      const hay = [
        ...e.developers,
        ...e.deployers,
        ...e.artifacts.map((a) => a.name),
      ]
        .filter(Boolean)
        .map((s) => s.toLowerCase())
        .join('|');
      if (!hay.includes(vendorNeedle)) return false;
    }
    if (riskNeedle) {
      const matches = e.risk_domains.some((r) => r.toLowerCase().includes(riskNeedle));
      if (!matches) return false;
    }
    if (cutoffMs !== null && e.reported_date) {
      const t = new Date(`${e.reported_date}T00:00:00Z`).getTime();
      if (!Number.isNaN(t) && t < cutoffMs) return false;
    }
    return true;
  });

  return { entries: out, cutoff_date: cutoffDate };
}

function buildVendorRows(
  entries: AvidEntry[],
  role: 'developer' | 'deployer',
  now: Date,
): VendorExposureRow[] {
  const map = new Map<string, {
    incident_count: number;
    recent_count_30d: number;
    exposure_score: number;
    risk_domains: Set<string>;
    latest_report_id: string;
    latest_reported_date: string;
  }>();
  for (const e of entries) {
    const vendors = role === 'developer' ? e.developers : e.deployers;
    const w = recencyWeight(e, now);
    const days = daysAgo(e.reported_date, now);
    const isRecent = days !== null && days <= 30;
    for (const v of vendors) {
      const row = map.get(v) ?? {
        incident_count: 0,
        recent_count_30d: 0,
        exposure_score: 0,
        risk_domains: new Set<string>(),
        latest_report_id: '',
        latest_reported_date: '',
      };
      row.incident_count++;
      if (isRecent) row.recent_count_30d++;
      row.exposure_score += w;
      for (const r of e.risk_domains) row.risk_domains.add(r);
      if (e.reported_date && e.reported_date > row.latest_reported_date) {
        row.latest_reported_date = e.reported_date;
        row.latest_report_id = e.report_id;
      }
      map.set(v, row);
    }
  }
  return Array.from(map.entries())
    .map(([vendor, r]) => ({
      vendor,
      role,
      incident_count: r.incident_count,
      recent_count_30d: r.recent_count_30d,
      exposure_score: Math.round(r.exposure_score * 100) / 100,
      risk_domains: Array.from(r.risk_domains).sort(),
      latest_report_id: r.latest_report_id,
      latest_reported_date: r.latest_reported_date,
    }))
    .sort((a, b) => {
      if (b.exposure_score !== a.exposure_score) return b.exposure_score - a.exposure_score;
      if (b.incident_count !== a.incident_count) return b.incident_count - a.incident_count;
      return a.vendor.localeCompare(b.vendor);
    });
}

function buildRiskDomainRows(entries: AvidEntry[], now: Date): RiskDomainRow[] {
  const map = new Map<string, { incident_count: number; recent_count_30d: number }>();
  for (const e of entries) {
    const days = daysAgo(e.reported_date, now);
    const isRecent = days !== null && days <= 30;
    for (const r of e.risk_domains) {
      const row = map.get(r) ?? { incident_count: 0, recent_count_30d: 0 };
      row.incident_count++;
      if (isRecent) row.recent_count_30d++;
      map.set(r, row);
    }
  }
  return Array.from(map.entries())
    .map(([risk_domain, r]) => ({ risk_domain, incident_count: r.incident_count, recent_count_30d: r.recent_count_30d }))
    .sort((a, b) => b.incident_count - a.incident_count || a.risk_domain.localeCompare(b.risk_domain));
}

function buildSepViewRows(entries: AvidEntry[]): SepViewRow[] {
  const map = new Map<string, number>();
  for (const e of entries) {
    for (const s of e.sep_view) {
      map.set(s, (map.get(s) ?? 0) + 1);
    }
  }
  return Array.from(map.entries())
    .map(([sep_view, c]) => ({ sep_view, incident_count: c }))
    .sort((a, b) => b.incident_count - a.incident_count || a.sep_view.localeCompare(b.sep_view));
}

function buildArtifactRows(entries: AvidEntry[]): ArtifactRow[] {
  const map = new Map<string, { type: string; incident_count: number; developers: Set<string> }>();
  for (const e of entries) {
    for (const a of e.artifacts) {
      const key = a.name;
      const row = map.get(key) ?? { type: a.type, incident_count: 0, developers: new Set<string>() };
      row.incident_count++;
      for (const d of e.developers) row.developers.add(d);
      map.set(key, row);
    }
  }
  return Array.from(map.entries())
    .map(([name, r]) => ({ name, type: r.type, incident_count: r.incident_count, developers: Array.from(r.developers).sort() }))
    .sort((a, b) => b.incident_count - a.incident_count || a.name.localeCompare(b.name))
    .slice(0, 25);
}

export function buildExposure(
  snapshot: AvidSnapshot,
  filter: ExposureFilter,
  now: Date,
): ExposureResponse {
  const { entries, cutoff_date } = filterEntries(snapshot, filter, now);
  return {
    ok: true,
    capturedAt: now.toISOString(),
    snapshot_captured_at: snapshot.capturedAt,
    source: 'avidml/avid-db',
    source_license: 'MIT',
    filter: { vendor: filter.vendor, risk_domain: filter.risk_domain, within_days: filter.within_days },
    window: { window_days: filter.within_days, cutoff_date },
    entries_count: entries.length,
    developers: buildVendorRows(entries, 'developer', now),
    deployers: buildVendorRows(entries, 'deployer', now),
    risk_domains: buildRiskDomainRows(entries, now),
    sep_view: buildSepViewRows(entries),
    top_artifacts: buildArtifactRows(entries),
    attribution: {
      source: 'AVID (AI Vulnerability Database) - avidml/avid-db',
      license: 'MIT (data + schema). Redistribution permitted with attribution.',
      notes: 'TensorFeed snapshots ~50 most-recent reports daily and computes vendor exposure rollups + recency-weighted scores. AIID coverage (CC-BY) is queued via the 100MB weekly R2 snapshot path; their GraphQL is origin-gated and not Worker-accessible.',
    },
  };
}
