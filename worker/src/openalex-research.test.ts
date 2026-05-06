/**
 * Pure-logic tests for the OpenAlex AI institutions module.
 *
 * Network fetchers (fetchInstitutionAggregate, fetchInstitutionDetails)
 * are not exercised here. The snapshot builder, read API filters, and
 * attribution wiring are.
 */

import { describe, it, expect } from 'vitest';
import {
  buildSnapshot,
  readAIInstitutions,
  OPENALEX_ATTRIBUTION,
  AIInstitutionsSnapshot,
} from './openalex-research';
import type { Env } from './types';

function makeKV(initial: Record<string, unknown>) {
  const store = new Map<string, unknown>(Object.entries(initial));
  return {
    get: async (key: string) => store.get(key) ?? null,
    put: async () => undefined,
    delete: async () => undefined,
    list: async () => ({ keys: [] }),
  };
}

function makeEnv(initial: Record<string, unknown> = {}): Env {
  const cache = makeKV(initial);
  return {
    TENSORFEED_NEWS: makeKV({}) as unknown as KVNamespace,
    TENSORFEED_STATUS: makeKV({}) as unknown as KVNamespace,
    TENSORFEED_CACHE: cache as unknown as KVNamespace,
    ENVIRONMENT: 'test',
    SITE_URL: 'https://tensorfeed.ai',
    INDEXNOW_KEY: '',
    X_API_KEY: '',
    X_API_SECRET: '',
    X_ACCESS_TOKEN: '',
    X_ACCESS_SECRET: '',
    GITHUB_TOKEN: '',
    RESEND_API_KEY: '',
    ALERT_EMAIL_TO: '',
    ALERT_EMAIL_FROM: '',
    PAYMENT_WALLET: '0x0',
    PAYMENT_ENABLED: 'true',
  };
}

// ── buildSnapshot ───────────────────────────────────────────────────

describe('buildSnapshot', () => {
  it('joins aggregates with institution details and ranks by count', () => {
    const aggregates = [
      { openalex_id: 'I27837315', ai_works_last_year: 5000 }, // MIT
      { openalex_id: 'I97018004', ai_works_last_year: 4500 }, // Stanford
      { openalex_id: 'I123', ai_works_last_year: 3000 },
    ];
    const details = new Map<string, { id?: string; display_name?: string; country_code?: string; type?: string; works_count?: number }>([
      ['I27837315', { display_name: 'Massachusetts Institute of Technology', country_code: 'US', type: 'education', works_count: 250000 }],
      ['I97018004', { display_name: 'Stanford University', country_code: 'US', type: 'education', works_count: 220000 }],
      ['I123', { display_name: 'Tsinghua University', country_code: 'CN', type: 'education', works_count: 150000 }],
    ]);
    const snap = buildSnapshot(aggregates, details);

    expect(snap.institutions).toHaveLength(3);
    expect(snap.institutions[0].rank).toBe(1);
    expect(snap.institutions[0].display_name).toBe('Massachusetts Institute of Technology');
    expect(snap.institutions[0].ai_works_last_year).toBe(5000);
    expect(snap.institutions[2].country_code).toBe('CN');
  });

  it('drops institutions missing from details and notes the count', () => {
    const aggregates = [
      { openalex_id: 'I1', ai_works_last_year: 100 },
      { openalex_id: 'I2', ai_works_last_year: 50 },
    ];
    const details = new Map([
      ['I1', { display_name: 'Known U', country_code: 'US', type: 'education', works_count: 1000 }],
    ]);
    const snap = buildSnapshot(aggregates, details);
    expect(snap.institutions).toHaveLength(1);
    expect(snap.notes.some(n => n.includes('1 institution'))).toBe(true);
  });

  it('handles empty input gracefully', () => {
    const snap = buildSnapshot([], new Map());
    expect(snap.institutions).toEqual([]);
    expect(snap.notes).toEqual([]);
  });

  it('always populates the concept block', () => {
    const snap = buildSnapshot([], new Map());
    expect(snap.concept.id).toBe('C154945302');
    expect(snap.concept.name).toBe('Artificial intelligence');
  });
});

// ── readAIInstitutions ──────────────────────────────────────────────

const SAMPLE_SNAPSHOT: AIInstitutionsSnapshot = {
  capturedAt: '2026-05-06T03:30:00Z',
  window_days: 365,
  concept: { id: 'C154945302', name: 'Artificial intelligence' },
  institutions: [
    { rank: 1, openalex_id: 'I27837315', display_name: 'MIT', country_code: 'US', type: 'education', ai_works_last_year: 5000, total_works_count: 250000 },
    { rank: 2, openalex_id: 'I97018004', display_name: 'Stanford', country_code: 'US', type: 'education', ai_works_last_year: 4500, total_works_count: 220000 },
    { rank: 3, openalex_id: 'I123', display_name: 'Tsinghua', country_code: 'CN', type: 'education', ai_works_last_year: 3000, total_works_count: 150000 },
    { rank: 4, openalex_id: 'I999', display_name: 'Google Research', country_code: 'US', type: 'company', ai_works_last_year: 2500, total_works_count: 50000 },
  ],
  notes: [],
};

describe('readAIInstitutions', () => {
  it('returns null when no snapshot exists', async () => {
    const env = makeEnv({});
    const r = await readAIInstitutions(env);
    expect(r).toBeNull();
  });

  it('returns the full snapshot when no filters', async () => {
    const env = makeEnv({ 'openalex-ai-institutions:current': SAMPLE_SNAPSHOT });
    const r = await readAIInstitutions(env);
    expect(r?.count).toBe(4);
    expect(r?.institutions[0].display_name).toBe('MIT');
  });

  it('filters by country (case-insensitive)', async () => {
    const env = makeEnv({ 'openalex-ai-institutions:current': SAMPLE_SNAPSHOT });
    const r = await readAIInstitutions(env, { country: 'us' });
    expect(r?.count).toBe(3);
    expect(r?.institutions.every(i => i.country_code === 'US')).toBe(true);
  });

  it('filters by type', async () => {
    const env = makeEnv({ 'openalex-ai-institutions:current': SAMPLE_SNAPSHOT });
    const r = await readAIInstitutions(env, { type: 'company' });
    expect(r?.count).toBe(1);
    expect(r?.institutions[0].display_name).toBe('Google Research');
  });

  it('combines country + type filters', async () => {
    const env = makeEnv({ 'openalex-ai-institutions:current': SAMPLE_SNAPSHOT });
    const r = await readAIInstitutions(env, { country: 'US', type: 'education' });
    expect(r?.count).toBe(2);
  });

  it('respects limit', async () => {
    const env = makeEnv({ 'openalex-ai-institutions:current': SAMPLE_SNAPSHOT });
    const r = await readAIInstitutions(env, { limit: 2 });
    expect(r?.count).toBe(2);
    expect(r?.institutions).toHaveLength(2);
  });

  it('attaches attribution and license info', async () => {
    const env = makeEnv({ 'openalex-ai-institutions:current': SAMPLE_SNAPSHOT });
    const r = await readAIInstitutions(env);
    expect(r?.attribution).toEqual(OPENALEX_ATTRIBUTION);
    expect(r?.attribution.license).toContain('CC0');
  });
});
