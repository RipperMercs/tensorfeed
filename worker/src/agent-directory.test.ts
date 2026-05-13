import { describe, it, expect } from 'vitest';
import {
  aggregateServiceAreaDistribution,
  aggregateSkillDistribution,
  composeDirectoryEntry,
  compareDirectoryEntries,
  isVerifiedHireable,
  matchesFilters,
  searchDirectory,
  type DirectorySearchEntry,
} from './agent-directory';
import { CLAIM_KEY_PREFIX, WALLET_KEY_PREFIX, type OperatorClaim } from './agent-reputation-store';
import type { ReputationCard } from './agent-reputation';

const NOW = Date.parse('2026-05-13T20:00:00.000Z');

function claim(overrides: Partial<OperatorClaim> = {}): OperatorClaim {
  return {
    wallet: '0x0000000000000000000000000000000000000001',
    display_name: 'Agent X',
    operator_url: null,
    contact: null,
    signature: '0xsig',
    message: 'msg',
    timestamp: '2026-05-13T19:00:00.000Z',
    nonce: 'n1',
    verified: true,
    ofac_clean: true,
    claimed_at: '2026-05-13T19:00:00.000Z',
    available_for_hire: false,
    hourly_rate_min_usd: null,
    hourly_rate_max_usd: null,
    expanded_description: null,
    skills_tags: [],
    service_areas: [],
    languages: [],
    years_experience: null,
    verified_hireable_until: null,
    ...overrides,
  };
}

function card(overrides: Partial<ReputationCard> = {}): ReputationCard {
  return {
    ok: true,
    wallet: '0x0000000000000000000000000000000000000001',
    token_prefix: null,
    display_name: 'Agent X',
    operator_url: null,
    verified: true,
    ofac_clean: true,
    banned: false,
    ban_reason: null,
    trust_grade: 'B',
    flags: [],
    first_seen: '2026-04-01T00:00:00Z',
    last_active: '2026-05-13T00:00:00Z',
    wallet_age_days: 42,
    metrics: {} as any,
    ranks: {
      reliability: { rank: 5, total: 10, pct: 50 },
      spend: { rank: 5, total: 10, pct: 50 },
      activity: { rank: 5, total: 10, pct: 50 },
      streak: { rank: 5, total: 10, pct: 50 },
      composite: { rank: 5, total: 10, pct: 50 },
    },
    attribution: {} as any,
    ...overrides,
  };
}

// === matchesFilters ===

describe('matchesFilters', () => {
  it('matches when no filters are supplied', () => {
    expect(matchesFilters(claim(), {}, NOW)).toBe(true);
  });

  it('filters by skill (AND semantics)', () => {
    const c = claim({ skills_tags: ['research', 'coding'] });
    expect(matchesFilters(c, { skill: 'research' }, NOW)).toBe(true);
    expect(matchesFilters(c, { skill: 'voice-acting' }, NOW)).toBe(false);
  });

  it('filters by service_area', () => {
    const c = claim({ service_areas: ['research'] });
    expect(matchesFilters(c, { service_area: 'research' }, NOW)).toBe(true);
    expect(matchesFilters(c, { service_area: 'voice' }, NOW)).toBe(false);
  });

  it('filters by language', () => {
    const c = claim({ languages: ['en', 'ja'] });
    expect(matchesFilters(c, { language: 'en' }, NOW)).toBe(true);
    expect(matchesFilters(c, { language: 'fr' }, NOW)).toBe(false);
  });

  it('filters available=true', () => {
    expect(matchesFilters(claim({ available_for_hire: true }), { available: true }, NOW)).toBe(true);
    expect(matchesFilters(claim({ available_for_hire: false }), { available: true }, NOW)).toBe(false);
    expect(matchesFilters(claim({ available_for_hire: null }), { available: true }, NOW)).toBe(false);
  });

  it('filters max_rate', () => {
    const c = claim({ hourly_rate_max_usd: 100 });
    expect(matchesFilters(c, { max_rate: 200 }, NOW)).toBe(true);
    expect(matchesFilters(c, { max_rate: 50 }, NOW)).toBe(false);
  });

  it('treats null max_rate as "no upper bound" (matches max_rate filter)', () => {
    const c = claim({ hourly_rate_max_usd: null });
    expect(matchesFilters(c, { max_rate: 50 }, NOW)).toBe(true);
  });

  it('filters min_experience', () => {
    expect(matchesFilters(claim({ years_experience: 5 }), { min_experience: 3 }, NOW)).toBe(true);
    expect(matchesFilters(claim({ years_experience: 2 }), { min_experience: 3 }, NOW)).toBe(false);
    expect(matchesFilters(claim({ years_experience: null }), { min_experience: 3 }, NOW)).toBe(false);
  });

  it('filters verified=true (uses verified_hireable_until > now)', () => {
    const future = '2026-06-01T00:00:00.000Z';
    const past = '2026-04-01T00:00:00.000Z';
    expect(
      matchesFilters(claim({ verified_hireable_until: future }), { verified: true }, NOW),
    ).toBe(true);
    expect(
      matchesFilters(claim({ verified_hireable_until: past }), { verified: true }, NOW),
    ).toBe(false);
    expect(
      matchesFilters(claim({ verified_hireable_until: null }), { verified: true }, NOW),
    ).toBe(false);
  });

  it('combines filters with AND', () => {
    const c = claim({
      skills_tags: ['research'],
      available_for_hire: true,
      hourly_rate_max_usd: 100,
    });
    expect(matchesFilters(c, { skill: 'research', available: true, max_rate: 200 }, NOW)).toBe(true);
    expect(matchesFilters(c, { skill: 'research', available: true, max_rate: 50 }, NOW)).toBe(false);
    expect(matchesFilters(c, { skill: 'coding', available: true }, NOW)).toBe(false);
  });
});

