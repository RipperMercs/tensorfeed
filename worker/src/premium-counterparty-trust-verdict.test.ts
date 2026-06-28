import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildCounterpartyTrustVerdict,
  redactCounterpartyTrustVerdictForPreview,
  computeCounterpartyTrustVerdict,
  checkCounterpartyTrustVerdictPreviewRateLimit,
  normalizeEvmAddress,
  type CounterpartyLegs,
} from './premium-counterparty-trust-verdict';

vi.mock('./payments', () => ({ screenWalletOFAC: vi.fn() }));
vi.mock('./agent-reputation-store', () => ({ getReputationCardByWallet: vi.fn() }));
vi.mock('./onchain-presence', () => ({ readOnchainPresence: vi.fn(), readErc8004Registry: vi.fn() }));
vi.mock('./kill-switch', () => ({ safePut: vi.fn() }));

import { screenWalletOFAC } from './payments';
import { getReputationCardByWallet } from './agent-reputation-store';
import { readOnchainPresence, readErc8004Registry } from './onchain-presence';
import { safePut } from './kill-switch';

const CAP = '2026-06-27T12:00:00Z';
const ADDR = '0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1';

function mkLegs(over: Partial<CounterpartyLegs> = {}): CounterpartyLegs {
  return {
    sanctions: { status: 'clear', identifications_count: 0 },
    onchain: { tx_count: 0, native_balance_wei: '0', usdc_balance_6: '0' },
    tfFootprint: null,
    tfReputation: null,
    erc8004: { coverage: 'not_resolved', agent_id: null, agent_uri: null, raw_feedback_count: null },
    ...over,
  };
}

const footprintActive = {
  indexed: true,
  active: true,
  first_settled: '2026-06-01',
  last_settled: '2026-06-26',
  wallet_shared: false,
  disclosure: null,
};
const repGood = { known: true, reputable: true, trust_grade: 'A', paid_calls: 120 };

describe('buildCounterpartyTrustVerdict: deterministic rollup', () => {
  it('sanctioned address is avoid (hard gate)', () => {
    const r = buildCounterpartyTrustVerdict(ADDR, mkLegs({ sanctions: { status: 'sanctioned', identifications_count: 1 } }), CAP);
    expect(r.ok).toBe(true);
    expect(r.verdict).toBe('avoid');
    expect(r.sanctions.status).toBe('sanctioned');
  });

  it('sanctioned beats every positive signal', () => {
    const r = buildCounterpartyTrustVerdict(
      ADDR,
      mkLegs({
        sanctions: { status: 'sanctioned', identifications_count: 2 },
        tfFootprint: footprintActive,
        tfReputation: repGood,
        onchain: { tx_count: 9999, native_balance_wei: '5000000000000000', usdc_balance_6: '10000000' },
      }),
      CAP,
    );
    expect(r.verdict).toBe('avoid');
  });

  it('screening unavailable yields screening_unavailable, never a clean clear', () => {
    const r = buildCounterpartyTrustVerdict(
      ADDR,
      mkLegs({ sanctions: { status: 'unavailable', identifications_count: null }, onchain: { tx_count: 500, native_balance_wei: '1', usdc_balance_6: '1' } }),
      CAP,
    );
    expect(r.verdict).toBe('screening_unavailable');
    expect(r.notes.join(' ')).toMatch(/not screened|unavailable/i);
  });

  it('clear + active TF settlement footprint is established', () => {
    const r = buildCounterpartyTrustVerdict(ADDR, mkLegs({ tfFootprint: footprintActive }), CAP);
    expect(r.verdict).toBe('established');
    expect(r.tf.settling).toBe(true);
    expect(r.tf.first_settled).toBe('2026-06-01');
  });

  it('clear + reputable TF customer is established', () => {
    const r = buildCounterpartyTrustVerdict(ADDR, mkLegs({ tfReputation: repGood }), CAP);
    expect(r.verdict).toBe('established');
    expect(r.tf.reputation_known).toBe(true);
    expect(r.tf.trust_grade).toBe('A');
  });

  it('clear + heavy on-chain activity is established', () => {
    const r = buildCounterpartyTrustVerdict(ADDR, mkLegs({ onchain: { tx_count: 250, native_balance_wei: '0', usdc_balance_6: '1000000' } }), CAP);
    expect(r.verdict).toBe('established');
    expect(r.onchain?.funded).toBe(true);
  });

  it('clear + moderate activity is active', () => {
    const r = buildCounterpartyTrustVerdict(ADDR, mkLegs({ onchain: { tx_count: 25, native_balance_wei: '1000', usdc_balance_6: '0' } }), CAP);
    expect(r.verdict).toBe('active');
  });

  it('clear + thin activity is limited_history', () => {
    const r = buildCounterpartyTrustVerdict(ADDR, mkLegs({ onchain: { tx_count: 3, native_balance_wei: '0', usdc_balance_6: '0' } }), CAP);
    expect(r.verdict).toBe('limited_history');
  });

  it('clear + no signal is unknown', () => {
    const r = buildCounterpartyTrustVerdict(ADDR, mkLegs(), CAP);
    expect(r.verdict).toBe('unknown');
    expect(r.notes.join(' ')).toMatch(/verify/i);
  });

  it('an unknown TF reputation that is not reputable does not inflate the verdict', () => {
    const r = buildCounterpartyTrustVerdict(
      ADDR,
      mkLegs({ tfReputation: { known: true, reputable: false, trust_grade: 'D', paid_calls: 1 }, onchain: { tx_count: 3, native_balance_wei: '0', usdc_balance_6: '0' } }),
      CAP,
    );
    expect(r.verdict).toBe('limited_history');
  });
});

