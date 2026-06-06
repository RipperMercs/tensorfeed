/**
 * Premium stack-drift verdict.
 *
 * Scoped to a caller's declared AI stack (models, packages, agent protocols),
 * this answers "what moved under me in the last N days that could break me,"
 * fusing three TensorFeed sources:
 *   1. The substrate changelog (model lifecycle events, protocol spec-version
 *      bumps, framework releases).
 *   2. The model-deprecation registry (sunset dates, urgency, replacements).
 *   3. The package-release snapshot (breaking major bumps).
 *
 * It returns a STABLE / WATCH / ACTION_NEEDED ruling with per-item findings
 * classified by break-risk. Distinct from /api/premium/substrate-changelog/
 * history (the raw forward log): this is filtered to YOUR stack and graded.
 *
 * Coverage honesty: a stack item TensorFeed cannot recognize in any source is
 * reported under unmatched, and if NOTHING resolves the call is no-charge. A
 * STABLE result for recognized items is a real, charged answer (the agent paid
 * to learn nothing broke). Models are recognized via the pricing catalog, so a
 * healthy current model reads as STABLE rather than unknown.
 */

import type { SubstrateEvent } from './substrate-changelog/types';
import type { TimelineEntry } from './premium-model-deprecations';
import type { PackageReleasesSnapshot } from './ai-package-releases-fetcher';
import { buildVelocityRow } from './premium-package-releases-velocity';

export type BreakRisk = 'high' | 'medium' | 'low' | 'info';
export type StackDriftKind = 'STABLE' | 'WATCH' | 'ACTION_NEEDED';

const RISK_ORDER: Record<BreakRisk, number> = { high: 0, medium: 1, low: 2, info: 3 };
const KNOWN_PROTOCOLS = ['mcp', 'x402', 'a2a'];

export function normalizeKey(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function parseList(raw: string | null, max = 50): string[] {
  if (!raw) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const part of raw.split(',')) {
    const t = part.trim();
    if (!t) continue;
    const k = normalizeKey(t);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
    if (out.length >= max) break;
  }
  return out;
}

export function parseSinceDays(raw: string | null): number {
  const n = parseInt(raw ?? '', 10);
  if (!Number.isFinite(n)) return 14;
  if (n < 1) return 1;
  if (n > 365) return 365;
  return n;
}

export interface DriftFinding {
  kind: 'model' | 'package' | 'protocol';
  subject: string;
  resolved: string;
  signal: 'deprecated' | 'sunsetted' | 'removed' | 'repriced' | 'breaking_release' | 'spec_bump';
  break_risk: BreakRisk;
  detail: string;
  recommended_action: string;
  source_url: string | null;
  at: string | null;
}

export interface StackDriftInput {
  models: string[];
  packages: string[];
  protocols: string[];
  since_days: number;
  from: string;
  to: string;
}

export interface StackDriftSources {
  changelog: SubstrateEvent[];
  deprecations: TimelineEntry[];
  releases: PackageReleasesSnapshot | null;
  knownModelKeys: Set<string>;
}

export interface StackDriftResult {
  ok: true;
  verdict_kind: 'stack_drift';
  verdict: StackDriftKind;
  window: { since_days: number; from: string; to: string };
  stack: { models: string[]; packages: string[]; protocols: string[] };
  findings: DriftFinding[];
  counts: { high: number; medium: number; low: number; info: number; total: number; assessed: number };
  unmatched: { models: string[]; packages: string[]; protocols: string[] };
  recommendation: string;
  package_snapshot_at: string | null;
  sources: Array<{ name: string; url: string; license: string }>;
  notes: string[];
}

export interface StackDriftEmpty {
  ok: false;
  error: 'no_recognized_stack';
  hint: string;
  unmatched: { models: string[]; packages: string[]; protocols: string[] };
}

const SOURCES = [
  { name: 'TensorFeed substrate changelog', url: 'https://tensorfeed.ai/api/substrate-changelog', license: 'TensorFeed editorial log over public provider and spec announcements.' },
  { name: 'TensorFeed model-deprecation registry', url: 'https://tensorfeed.ai/api/model-deprecations', license: 'TensorFeed editorial registry over public provider deprecation notices.' },
  { name: 'TensorFeed package-release snapshot', url: 'https://tensorfeed.ai/api/packages/releases', license: 'Public PyPI and npm registry metadata.' },
];