// === isVerifiedHireable ===

describe('isVerifiedHireable', () => {
  it('true when verified_hireable_until is in the future', () => {
    expect(isVerifiedHireable(claim({ verified_hireable_until: '2026-06-01T00:00:00.000Z' }), NOW)).toBe(true);
  });
  it('false when verified_hireable_until is in the past', () => {
    expect(isVerifiedHireable(claim({ verified_hireable_until: '2026-04-01T00:00:00.000Z' }), NOW)).toBe(false);
  });
  it('false when verified_hireable_until is missing', () => {
    expect(isVerifiedHireable(claim({}), NOW)).toBe(false);
  });
  it('false when verified_hireable_until is unparseable', () => {
    expect(isVerifiedHireable(claim({ verified_hireable_until: 'garbage' }), NOW)).toBe(false);
  });
});

// === composeDirectoryEntry ===

describe('composeDirectoryEntry', () => {
  it('joins claim fields with reputation card fields', () => {
    const e = composeDirectoryEntry(
      claim({
        wallet: '0xabc',
        skills_tags: ['coding'],
        available_for_hire: true,
        hourly_rate_min_usd: 50,
        hourly_rate_max_usd: 200,
      }),
      card({ trust_grade: 'A', ranks: { reliability: { rank: 1, total: 10, pct: 100 }, spend: { rank: 1, total: 10, pct: 100 }, activity: { rank: 1, total: 10, pct: 100 }, streak: { rank: 1, total: 10, pct: 100 }, composite: { rank: 1, total: 10, pct: 100 } } }),
      NOW,
    );
    expect(e.wallet).toBe('0xabc');
    expect(e.skills_tags).toEqual(['coding']);
    expect(e.hourly_rate_min_usd).toBe(50);
    expect(e.composite_score).toBe(100);
    expect(e.composite_rank).toBe(1);
    expect(e.trust_grade).toBe('A');
  });

  it('handles missing reputation card (brand new operator)', () => {
    const e = composeDirectoryEntry(claim(), null, NOW);
    expect(e.composite_score).toBe(0);
    expect(e.composite_rank).toBeNull();
    expect(e.trust_grade).toBeNull();
  });

  it('reflects verified_hireable status from verified_hireable_until', () => {
    const future = '2026-06-01T00:00:00.000Z';
    const e = composeDirectoryEntry(claim({ verified_hireable_until: future }), card(), NOW);
    expect(e.verified_hireable).toBe(true);
    const e2 = composeDirectoryEntry(claim({ verified_hireable_until: null }), card(), NOW);
    expect(e2.verified_hireable).toBe(false);
  });
});

// === compareDirectoryEntries ===