describe('buildCounterpartyTrustVerdict: ERC-8004 is Sybil-safe and never drives the score', () => {
  it('registered counterparty surfaces agentId + raw feedback with an explicit Sybil caveat', () => {
    const r = buildCounterpartyTrustVerdict(
      ADDR,
      mkLegs({
        erc8004: { coverage: 'registered', agent_id: '8004:42', agent_uri: 'ipfs://card', raw_feedback_count: 5000 },
        onchain: { tx_count: 3, native_balance_wei: '0', usdc_balance_6: '0' },
      }),
      CAP,
    );
    // a huge raw feedback count must NOT bump a thin address above limited_history
    expect(r.verdict).toBe('limited_history');
    expect(r.erc8004.coverage).toBe('registered');
    expect(r.erc8004.agent_id).toBe('8004:42');
    expect(r.erc8004.raw_feedback_count).toBe(5000);
    expect(r.notes.join(' ')).toMatch(/Sybil/i);
    expect(r.notes.join(' ')).toMatch(/not a trust score/i);
  });

  it('not_resolved coverage tells the caller how to opt in to the registry leg', () => {
    const r = buildCounterpartyTrustVerdict(ADDR, mkLegs(), CAP);
    expect(r.erc8004.coverage).toBe('not_resolved');
    expect(r.notes.join(' ')).toMatch(/agent_id/i);
  });
});