function subjectModelKey(subject: string): string {
  const last = subject.split('/').pop() ?? subject;
  return normalizeKey(last);
}

function depRisk(entry: TimelineEntry): BreakRisk {
  if (entry.status === 'sunsetted' || entry.urgency_band === 'past' || entry.urgency_band === 'within_7d') return 'high';
  if (entry.status === 'deprecated' || entry.urgency_band === 'within_30d' || entry.urgency_band === 'within_60d') return 'medium';
  return 'low';
}

export function buildStackDriftVerdict(
  input: StackDriftInput,
  sources: StackDriftSources,
  _now: Date,
): StackDriftResult | StackDriftEmpty {
  const findings: DriftFinding[] = [];
  const unmatched = { models: [] as string[], packages: [] as string[], protocols: [] as string[] };
  let assessed = 0;

  // ── Models ───────────────────────────────────────────────────────
  for (const model of input.models) {
    const key = normalizeKey(model);
    const dep = sources.deprecations.find(
      (e) => normalizeKey(e.model) === key || (e.modelDisplay ? normalizeKey(e.modelDisplay) === key : false) || normalizeKey(e.id) === key,
    );
    const clEvents = sources.changelog.filter(
      (e) =>
        (e.type === 'model_deprecated' || e.type === 'model_removed' || e.type === 'model_repriced') &&
        (subjectModelKey(e.subject) === key || normalizeKey(e.subject) === key),
    );
    const recognized = !!dep || clEvents.length > 0 || sources.knownModelKeys.has(key);
    if (!recognized) {
      unmatched.models.push(model);
      continue;
    }
    assessed++;

    if (dep) {
      const display = dep.modelDisplay ?? dep.model;
      const action = dep.replacement
        ? `Migrate to ${dep.replacement}.`
        : dep.migration_chain.length > 0
          ? `Migrate via ${dep.migration_chain.join(' to ')}.`
          : 'Plan a migration before the sunset date.';
      findings.push({
        kind: 'model',
        subject: model,
        resolved: display,
        signal: dep.status === 'sunsetted' ? 'sunsetted' : 'deprecated',
        break_risk: depRisk(dep),
        detail: `${display} is ${dep.status}${dep.sunsetDate ? `, sunset ${dep.sunsetDate}` : ''}${dep.days_until_sunset != null ? ` (${dep.days_until_sunset} days)` : ''}.`,
        recommended_action: action,
        source_url: dep.sourceUrl ?? null,
        at: dep.sunsetDate ?? dep.deprecationDate ?? null,
      });
    }
    for (const ev of clEvents) {
      if (ev.type === 'model_removed') {
        findings.push({
          kind: 'model',
          subject: model,
          resolved: ev.subject,
          signal: 'removed',
          break_risk: 'high',
          detail: `${ev.subject} was removed: ${ev.detail}`,
          recommended_action: 'Switch to a supported model immediately.',
          source_url: ev.source_url,
          at: ev.at,
        });
      } else if (ev.type === 'model_repriced') {
        findings.push({
          kind: 'model',
          subject: model,
          resolved: ev.subject,
          signal: 'repriced',
          break_risk: 'info',
          detail: `${ev.subject} was repriced: ${ev.detail}`,
          recommended_action: 'Re-check your cost projection; this is a cost change, not a break.',
          source_url: ev.source_url,
          at: ev.at,
        });
      } else if (ev.type === 'model_deprecated' && !dep) {
        findings.push({
          kind: 'model',
          subject: model,
          resolved: ev.subject,
          signal: 'deprecated',
          break_risk: 'medium',
          detail: `${ev.subject} was marked deprecated: ${ev.detail}`,
          recommended_action: 'Plan a migration.',
          source_url: ev.source_url,
          at: ev.at,
        });
      }
    }
  }

  // ── Packages ─────────────────────────────────────────────────────
  for (const pkg of input.packages) {
    const key = normalizeKey(pkg);
    const rec = sources.releases?.records.find((r) => normalizeKey(r.package) === key);
    if (!rec) {
      unmatched.packages.push(pkg);
      continue;
    }
    assessed++;
    const row = buildVelocityRow(rec, _now);
    if (row.latest_bump_kind === 'major' && row.days_since_latest != null && row.days_since_latest <= input.since_days) {
      findings.push({
        kind: 'package',
        subject: pkg,
        resolved: rec.package,
        signal: 'breaking_release',
        break_risk: 'medium',
        detail: `${rec.package} shipped ${row.latest_version} (major bump${row.previous_version ? ` from ${row.previous_version}` : ''}) ${row.days_since_latest} days ago.`,
        recommended_action: 'Pin your current version and test before upgrading.',
        source_url: rec.homepage,
        at: rec.latest_published_at,
      });
    }
  }

  // ── Protocols ────────────────────────────────────────────────────
  const knownProtocols = new Set<string>(KNOWN_PROTOCOLS);
  for (const e of sources.changelog) {
    if (e.type === 'spec_version') knownProtocols.add(normalizeKey(e.subject));
  }
  for (const proto of input.protocols) {
    const key = normalizeKey(proto);
    if (!knownProtocols.has(key)) {
      unmatched.protocols.push(proto);
      continue;
    }
    assessed++;
    const specEvents = sources.changelog.filter((e) => e.type === 'spec_version' && normalizeKey(e.subject) === key);
    for (const ev of specEvents) {
      findings.push({
        kind: 'protocol',
        subject: proto,
        resolved: ev.subject,
        signal: 'spec_bump',
        break_risk: 'medium',
        detail: `${ev.subject} spec moved to ${ev.version ?? 'a new version'} on ${ev.at}: ${ev.detail}`,
        recommended_action: 'Check your client against the new spec version.',
        source_url: ev.source_url,
        at: ev.at,
      });
    }
  }

  if (assessed === 0) {
    return {
      ok: false,
      error: 'no_recognized_stack',
      hint: 'None of the models, packages, or protocols you listed are tracked by TensorFeed. Models are matched against the pricing catalog and deprecation registry, packages against the AI/ML release snapshot, protocols against the known set (mcp, x402, a2a).',
      unmatched,
    };
  }

  findings.sort((a, b) => RISK_ORDER[a.break_risk] - RISK_ORDER[b.break_risk]);

  const counts = {
    high: findings.filter((f) => f.break_risk === 'high').length,
    medium: findings.filter((f) => f.break_risk === 'medium').length,
    low: findings.filter((f) => f.break_risk === 'low').length,
    info: findings.filter((f) => f.break_risk === 'info').length,
    total: findings.length,
    assessed,
  };

  let verdict: StackDriftKind = 'STABLE';
  if (counts.medium > 0 || counts.low > 0) verdict = 'WATCH';
  if (counts.high > 0) verdict = 'ACTION_NEEDED';

  let recommendation: string;
  if (verdict === 'ACTION_NEEDED') {
    recommendation = `${counts.high} high-risk change(s) under your stack in the last ${input.since_days} days. Act now: ${findings[0].detail}`;
  } else if (verdict === 'WATCH') {
    const first = findings.find((f) => f.break_risk === 'medium') ?? findings[0];
    recommendation = `${counts.medium + counts.low} change(s) to review in the last ${input.since_days} days. ${first.detail}`;
  } else {
    recommendation = `No breaking drift detected across your ${assessed} assessed stack item(s) in the last ${input.since_days} days. Re-check before a high-stakes change.`;
  }

  return {
    ok: true,
    verdict_kind: 'stack_drift',
    verdict,
    window: { since_days: input.since_days, from: input.from, to: input.to },
    stack: { models: input.models, packages: input.packages, protocols: input.protocols },
    findings,
    counts,
    unmatched,
    recommendation,
    package_snapshot_at: sources.releases?.capturedAt ?? null,
    sources: SOURCES,
    notes: [
      'Findings are scoped to the stack you declared. A breaking package release flags that a major version shipped; it only breaks you if you upgrade.',
      'Model and protocol drift come from curated editorial sources; package drift reflects the latest release snapshot (package_snapshot_at).',
    ],
  };
}
