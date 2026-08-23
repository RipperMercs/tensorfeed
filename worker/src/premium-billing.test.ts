import { describe, it, expect } from 'vitest';
import { buildPremiumBillingBlock, attachBillingNarration, explorerTxUrl } from './premium-billing';
import type { PaymentResult } from './payments';

const MINT_PAYMENT: PaymentResult = {
  paid: true,
  token: 'tf_live_' + 'a'.repeat(64),
  cost: 1,
  currentBalance: 1,
  newToken: true,
};

describe('buildPremiumBillingBlock', () => {
  it('never includes the raw token on a fresh mint', () => {
    const billing = buildPremiumBillingBlock(
      { creditsCharged: 1, balanceAfter: 0, noChargeReason: null },
      MINT_PAYMENT,
    );
    expect(billing.new_token_issued).toBe(true);
    expect(billing.token_delivery).toBe('header:X-Payment-Token');
    expect(billing.token).toBeUndefined();
    expect(JSON.stringify(billing)).not.toContain('tf_live_');
  });

  it('carries charge and balance with no token fields on bearer reuse', () => {
    const billing = buildPremiumBillingBlock(
      { creditsCharged: 2, balanceAfter: 7, noChargeReason: null },
      { paid: true, token: 'tf_live_' + 'b'.repeat(64) },
    );
    expect(billing).toEqual({ credits_charged: 2, credits_remaining: 7 });
  });

  it('emits the AFTA no-charge block and stays token-free on the validation-failure shape', () => {
    const billing = buildPremiumBillingBlock(
      { creditsCharged: 0, balanceAfter: 3, noChargeReason: 'schema_validation_failure' },
      MINT_PAYMENT,
    );
    expect(billing.no_charge_reason).toBe('schema_validation_failure');
    expect(billing.afta_doc).toBe('https://tensorfeed.ai/agent-fair-trade');
    expect(billing.new_token_issued).toBe(true);
    expect(JSON.stringify(billing)).not.toContain('tf_live_');
  });
});

const SETTLED_PAYMENT: PaymentResult = {
  paid: true,
  token: 'tf_live_' + 'c'.repeat(64),
  cost: 1,
  currentBalance: 50,
  newToken: true,
  payerWallet: '0xEc1E2C4900000000000000000000000000000000',
  settlementTxHash: '0x' + 'd'.repeat(64),
  settlementRail: 'base',
  settlementNetwork: 'eip155:8453',
};