describe('buildCounterpartyTrustVerdict: trust context and hygiene', () => {
  it('surfaces shared-wallet risk as a flag and a note without changing the verdict', () => {
    const r = buildCounterpartyTrustVerdict(
      ADDR,
      mkLegs({
        tfFootprint: { ...footprintActive, wallet_shared: true, disclosure: 'Base payTo wallet shared with b.com.' },
      }),
      CAP,
    );
    expect(r.verdict).toBe('established');
    expect(r.tf.wallet_shared).toBe(true);
    expect(r.tf.disclosure).toContain('shared with');
    expect(r.notes.join(' ')).toMatch(/shared/i);
  });

  it('capturedAt is the passed data time, never the wall clock', () => {
    const r = buildCounterpartyTrustVerdict(ADDR, mkLegs(), CAP);
    expect(r.capturedAt).toBe(CAP);
  });

  it('reports funded from balances without letting it drive the verdict', () => {
    const r = buildCounterpartyTrustVerdict(ADDR, mkLegs({ onchain: { tx_count: 0, native_balance_wei: '0', usdc_balance_6: '250000' } }), CAP);
    expect(r.onchain?.funded).toBe(true);
    expect(r.verdict).toBe('unknown'); // funded but never transacted: still no activity history
  });

  it('treats a malformed balance string as zero, never NaN or a throw', () => {
    const r = buildCounterpartyTrustVerdict(ADDR, mkLegs({ onchain: { tx_count: 5, native_balance_wei: 'not-a-number', usdc_balance_6: 'x' } }), CAP);
    expect(r.onchain?.funded).toBe(false);
    expect(r.verdict).toBe('limited_history');
  });

  it('emits zero em dashes and zero double hyphens', () => {
    const r = buildCounterpartyTrustVerdict(
      ADDR,
      mkLegs({
        sanctions: { status: 'unavailable', identifications_count: null },
        tfFootprint: { ...footprintActive, wallet_shared: true, disclosure: 'shared with b.com' },
        erc8004: { coverage: 'registered', agent_id: '8004:42', agent_uri: 'ipfs://card', raw_feedback_count: 12 },
      }),
      CAP,
    );
    const json = JSON.stringify(r);
    expect(json).not.toContain('—');
    expect(json).not.toContain('–');
    expect(json.includes('--')).toBe(false);
  });
});

describe('redactCounterpartyTrustVerdictForPreview', () => {
  it('keeps address/verdict/claim/captured_at and drops every evidence leg', () => {
    const full = buildCounterpartyTrustVerdict(ADDR, mkLegs({ tfFootprint: footprintActive }), CAP);
    const p = redactCounterpartyTrustVerdictForPreview(full);
    expect(p.preview).toBe(true);
    expect(p.address).toBe(ADDR);
    expect(p.verdict).toBe(full.verdict);
    expect(p.claim).toBe(full.claim);
    expect(p.captured_at).toBe(CAP);
    const rec = p as unknown as Record<string, unknown>;
    expect(rec.sanctions).toBeUndefined();
    expect(rec.onchain).toBeUndefined();
    expect(rec.tf).toBeUndefined();
    expect(rec.erc8004).toBeUndefined();
  });
});

const ERC_NOT_RESOLVED = { coverage: 'not_resolved' as const, agent_id: null, agent_uri: null, raw_feedback_count: null };
function envWith(dir: unknown) {
  return {
    CHAINALYSIS_API_KEY: 'k',
    TENSORFEED_CACHE: { get: async (key: string) => (key === 'x402-idx:verified' ? dir : null), put: async () => undefined },
  } as unknown as Parameters<typeof computeCounterpartyTrustVerdict>[0];
}