describe('compareDirectoryEntries', () => {
  function entry(overrides: Partial<DirectorySearchEntry>): DirectorySearchEntry {
    return {
      wallet: '0xa',
      display_name: 'A',
      operator_url: null,
      verified: true,
      ofac_clean: true,
      available_for_hire: null,
      hourly_rate_min_usd: null,
      hourly_rate_max_usd: null,
      expanded_description: null,
      skills_tags: [],
      service_areas: [],
      languages: [],
      years_experience: null,
      verified_hireable: false,
      verified_hireable_until: null,
      composite_score: 50,
      composite_rank: 5,
      composite_pct: 50,
      trust_grade: 'C',
      claimed_at: '2026-05-13T19:00:00.000Z',
      ...overrides,
    };
  }

  it('composite_score desc is the primary sort (verified flag is ignored in v0)', () => {
    const a = entry({ verified_hireable: true, composite_score: 10 });
    const b = entry({ verified_hireable: false, composite_score: 90 });
    expect(compareDirectoryEntries(a, b)).toBeGreaterThan(0);
  });

  it('within tier, higher composite_score wins', () => {
    const a = entry({ composite_score: 90 });
    const b = entry({ composite_score: 50 });
    expect(compareDirectoryEntries(a, b)).toBeLessThan(0);
  });

  it('older claim wins on composite tie', () => {
    const a = entry({ claimed_at: '2026-04-01T00:00:00.000Z' });
    const b = entry({ claimed_at: '2026-05-13T19:00:00.000Z' });
    expect(compareDirectoryEntries(a, b)).toBeLessThan(0);
  });

  it('deterministic on full tie via wallet sort', () => {
    const a = entry({ wallet: '0xaaaa' });
    const b = entry({ wallet: '0xbbbb' });
    expect(compareDirectoryEntries(a, b)).toBeLessThan(0);
  });
});

// === searchDirectory + aggregations (mocked KV) ===

function makeKv(initial: Record<string, unknown> = {}) {
  const store = new Map<string, string>();
  for (const [k, v] of Object.entries(initial)) {
    store.set(k, typeof v === 'string' ? v : JSON.stringify(v));
  }
  return {
    store,
    async get(key: string, type?: 'json' | 'text') {
      const raw = store.get(key);
      if (raw === undefined) return null;
      if (type === 'json') return JSON.parse(raw);
      return raw;
    },
    async put(key: string, value: string) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
    async list({ prefix = '', cursor }: { prefix?: string; cursor?: string } = {}) {
      const all = Array.from(store.keys()).filter((k) => k.startsWith(prefix)).sort();
      const startIdx = cursor ? all.indexOf(cursor) + 1 : 0;
      const page = all.slice(startIdx, startIdx + 1000);
      const complete = startIdx + 1000 >= all.length;
      return {
        keys: page.map((name) => ({ name })),
        list_complete: complete,
        cursor: complete || page.length === 0 ? undefined : page[page.length - 1],
      };
    },
  };
}

function makeEnvWith(claims: OperatorClaim[], cards: Map<string, ReputationCard> = new Map()) {
  const initial: Record<string, unknown> = {};
  for (const c of claims) {
    initial[CLAIM_KEY_PREFIX + c.wallet.toLowerCase()] = c;
  }
  for (const [wallet, card] of cards.entries()) {
    initial[WALLET_KEY_PREFIX + wallet.toLowerCase()] = card;
  }
  const kv = makeKv(initial);
  return { TENSORFEED_CACHE: kv } as any;
}

