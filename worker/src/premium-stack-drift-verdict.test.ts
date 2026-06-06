import { describe, it, expect } from 'vitest';
import {
  buildStackDriftVerdict,
  parseList,
  parseSinceDays,
  normalizeKey,
  type StackDriftInput,
  type StackDriftSources,
} from './premium-stack-drift-verdict';
import type { SubstrateEvent, SubstrateEventType } from './substrate-changelog/types';
import type { TimelineEntry } from './premium-model-deprecations';
import type { PackageReleasesSnapshot, PackageReleaseRecord } from './ai-package-releases-fetcher';

const NOW = new Date('2026-06-06T12:00:00Z');

function ev(type: SubstrateEventType, subject: string, over: Partial<SubstrateEvent> = {}): SubstrateEvent {
  return { id: `ev-${subject}-${type}`, type, at: '2026-06-01', subject, provider: null, detail: 'changed', version: null, source_url: null, ...over };
}

function dep(model: string, status: TimelineEntry['status'], urgency: TimelineEntry['urgency_band'], over: Partial<TimelineEntry> = {}): TimelineEntry {
  return {
    id: `dep-${model}`,
    provider: 'Anthropic',
    model,
    status,
    sourceUrl: 'https://example.com/deprecation',
    days_until_deprecation: null,
    days_until_sunset: null,
    days_since_sunset: null,
    urgency_band: urgency,
    migration_chain: [],
    ...over,
  };
}

function relRec(pkg: string, latest: string, prev: string, daysAgo: number): PackageReleaseRecord {
  const latestPub = new Date(NOW.getTime() - daysAgo * 86400000).toISOString();
  return {
    package: pkg,
    ecosystem: 'PyPI',
    category: '',
    description: '',
    homepage: null,
    latest_version: latest,
    latest_published_at: latestPub,
    versions_recent: [
      { version: latest, published_at: latestPub },
      { version: prev, published_at: new Date(NOW.getTime() - (daysAgo + 30) * 86400000).toISOString() },
    ],
    versions_known_total: 5,
    fetched_at: NOW.toISOString(),
  };
}

function relSnap(records: PackageReleaseRecord[]): PackageReleasesSnapshot {
  return {
    capturedAt: NOW.toISOString(),
    source: 'pypi.org + registry.npmjs.org',
    source_license: 'PyPI and npm registry JSON endpoints are public; package metadata is editorial-redistributable. Per-package licenses vary.',
    package_count: records.length,
    records,
  };
}

const EMPTY_SOURCES: StackDriftSources = { changelog: [], deprecations: [], releases: null, knownModelKeys: new Set() };

function input(over: Partial<StackDriftInput> = {}): StackDriftInput {
  return { models: [], packages: [], protocols: [], since_days: 14, from: '2026-05-23', to: '2026-06-06', ...over };
}

describe('parseList / parseSinceDays', () => {
  it('parses and dedupes a comma list', () => {
    expect(parseList('gpt-4o, claude ,gpt-4o')).toEqual(['gpt-4o', 'claude']);
  });
  it('clamps since_days to [1,365] with default 14', () => {
    expect(parseSinceDays(null)).toBe(14);
    expect(parseSinceDays('0')).toBe(1);
    expect(parseSinceDays('9999')).toBe(365);
    expect(parseSinceDays('30')).toBe(30);
  });
});

describe('/api/premium/stack-drift-verdict', () => {
  it('rules ACTION_NEEDED on a sunsetted model in the stack', () => {
    const sources: StackDriftSources = {
      ...EMPTY_SOURCES,
      deprecations: [dep('claude-3-opus', 'sunsetted', 'past', { modelDisplay: 'Claude 3 Opus', sunsetDate: '2026-06-01', days_until_sunset: -5, replacement: 'claude-opus-4-8' })],
    };
    const r = buildStackDriftVerdict(input({ models: ['claude-3-opus'] }), sources, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verdict).toBe('ACTION_NEEDED');
    expect(r.findings[0].break_risk).toBe('high');
    expect(r.findings[0].signal).toBe('sunsetted');
  });

  it('rules WATCH on a breaking package release inside the window', () => {
    const sources: StackDriftSources = { ...EMPTY_SOURCES, releases: relSnap([relRec('langchain', '2.0.0', '1.9.0', 5)]) };
    const r = buildStackDriftVerdict(input({ packages: ['langchain'] }), sources, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verdict).toBe('WATCH');
    expect(r.findings[0].signal).toBe('breaking_release');
  });

  it('rules WATCH on a protocol spec bump', () => {
    const sources: StackDriftSources = { ...EMPTY_SOURCES, changelog: [ev('spec_version', 'mcp', { version: '2026-06-01', detail: 'spec bumped' })] };
    const r = buildStackDriftVerdict(input({ protocols: ['mcp'] }), sources, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verdict).toBe('WATCH');
    expect(r.findings[0].signal).toBe('spec_bump');
  });

  it('rules STABLE for a recognized current model with no drift', () => {
    const sources: StackDriftSources = { ...EMPTY_SOURCES, knownModelKeys: new Set([normalizeKey('gpt-5')]) };
    const r = buildStackDriftVerdict(input({ models: ['gpt-5'] }), sources, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.verdict).toBe('STABLE');
    expect(r.findings).toEqual([]);
    expect(r.counts.assessed).toBe(1);
  });

  it('no-charges (no_recognized_stack) when nothing is tracked', () => {
    const r = buildStackDriftVerdict(input({ models: ['totally-unknown-model'] }), EMPTY_SOURCES, NOW);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error).toBe('no_recognized_stack');
    expect(r.unmatched.models).toEqual(['totally-unknown-model']);
  });

  it('reports unmatched items but still rules when at least one resolves', () => {
    const sources: StackDriftSources = { ...EMPTY_SOURCES, knownModelKeys: new Set([normalizeKey('gpt-5')]) };
    const r = buildStackDriftVerdict(input({ models: ['gpt-5', 'bogus'] }), sources, NOW);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.unmatched.models).toEqual(['bogus']);
    expect(r.counts.assessed).toBe(1);
  });

  it('emits no em dashes or double hyphens in any output string', () => {
    const emDash = String.fromCharCode(0x2014);
    const doubleHyphen = '-' + '-';
    const sources: StackDriftSources = {
      ...EMPTY_SOURCES,
      deprecations: [dep('claude-3-opus', 'sunsetted', 'past', { modelDisplay: 'Claude 3 Opus', sunsetDate: '2026-06-01', days_until_sunset: -5, replacement: 'claude-opus-4-8' })],
    };
    const ok = buildStackDriftVerdict(input({ models: ['claude-3-opus'] }), sources, NOW);
    const empty = buildStackDriftVerdict(input({ models: ['nope'] }), EMPTY_SOURCES, NOW);
    for (const json of [JSON.stringify(ok), JSON.stringify(empty)]) {
      expect(json.includes(emDash)).toBe(false);
      expect(json.includes(doubleHyphen)).toBe(false);
    }
  });
});
