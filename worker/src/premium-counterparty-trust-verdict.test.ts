import { describe, it, expect } from 'vitest';
import {
  buildCounterpartyTrustVerdict,
  redactCounterpartyTrustVerdictForPreview,
  type CounterpartyLegs,
} from './premium-counterparty-trust-verdict';

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
