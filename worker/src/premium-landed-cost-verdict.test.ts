import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildLandedCostVerdict,
  normalizeLandedCostInputs,
  computeLandedCostVerdict,
  checkLandedCostPreviewRateLimit,
} from './premium-landed-cost-verdict';
import type { HtsRecord } from './hts-source';

vi.mock('./hts-source', async () => {
  const actual = (await vi.importActual('./hts-source')) as Record<string, unknown>;
  return { ...actual, fetchHtsRecord: vi.fn(), fetchChapter99Record: vi.fn() };
});
vi.mock('./kill-switch', () => ({ safePut: vi.fn(async () => {}) }));
import { fetchHtsRecord, fetchChapter99Record } from './hts-source';
import { safePut } from './kill-switch';

function hts(over: Partial<HtsRecord> = {}): HtsRecord {
  return {
    htsno: '0101.30.00.00',
    description: 'Asses',
    units: ['No.'],
    general: '6.8%',
    special: 'Free (A+,AU,BH,CL,CO,D,E,IL,JO,KR,MA,OM,P,PA,PE,S,SG)',
    other: '15%',
    footnotes: [{ value: 'See 9903.88.15.', columns: ['general'] }],
    ...over,
  };
}

const CAP = '2026-06-28T00:00:00.000Z';

describe('buildLandedCostVerdict column selection', () => {
  it('uses Column 1 General (MFN) by default', () => {
    const v = buildLandedCostVerdict({ hts: '0101.30.00.00', origin: 'DE', valueUsd: 1000 }, hts(), {}, CAP);
    expect(v.column_used).toBe('general');
    expect(v.base_rate!.duty_usd).toBeCloseTo(68, 2);
  });

  it('uses Column 2 for a non-NTR origin (North Korea)', () => {
    const v = buildLandedCostVerdict({ hts: '0101.30.00.00', origin: 'KP', valueUsd: 1000 }, hts(), {}, CAP);
    expect(v.column_used).toBe('column2');
    expect(v.base_rate!.duty_usd).toBeCloseTo(150, 2);
  });

  it('uses the Special rate when an FTA is claimed and its SPI is listed, flagged on rules of origin', () => {
    const v = buildLandedCostVerdict({ hts: '0101.30.00.00', origin: 'KR', valueUsd: 1000, fta: 'KR' }, hts(), {}, CAP);
    expect(v.column_used).toBe('special');
    expect(v.base_rate!.duty_usd).toBe(0);
    expect(v.notes.some((n) => /rules of origin/i.test(n))).toBe(true);
  });

  it('ignores an FTA claim whose SPI is not in the special list', () => {
    const v = buildLandedCostVerdict({ hts: '0101.30.00.00', origin: 'XX', valueUsd: 1000, fta: 'ZZ' }, hts(), {}, CAP);
    expect(v.column_used).toBe('general');
  });
});

describe('buildLandedCostVerdict additional duties', () => {
  it('applies Section 301 for China origin from the footnote code using the fetched rate', () => {
    const v = buildLandedCostVerdict(
      { hts: '0101.30.00.00', origin: 'CN', valueUsd: 1000 },
      hts(),
      { '9903.88.15': 'The duty provided in the applicable subheading + 7.5%' },
      CAP,
    );
    const s301 = v.additional_duties.find((d) => d.section === '301');
    expect(s301).toBeDefined();
    expect(s301!.rate_pct).toBe(7.5);
    expect(s301!.duty_usd).toBeCloseTo(75, 2);
    expect(s301!.status).toBe('active');
  });

  it('does not apply Section 301 for a non-China origin', () => {
    const v = buildLandedCostVerdict({ hts: '0101.30.00.00', origin: 'DE', valueUsd: 1000 }, hts(), { '9903.88.15': 'x + 7.5%' }, CAP);
    expect(v.additional_duties.find((d) => d.section === '301')).toBeUndefined();
  });

  it('applies the ambient Section 122 global surcharge to every origin, flagged under appeal', () => {
    const v = buildLandedCostVerdict({ hts: '0101.30.00.00', origin: 'DE', valueUsd: 1000 }, hts(), {}, CAP);
    const s122 = v.additional_duties.find((d) => d.section === '122');
    expect(s122).toBeDefined();
    expect(s122!.status).toBe('under_appeal');
    expect(s122!.duty_usd).toBeCloseTo(100, 2);
  });

  it('orders the stacked duties 301 then 122 then 232', () => {
    const rec = hts({ footnotes: [{ value: 'See 9903.88.15 and 9903.80.01.', columns: ['general'] }] });
    const v = buildLandedCostVerdict(
      { hts: '0101.30.00.00', origin: 'CN', valueUsd: 1000 },
      rec,
      { '9903.88.15': 'x + 7.5%', '9903.80.01': 'x + 25%' },
      CAP,
    );
    const sections = v.additional_duties.map((d) => d.section);
    expect(sections.indexOf('301')).toBeLessThan(sections.indexOf('122'));
    expect(sections.indexOf('122')).toBeLessThan(sections.indexOf('232'));
  });
});