describe('searchDirectory', () => {
  it('returns empty result on empty cohort', async () => {
    const env = makeEnvWith([]);
    const r = await searchDirectory(env, {}, 10, NOW);
    expect(r.total).toBe(0);
    expect(r.cohort_size).toBe(0);
    expect(r.results).toEqual([]);
  });

  it('returns all matching claims with cards joined', async () => {
    const claims: OperatorClaim[] = [
      claim({ wallet: '0xaaaa', display_name: 'Alpha', skills_tags: ['coding'] }),
      claim({ wallet: '0xbbbb', display_name: 'Beta', skills_tags: ['research'] }),
    ];
    const cards = new Map<string, ReputationCard>([
      ['0xaaaa', card({ wallet: '0xaaaa', trust_grade: 'A' })],
    ]);
    const env = makeEnvWith(claims, cards);
    const r = await searchDirectory(env, {}, 10, NOW);
    expect(r.cohort_size).toBe(2);
    expect(r.total).toBe(2);
    expect(r.results.length).toBe(2);
  });

  it('filters by skill', async () => {
    const claims: OperatorClaim[] = [
      claim({ wallet: '0xaaaa', skills_tags: ['coding'] }),
      claim({ wallet: '0xbbbb', skills_tags: ['research'] }),
    ];
    const env = makeEnvWith(claims);
    const r = await searchDirectory(env, { skill: 'coding' }, 10, NOW);
    expect(r.total).toBe(1);
    expect(r.results[0].wallet).toBe('0xaaaa');
  });

  it('sorts purely by composite_score desc (no verified-hireable tier in v0)', async () => {
    const future = '2026-06-01T00:00:00.000Z';
    const claims: OperatorClaim[] = [
      claim({ wallet: '0xaaaa', display_name: 'Alpha' }),
      claim({ wallet: '0xbbbb', display_name: 'Beta', verified_hireable_until: future }),
      claim({ wallet: '0xcccc', display_name: 'Gamma' }),
    ];
    const cards = new Map<string, ReputationCard>([
      ['0xaaaa', card({ wallet: '0xaaaa', ranks: { ...card().ranks, composite: { rank: 1, total: 3, pct: 100 } } })],
      ['0xcccc', card({ wallet: '0xcccc', ranks: { ...card().ranks, composite: { rank: 2, total: 3, pct: 50 } } })],
    ]);
    const env = makeEnvWith(claims, cards);
    const r = await searchDirectory(env, {}, 10, NOW);
    expect(r.results[0].wallet).toBe('0xaaaa'); // composite 100 wins
    expect(r.results[1].wallet).toBe('0xcccc'); // composite 50
    expect(r.results[2].wallet).toBe('0xbbbb'); // composite 0 even though verified
  });

  it('respects limit', async () => {
    const claims: OperatorClaim[] = Array.from({ length: 5 }, (_, i) =>
      claim({ wallet: '0x' + i.toString().padStart(40, '0') }),
    );
    const env = makeEnvWith(claims);
    const r = await searchDirectory(env, {}, 3, NOW);
    expect(r.total).toBe(5);
    expect(r.results.length).toBe(3);
  });

  it('skips malformed claim records', async () => {
    const kv = makeKv();
    kv.store.set(CLAIM_KEY_PREFIX + '0xaaaa', '{ broken json');
    kv.store.set(CLAIM_KEY_PREFIX + '0xbbbb', JSON.stringify(claim({ wallet: '0xbbbb' })));
    const env = { TENSORFEED_CACHE: kv } as any;
    const r = await searchDirectory(env, {}, 10, NOW);
    expect(r.cohort_size).toBe(1);
    expect(r.results[0].wallet).toBe('0xbbbb');
  });
});

// === aggregations ===

describe('aggregateSkillDistribution', () => {
  it('tallies skill tags across the cohort, sorted by count desc', async () => {
    const claims: OperatorClaim[] = [
      claim({ wallet: '0xa', skills_tags: ['research', 'coding'] }),
      claim({ wallet: '0xb', skills_tags: ['research'] }),
      claim({ wallet: '0xc', skills_tags: ['coding'] }),
    ];
    const env = makeEnvWith(claims);
    const dist = await aggregateSkillDistribution(env);
    expect(dist[0]).toEqual({ tag: 'research', count: 2 });
    expect(dist[1]).toEqual({ tag: 'coding', count: 2 });
  });

  it('returns empty array for empty cohort', async () => {
    const env = makeEnvWith([]);
    expect(await aggregateSkillDistribution(env)).toEqual([]);
  });
});

describe('aggregateServiceAreaDistribution', () => {
  it('tallies service_areas', async () => {
    const claims: OperatorClaim[] = [
      claim({ wallet: '0xa', service_areas: ['research'] }),
      claim({ wallet: '0xb', service_areas: ['research', 'data'] }),
    ];
    const env = makeEnvWith(claims);
    const dist = await aggregateServiceAreaDistribution(env);
    expect(dist.find((d) => d.area === 'research')?.count).toBe(2);
    expect(dist.find((d) => d.area === 'data')?.count).toBe(1);
  });
});
