import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildRestrictedPartyVerdict,
  redactRestrictedPartyVerdictForPreview,
  normalizePartyName,
  computeRestrictedPartyVerdict,
  checkRestrictedPartyVerdictPreviewRateLimit,
} from './premium-restricted-party-verdict';
import type { CslScreenResult, CslMatch } from './compliance-screen';

vi.mock('./compliance-screen', () => ({ screenPartyAgainstCSL: vi.fn() }));
vi.mock('./kill-switch', () => ({ safePut: vi.fn(async () => {}) }));
import { screenPartyAgainstCSL } from './compliance-screen';
import { safePut } from './kill-switch';

function match(over: Partial<CslMatch> = {}): CslMatch {
  return {
    name: 'ACME TRADING CO',
    alt_names: [],
    type: 'Entity',
    source: 'Entity List (EL) - Bureau of Industry and Security',
    source_list_url: 'https://www.bis.doc.gov/entitylist',
    source_information_url: null,
    programs: ['EAR'],
    entity_number: '123',
    countries: ['CN'],
    score: null,
    match_type: 'exact',
    ...over,
  };
}
function screen(over: Partial<CslScreenResult> = {}): CslScreenResult {
  return { available: true, error: null, total: 0, matches: [], ...over };
}

const CAP = '2026-06-28T00:00:00.000Z';

describe('buildRestrictedPartyVerdict', () => {
  it('returns screening_unavailable (no charge path) when the screen is unavailable', () => {
    const v = buildRestrictedPartyVerdict(
      'Acme Trading Co',
      screen({ available: false, error: 'screening_not_configured' }),
      CAP,
    );
    expect(v.verdict).toBe('screening_unavailable');
    expect(v.requires_human_review).toBe(false);
    expect(v.match_count).toBe(0);
    expect(v.notes.some((n) => /no charge/i.test(n))).toBe(true);
  });

  it('returns restricted_party_match when an exact match is present', () => {
    const v = buildRestrictedPartyVerdict(
      'Acme Trading Co',
      screen({ total: 1, matches: [match({ match_type: 'exact' })] }),
      CAP,
    );
    expect(v.verdict).toBe('restricted_party_match');
    expect(v.requires_human_review).toBe(true);
    expect(v.exact_match_count).toBe(1);
    expect(v.matched_lists).toContain('Entity List (EL) - Bureau of Industry and Security');
  });

  it('returns possible_match when only fuzzy matches are present', () => {
    const v = buildRestrictedPartyVerdict(
      'Acme Trade Co',
      screen({ total: 1, matches: [match({ match_type: 'fuzzy' })] }),
      CAP,
    );
    expect(v.verdict).toBe('possible_match');
    expect(v.requires_human_review).toBe(true);
    expect(v.exact_match_count).toBe(0);
    expect(v.possible_match_count).toBe(1);
  });

  it('returns no_match when the screen ran clean with zero matches', () => {
    const v = buildRestrictedPartyVerdict('Totally Unlisted LLC', screen({ total: 0, matches: [] }), CAP);
    expect(v.verdict).toBe('no_match');
    expect(v.requires_human_review).toBe(false);
    expect(v.match_count).toBe(0);
  });

  it('carries the not-legal-advice framing and capturedAt on every verdict', () => {
    const cases = [
      screen({ available: false, error: 'x' }),
      screen({ matches: [match()] }),
      screen({ matches: [match({ match_type: 'fuzzy' })] }),
      screen(),
    ];
    for (const s of cases) {
      const v = buildRestrictedPartyVerdict('Acme', s, CAP);
      expect(v.disclaimer.toLowerCase()).toContain('not legal advice');
      expect(v.claim.toLowerCase()).toContain('not legal advice');
      expect(v.attribution.source).toContain('Consolidated Screening List');
      expect(v.capturedAt).toBe(CAP);
    }
  });

  it('serializes with no em dashes or double hyphens', () => {
    const v = buildRestrictedPartyVerdict(
      'Acme Trading Co',
      screen({ matches: [match(), match({ name: 'ACME 2', match_type: 'fuzzy' })] }),
      CAP,
    );
    const blob = JSON.stringify(v);
    expect(blob).not.toContain(String.fromCharCode(0x2014));
    expect(blob).not.toMatch(/-{2}/);
  });
});

describe('redactRestrictedPartyVerdictForPreview', () => {
  it('keeps the verdict and counts but strips match details and citations', () => {
    const full = buildRestrictedPartyVerdict('Acme Trading Co', screen({ total: 1, matches: [match()] }), CAP);
    const p = redactRestrictedPartyVerdictForPreview(full);
    expect(p.preview).toBe(true);
    expect(p.verdict).toBe('restricted_party_match');
    expect(p.match_count).toBe(1);
    expect(p.claim).toBe(full.claim);
    expect((p as unknown as Record<string, unknown>).matches).toBeUndefined();
    expect((p as unknown as Record<string, unknown>).matched_lists).toBeUndefined();
  });
});

describe('normalizePartyName', () => {
  it('trims and collapses internal whitespace', () => {
    expect(normalizePartyName('  Acme   Trading   Co ')).toBe('Acme Trading Co');
  });
  it('rejects empty or too-short names', () => {
    expect(normalizePartyName('')).toBeNull();
    expect(normalizePartyName(' a ')).toBeNull();
  });
  it('rejects an over-long name', () => {
    expect(normalizePartyName('x'.repeat(201))).toBeNull();
  });
});

describe('computeRestrictedPartyVerdict', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('screens the name and builds a verdict with a capturedAt', async () => {
    (screenPartyAgainstCSL as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(
      screen({ total: 1, matches: [match()] }),
    );
    const v = await computeRestrictedPartyVerdict({} as never, 'Acme Trading Co');
    expect(v.verdict).toBe('restricted_party_match');
    expect(typeof v.capturedAt).toBe('string');
    expect(screenPartyAgainstCSL).toHaveBeenCalledOnce();
  });
});

describe('checkRestrictedPartyVerdictPreviewRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('allows under the cap and writes an incremented counter', async () => {
    const env = { TENSORFEED_CACHE: { get: vi.fn(async () => null) } } as unknown as never;
    const r = await checkRestrictedPartyVerdictPreviewRateLimit(env, '1.2.3.4', 10);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(9);
    expect(safePut).toHaveBeenCalledOnce();
  });
  it('blocks at the cap', async () => {
    const env = { TENSORFEED_CACHE: { get: vi.fn(async () => ({ count: 10 })) } } as unknown as never;
    const r = await checkRestrictedPartyVerdictPreviewRateLimit(env, '1.2.3.4', 10);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
  });
});
