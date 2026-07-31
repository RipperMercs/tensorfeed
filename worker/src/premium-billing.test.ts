import { describe, it, expect } from 'vitest';
import { buildPremiumBillingBlock } from './premium-billing';
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