describe('computeCounterpartyTrustVerdict orchestration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(readOnchainPresence).mockResolvedValue(null);
    vi.mocked(getReputationCardByWallet).mockResolvedValue(null);
    vi.mocked(readErc8004Registry).mockResolvedValue(ERC_NOT_RESOLVED);
    vi.mocked(screenWalletOFAC).mockResolvedValue({ sanctioned: false, identifications: [], error: null });
  });

  it('maps a real sanctions hit (error null, sanctioned true) to avoid', async () => {
    vi.mocked(screenWalletOFAC).mockResolvedValue({ sanctioned: true, identifications: [{ category: 'sanctions' }], error: null });
    const r = await computeCounterpartyTrustVerdict(envWith(null), ADDR);
    expect(r.verdict).toBe('avoid');
    expect(r.sanctions.status).toBe('sanctioned');
  });

  it('maps a fail-closed screening error to screening_unavailable, never a false avoid', async () => {
    // screenWalletOFAC fails CLOSED (sanctioned:true) when unconfigured, but with error set.
    // For a verdict that must NOT read as a real sanctions hit.
    vi.mocked(screenWalletOFAC).mockResolvedValue({ sanctioned: true, identifications: null, error: 'screening_not_configured' });
    const r = await computeCounterpartyTrustVerdict(envWith(null), ADDR);
    expect(r.verdict).toBe('screening_unavailable');
    expect(r.sanctions.status).toBe('unavailable');
  });

  it('clear screen + the wallet in an active publisher entry is established and settling (case-insensitive match)', async () => {
    const dir = {
      captured_at: '2026-06-27T09:00:00Z',
      publishers: [
        { domain: 'pub.example', status: 'verified-settling', activity: 'active', pay_to_wallets: [ADDR.toUpperCase()], first_settled: '2026-06-01', last_settled: '2026-06-26', note: null, first_seen: '2026-06-01' },
      ],
    };
    const r = await computeCounterpartyTrustVerdict(envWith(dir), ADDR);
    expect(r.verdict).toBe('established');
    expect(r.tf.settling).toBe(true);
    expect(r.tf.first_settled).toBe('2026-06-01');
  });

  it('a grade-A TF reputation card establishes the counterparty', async () => {
    vi.mocked(getReputationCardByWallet).mockResolvedValue({ trust_grade: 'A', banned: false, metrics: { paid_calls: 80 } } as never);
    const r = await computeCounterpartyTrustVerdict(envWith(null), ADDR);
    expect(r.verdict).toBe('established');
    expect(r.tf.reputation_known).toBe(true);
    expect(r.tf.trust_grade).toBe('A');
  });

  it('a banned grade-A card is not treated as reputable', async () => {
    vi.mocked(getReputationCardByWallet).mockResolvedValue({ trust_grade: 'A', banned: true, metrics: { paid_calls: 80 } } as never);
    vi.mocked(readOnchainPresence).mockResolvedValue({ tx_count: 2, native_balance_wei: '0', usdc_balance_6: '0' });
    const r = await computeCounterpartyTrustVerdict(envWith(null), ADDR);
    expect(r.verdict).toBe('limited_history');
  });

  it('passes the ERC-8004 leg through from the registry reader and forwards the agentId', async () => {
    vi.mocked(readErc8004Registry).mockResolvedValue({ coverage: 'registered', agent_id: '8004:42', agent_uri: 'ipfs://c', raw_feedback_count: 9 });
    const r = await computeCounterpartyTrustVerdict(envWith(null), ADDR, { agentId: '8004:42' });
    expect(r.erc8004.coverage).toBe('registered');
    expect(r.erc8004.agent_id).toBe('8004:42');
    expect(readErc8004Registry).toHaveBeenCalledWith(expect.anything(), ADDR, '8004:42');
  });

  it('no signals at all yields unknown', async () => {
    const r = await computeCounterpartyTrustVerdict(envWith(null), ADDR);
    expect(r.verdict).toBe('unknown');
  });
});

describe('normalizeEvmAddress', () => {
  it('accepts a 0x + 40-hex address and lowercases it', () => {
    expect(normalizeEvmAddress('0x549C82E6bfc54bDAe9A2073744cbC2af5d1FC6D1')).toBe('0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1');
  });
  it('rejects junk, short, and empty input', () => {
    expect(normalizeEvmAddress('not-an-address')).toBeNull();
    expect(normalizeEvmAddress('0x123')).toBeNull();
    expect(normalizeEvmAddress('')).toBeNull();
  });
});

describe('checkCounterpartyTrustVerdictPreviewRateLimit', () => {
  beforeEach(() => vi.clearAllMocks());

  it('allows a request under the cap and records the increment', async () => {
    const env = { TENSORFEED_CACHE: { get: async () => null } } as unknown as Parameters<typeof checkCounterpartyTrustVerdictPreviewRateLimit>[0];
    const r = await checkCounterpartyTrustVerdictPreviewRateLimit(env, '1.2.3.4', 10);
    expect(r.allowed).toBe(true);
    expect(r.remaining).toBe(9);
    expect(r.limit).toBe(10);
    expect(safePut).toHaveBeenCalledTimes(1);
  });

  it('blocks once the cap is reached and does not record another increment', async () => {
    const env = { TENSORFEED_CACHE: { get: async () => ({ count: 10 }) } } as unknown as Parameters<typeof checkCounterpartyTrustVerdictPreviewRateLimit>[0];
    const r = await checkCounterpartyTrustVerdictPreviewRateLimit(env, '1.2.3.4', 10);
    expect(r.allowed).toBe(false);
    expect(r.remaining).toBe(0);
    expect(safePut).not.toHaveBeenCalled();
  });
});