describe('explorerTxUrl', () => {
  const tx = '0x' + 'e'.repeat(64);

  it('resolves Base mainnet and Sepolia to their own explorers', () => {
    expect(explorerTxUrl('base', 'eip155:8453', tx)).toBe(`https://basescan.org/tx/${tx}`);
    expect(explorerTxUrl('base', 'eip155:84532', tx)).toBe(`https://sepolia.basescan.org/tx/${tx}`);
  });

  it('defaults a missing network to Base mainnet', () => {
    expect(explorerTxUrl('base', null, tx)).toBe(`https://basescan.org/tx/${tx}`);
  });

  it('resolves Solana signatures to Solscan', () => {
    expect(explorerTxUrl('solana', 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', 'sig123')).toBe(
      'https://solscan.io/tx/sig123',
    );
  });

  it('returns null rather than guessing an explorer for an unknown network', () => {
    expect(explorerTxUrl('base', 'eip155:1', tx)).toBeNull();
    expect(explorerTxUrl('base', 'eip155:8453', '')).toBeNull();
  });
});

describe('settlement block', () => {
  it('cites the on-chain tx when this call settled', () => {
    const billing = buildPremiumBillingBlock(
      { creditsCharged: 1, balanceAfter: 49, noChargeReason: null },
      SETTLED_PAYMENT,
    );
    expect(billing.settlement).toEqual({
      rail: 'base',
      network: 'eip155:8453',
      tx_hash: SETTLED_PAYMENT.settlementTxHash,
      explorer_url: `https://basescan.org/tx/${SETTLED_PAYMENT.settlementTxHash}`,
      payer: SETTLED_PAYMENT.payerWallet,
    });
  });

  it('omits settlement on bearer reuse so an earlier funding tx is never cited as this call', () => {
    const billing = buildPremiumBillingBlock(
      { creditsCharged: 1, balanceAfter: 48, noChargeReason: null },
      { paid: true, token: 'tf_live_' + 'f'.repeat(64) },
    );
    expect(billing.settlement).toBeUndefined();
  });
});

describe('attachBillingNarration', () => {
  const narrate = (
    commit: Parameters<typeof buildPremiumBillingBlock>[0],
    payment: PaymentResult,
    receiptId: string | null = 'rcpt_0123456789abcdef',
    mutate: (b: Record<string, unknown>) => void = () => {},
  ): string => {
    const billing = buildPremiumBillingBlock(commit, payment);
    mutate(billing);
    attachBillingNarration(billing, { endpoint: '/api/premium/ai-datacenters/buildout', receiptId });
    return billing.summary as string;
  };

  it('names the charge, the on-chain proof, and the receipt in one quotable line', () => {
    const summary = narrate({ creditsCharged: 1, balanceAfter: 49, noChargeReason: null }, SETTLED_PAYMENT);
    expect(summary).toContain('Charged 1 credit for /api/premium/ai-datacenters/buildout, 49 credits remaining.');
    expect(summary).toContain(`https://basescan.org/tx/${SETTLED_PAYMENT.settlementTxHash}`);
    expect(summary).toContain('rcpt_0123456789abcdef');
    expect(summary).toContain('https://tensorfeed.ai/agent-fair-trade#receipts');
  });

  it('pluralizes credits correctly', () => {
    expect(narrate({ creditsCharged: 2, balanceAfter: 1, noChargeReason: null }, SETTLED_PAYMENT)).toContain(
      'Charged 2 credits for /api/premium/ai-datacenters/buildout, 1 credit remaining.',
    );
  });

  it('says no charge and gives the reason on an AFTA no-charge call', () => {
    const summary = narrate(
      { creditsCharged: 0, balanceAfter: 12, noChargeReason: 'stale_data' },
      { paid: true, token: 'tf_live_' + 'g'.repeat(64) },
    );
    expect(summary).toContain('No charge for /api/premium/ai-datacenters/buildout (stale_data), 12 credits remaining.');
    expect(summary).not.toContain('Charged');
  });

  it('reports the free-trial grant rather than a zero charge', () => {
    const summary = narrate(
      { creditsCharged: 0, balanceAfter: 0, noChargeReason: 'free_trial' },
      { paid: true },
      'rcpt_aaaabbbbccccdddd',
      b => { b.tier = 'free_trial'; },
    );
    expect(summary).toContain('served under the free-trial quota');
  });

  it('reads the post-attestation credit total, not the pre-surcharge one', () => {
    const summary = narrate(
      { creditsCharged: 1, balanceAfter: 49, noChargeReason: null },
      SETTLED_PAYMENT,
      'rcpt_0123456789abcdef',
      b => { b.credits_charged = 2; b.credits_remaining = 48; },
    );
    expect(summary).toContain('Charged 2 credits');
    expect(summary).toContain('48 credits remaining');
  });

  it('says so plainly when the receipt key is not bootstrapped', () => {
    const summary = narrate({ creditsCharged: 1, balanceAfter: 49, noChargeReason: null }, SETTLED_PAYMENT, null);
    expect(summary).toContain('pending key bootstrap');
    expect(summary).not.toContain('Signed receipt');
  });

  it('never leaks the bearer token into the narration', () => {
    const summary = narrate({ creditsCharged: 1, balanceAfter: 49, noChargeReason: null }, SETTLED_PAYMENT);
    expect(summary).not.toContain('tf_live_');
  });

  it('carries no em dashes or double hyphens', () => {
    const summary = narrate({ creditsCharged: 1, balanceAfter: 49, noChargeReason: null }, SETTLED_PAYMENT);
    expect(summary).not.toMatch(/[—–]/);
    expect(summary).not.toContain('--');
  });
});