describe('buildLandedCostVerdict fees and totals', () => {
  it('computes MPF clamped to the FY2026 min and max', () => {
    const small = buildLandedCostVerdict({ hts: '0101.30.00.00', origin: 'DE', valueUsd: 100 }, hts(), {}, CAP);
    expect(small.fees.mpf_usd).toBeCloseTo(33.58, 2);
    const big = buildLandedCostVerdict({ hts: '0101.30.00.00', origin: 'DE', valueUsd: 1000000 }, hts(), {}, CAP);
    expect(big.fees.mpf_usd).toBeCloseTo(651.5, 2);
  });

  it('charges HMF only for ocean mode', () => {
    const ocean = buildLandedCostVerdict({ hts: '0101.30.00.00', origin: 'DE', valueUsd: 1000, mode: 'ocean' }, hts(), {}, CAP);
    expect(ocean.fees.hmf_applies).toBe(true);
    expect(ocean.fees.hmf_usd).toBeCloseTo(1.25, 2);
    const air = buildLandedCostVerdict({ hts: '0101.30.00.00', origin: 'DE', valueUsd: 1000, mode: 'air' }, hts(), {}, CAP);
    expect(air.fees.hmf_applies).toBe(false);
    expect(air.fees.hmf_usd).toBe(0);
  });

  it('totals value plus base duty plus add-ons plus fees', () => {
    const v = buildLandedCostVerdict({ hts: '0101.30.00.00', origin: 'DE', valueUsd: 1000 }, hts(), {}, CAP);
    expect(v.total_duty_usd).toBeCloseTo(168, 2);
    expect(v.total_landed_cost_usd).toBeCloseTo(1201.58, 2);
  });
});

describe('buildLandedCostVerdict status and framing', () => {
  it('is unavailable (no-charge) when the HTS record is missing', () => {
    const v = buildLandedCostVerdict({ hts: '9999.99.99.99', origin: 'DE', valueUsd: 1000 }, null, {}, CAP);
    expect(v.status).toBe('unavailable');
    expect(v.total_landed_cost_usd).toBeNull();
  });

  it('carries the estimate disclaimer, data_as_of, and a citation on a normal estimate', () => {
    const v = buildLandedCostVerdict({ hts: '0101.30.00.00', origin: 'CN', valueUsd: 1000 }, hts(), { '9903.88.15': 'x + 7.5%' }, CAP);
    expect(v.disclaimer.toLowerCase()).toContain('not legal');
    expect(v.disclaimer.toLowerCase()).toContain('estimate');
    expect(v.data_as_of).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(v.additional_duties[0].citation).toMatch(/^https?:\/\//);
  });

  it('serializes with no em dashes or double hyphens', () => {
    const v = buildLandedCostVerdict({ hts: '0101.30.00.00', origin: 'CN', valueUsd: 1000, mode: 'ocean' }, hts(), { '9903.88.15': 'x + 7.5%' }, CAP);
    const blob = JSON.stringify(v);
    expect(blob).not.toContain(String.fromCharCode(0x2014));
    expect(blob).not.toMatch(/-{2}/);
  });
});

describe('normalizeLandedCostInputs', () => {
  it('accepts a valid 10-digit HTS, ISO-2 origin, and positive value', () => {
    const r = normalizeLandedCostInputs({ hts: '0101.30.00.00', origin: 'cn', value_usd: '1000' });
    expect(r).not.toBeNull();
    expect(r!.origin).toBe('CN');
    expect(r!.valueUsd).toBe(1000);
  });
  it('rejects a missing or malformed HTS code', () => {
    expect(normalizeLandedCostInputs({ hts: '', origin: 'CN', value_usd: '1000' })).toBeNull();
    expect(normalizeLandedCostInputs({ hts: 'abc', origin: 'CN', value_usd: '1000' })).toBeNull();
  });
  it('rejects a non-positive or non-numeric value', () => {
    expect(normalizeLandedCostInputs({ hts: '0101.30.00.00', origin: 'CN', value_usd: '0' })).toBeNull();
    expect(normalizeLandedCostInputs({ hts: '0101.30.00.00', origin: 'CN', value_usd: 'x' })).toBeNull();
  });
  it('rejects a malformed origin', () => {
    expect(normalizeLandedCostInputs({ hts: '0101.30.00.00', origin: 'USA', value_usd: '1000' })).toBeNull();
  });
});

describe('computeLandedCostVerdict', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('fetches the HTS record and Chapter 99 rates and builds an estimate', async () => {
    (fetchHtsRecord as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(hts());
    (fetchChapter99Record as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      htsno: '9903.88.15',
      description: '',
      rate_text: 'The duty provided in the applicable subheading + 7.5%',
    });
    const v = await computeLandedCostVerdict({} as never, { hts: '0101.30.00.00', origin: 'CN', valueUsd: 1000 });
    expect(v.status).toBe('estimated');
    expect(v.additional_duties.find((d) => d.section === '301')!.rate_pct).toBe(7.5);
    expect(typeof v.capturedAt).toBe('string');
  });
  it('returns unavailable (no-charge) when the HTS source is down', async () => {
    (fetchHtsRecord as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const v = await computeLandedCostVerdict({} as never, { hts: '9999.99.99.99', origin: 'CN', valueUsd: 1000 });
    expect(v.status).toBe('unavailable');
  });
});

describe('checkLandedCostPreviewRateLimit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it('allows under the cap and writes an incremented counter', async () => {
    const env = { TENSORFEED_CACHE: { get: vi.fn(async () => null) } } as unknown as never;
    const r = await checkLandedCostPreviewRateLimit(env, '1.2.3.4', 10);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(9);
    expect(safePut).toHaveBeenCalledOnce();
  });
});
