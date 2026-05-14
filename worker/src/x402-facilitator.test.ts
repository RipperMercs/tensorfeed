/**
 * Tests for the standards-compliant Coinbase x402 V2 facilitator.
 * Focuses on verification + parsing logic (no on-chain broadcast).
 */

import { describe, expect, it } from 'vitest';
import { privateKeyToAccount } from 'viem/accounts';
import type { Hex, Address } from 'viem';
import {
  parseXPaymentHeader,
  verifyPayment,
  paymentRequiredV2,
  encodeSettlementHeader,
  getX402Config,
  X402_CONSTANTS,
  MAINNET_CONFIG,
  SEPOLIA_CONFIG,
  type PaymentPayload,
  type PaymentRequirements,
} from './x402-facilitator';

// Deterministic test key (NOT a real wallet; well-known anvil test key).
const TEST_PRIV_KEY: Hex =
  '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
const TEST_ACCOUNT = privateKeyToAccount(TEST_PRIV_KEY);
const TEST_ADDR = TEST_ACCOUNT.address;

const PAY_TO: Address = '0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1';
const NONCE_A: Hex = `0x${'a'.repeat(64)}`;
const NONCE_B: Hex = `0x${'b'.repeat(64)}`;

const VALID_AMOUNT = '20000'; // 1 credit at $0.02 = 20000 micro-USDC
const VALID_REQUIREMENTS: PaymentRequirements = {
  scheme: 'exact',
  network: 'eip155:8453',
  amount: VALID_AMOUNT,
  asset: X402_CONSTANTS.USDC_BASE_MAINNET,
  payTo: PAY_TO,
  maxTimeoutSeconds: 60,
  extra: { name: 'USD Coin', version: '2' },
};

async function signAuth(opts: {
  from?: Address;
  to: Address;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: Hex;
  signer?: ReturnType<typeof privateKeyToAccount>;
}): Promise<Hex> {
  const signer = opts.signer ?? TEST_ACCOUNT;
  return signer.signTypedData({
    domain: X402_CONSTANTS.USDC_DOMAIN,
    types: X402_CONSTANTS.TRANSFER_WITH_AUTH_TYPES,
    primaryType: 'TransferWithAuthorization',
    message: {
      from: opts.from ?? signer.address,
      to: opts.to,
      value: BigInt(opts.value),
      validAfter: BigInt(opts.validAfter),
      validBefore: BigInt(opts.validBefore),
      nonce: opts.nonce,
    },
  });
}

function nowSecs(): number {
  return Math.floor(Date.now() / 1000);
}

async function buildValidPayload(
  overrides: Partial<{
    nonce: Hex;
    value: string;
    validAfter: string;
    validBefore: string;
    to: Address;
    from: Address;
    signer: ReturnType<typeof privateKeyToAccount>;
  }> = {},
): Promise<PaymentPayload> {
  const now = nowSecs();
  const auth = {
    from: overrides.from ?? TEST_ADDR,
    to: overrides.to ?? PAY_TO,
    value: overrides.value ?? VALID_AMOUNT,
    validAfter: overrides.validAfter ?? String(now - 60),
    validBefore: overrides.validBefore ?? String(now + 600),
    nonce: overrides.nonce ?? NONCE_A,
  };
  const signature = await signAuth({
    from: overrides.from,
    to: auth.to,
    value: auth.value,
    validAfter: auth.validAfter,
    validBefore: auth.validBefore,
    nonce: auth.nonce,
    signer: overrides.signer,
  });
  return {
    x402Version: 2,
    accepted: VALID_REQUIREMENTS,
    payload: {
      signature,
      authorization: auth,
    },
    extensions: {},
  };
}

function encode(payload: PaymentPayload): string {
  return btoa(JSON.stringify(payload));
}

describe('parseXPaymentHeader', () => {
  it('parses a valid base64-encoded PaymentPayload', async () => {
    const payload = await buildValidPayload();
    const parsed = parseXPaymentHeader(encode(payload));
    expect(parsed).not.toBeNull();
    expect(parsed?.x402Version).toBe(2);
    expect(parsed?.payload.authorization.from.toLowerCase()).toBe(TEST_ADDR.toLowerCase());
  });

  it('returns null for empty input', () => {
    expect(parseXPaymentHeader('')).toBeNull();
  });

  it('returns null for non-base64 garbage', () => {
    expect(parseXPaymentHeader('not!!base64!!@#$%')).toBeNull();
  });

  it('returns null for non-JSON after base64 decode', () => {
    expect(parseXPaymentHeader(btoa('not json {{{'))).toBeNull();
  });

  it('returns null when x402Version != 2', async () => {
    const payload = await buildValidPayload();
    const bad = { ...payload, x402Version: 1 };
    expect(parseXPaymentHeader(encode(bad as PaymentPayload))).toBeNull();
  });

  it('returns null when signature is missing', async () => {
    const payload = await buildValidPayload();
    const bad = JSON.parse(JSON.stringify(payload));
    delete bad.payload.signature;
    expect(parseXPaymentHeader(btoa(JSON.stringify(bad)))).toBeNull();
  });

  it('returns null when authorization is missing required fields', async () => {
    const payload = await buildValidPayload();
    const bad = JSON.parse(JSON.stringify(payload));
    delete bad.payload.authorization.value;
    expect(parseXPaymentHeader(btoa(JSON.stringify(bad)))).toBeNull();
  });

  it('returns null when from is not a valid address', async () => {
    const payload = await buildValidPayload();
    const bad = JSON.parse(JSON.stringify(payload));
    bad.payload.authorization.from = 'not-an-address';
    expect(parseXPaymentHeader(btoa(JSON.stringify(bad)))).toBeNull();
  });

  it('returns null when nonce is wrong length', async () => {
    const payload = await buildValidPayload();
    const bad = JSON.parse(JSON.stringify(payload));
    bad.payload.authorization.nonce = '0xabc';
    expect(parseXPaymentHeader(btoa(JSON.stringify(bad)))).toBeNull();
  });

  it('returns null when value is non-numeric', async () => {
    const payload = await buildValidPayload();
    const bad = JSON.parse(JSON.stringify(payload));
    bad.payload.authorization.value = 'abc';
    expect(parseXPaymentHeader(btoa(JSON.stringify(bad)))).toBeNull();
  });

  it('returns null for oversized payload', () => {
    expect(parseXPaymentHeader('a'.repeat(9000))).toBeNull();
  });
});

describe('verifyPayment', () => {
  it('accepts a valid signed authorization', async () => {
    const payload = await buildValidPayload();
    const result = await verifyPayment(payload, VALID_REQUIREMENTS);
    expect(result.isValid).toBe(true);
    expect(result.payer?.toLowerCase()).toBe(TEST_ADDR.toLowerCase());
    expect(result.invalidReason).toBeUndefined();
  });

  it('rejects unsupported scheme', async () => {
    const payload = await buildValidPayload();
    const result = await verifyPayment(payload, { ...VALID_REQUIREMENTS, scheme: 'upto' });
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe('unsupported_scheme');
  });

  it('rejects invalid network (non-Base-mainnet)', async () => {
    const payload = await buildValidPayload();
    const result = await verifyPayment(payload, {
      ...VALID_REQUIREMENTS,
      network: 'eip155:84532',
    });
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe('invalid_network');
  });

  it('rejects wrong asset address', async () => {
    const payload = await buildValidPayload();
    const result = await verifyPayment(payload, {
      ...VALID_REQUIREMENTS,
      asset: '0x' + '0'.repeat(40),
    });
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe('invalid_payment_requirements');
  });

  it('rejects when authorization.to does not match payTo', async () => {
    const payload = await buildValidPayload({ to: ('0x' + '1'.repeat(40)) as Address });
    const result = await verifyPayment(payload, VALID_REQUIREMENTS);
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe('invalid_exact_evm_payload_recipient_mismatch');
  });

  it('rejects when authorization.value does not match required amount', async () => {
    const payload = await buildValidPayload({ value: '10000' });
    const result = await verifyPayment(payload, VALID_REQUIREMENTS);
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe('invalid_exact_evm_payload_authorization_value_mismatch');
  });

  it('rejects when validAfter is in the future', async () => {
    const future = nowSecs() + 3600;
    const payload = await buildValidPayload({
      validAfter: String(future),
      validBefore: String(future + 600),
    });
    const result = await verifyPayment(payload, VALID_REQUIREMENTS);
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe('invalid_exact_evm_payload_authorization_valid_after');
  });

  it('rejects when validBefore has expired', async () => {
    const past = nowSecs() - 3600;
    const payload = await buildValidPayload({
      validAfter: String(past - 600),
      validBefore: String(past),
    });
    const result = await verifyPayment(payload, VALID_REQUIREMENTS);
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe('invalid_exact_evm_payload_authorization_valid_before');
  });

  it('rejects when signature does not recover to from', async () => {
    // Sign as TEST_ACCOUNT but claim a different from address
    const payload = await buildValidPayload();
    const tampered = JSON.parse(JSON.stringify(payload)) as PaymentPayload;
    tampered.payload.authorization.from = ('0x' + 'f'.repeat(40)) as Address;
    const result = await verifyPayment(tampered, VALID_REQUIREMENTS);
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe('invalid_exact_evm_payload_signature');
  });

  it('rejects a tampered value (signature still recovers but to wrong addr or fails verify)', async () => {
    const payload = await buildValidPayload();
    const tampered = JSON.parse(JSON.stringify(payload)) as PaymentPayload;
    tampered.payload.authorization.value = '99999';
    // Value mismatch should be caught BEFORE signature check (cheaper)
    const result = await verifyPayment(tampered, VALID_REQUIREMENTS);
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe('invalid_exact_evm_payload_authorization_value_mismatch');
  });

  it('rejects garbage signature', async () => {
    const payload = await buildValidPayload();
    const tampered = JSON.parse(JSON.stringify(payload)) as PaymentPayload;
    tampered.payload.signature = `0x${'0'.repeat(130)}` as Hex;
    const result = await verifyPayment(tampered, VALID_REQUIREMENTS);
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe('invalid_exact_evm_payload_signature');
  });

  it('rejects wrong x402Version on payload', async () => {
    const payload = await buildValidPayload();
    const bad = { ...payload, x402Version: 1 } as PaymentPayload;
    const result = await verifyPayment(bad, VALID_REQUIREMENTS);
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe('invalid_x402_version');
  });
});

describe('paymentRequiredV2', () => {
  it('builds a canonical V2 PaymentRequired body', () => {
    const body = paymentRequiredV2({
      resourceUrl: 'https://tensorfeed.ai/api/premium/x',
      description: 'Premium endpoint',
      amountAtomic: '20000',
      payTo: PAY_TO,
    });
    expect(body.x402Version).toBe(2);
    expect(body.accepts).toHaveLength(1);
    expect(body.accepts[0].scheme).toBe('exact');
    expect(body.accepts[0].network).toBe('eip155:8453');
    expect(body.accepts[0].amount).toBe('20000');
    expect(body.accepts[0].asset.toLowerCase()).toBe(
      X402_CONSTANTS.USDC_BASE_MAINNET.toLowerCase(),
    );
    expect(body.accepts[0].payTo).toBe(PAY_TO);
    expect(body.accepts[0].maxTimeoutSeconds).toBe(60);
    // Resource URL echoed at top-level + inside extra per x402-surface-check
    // P2 (pay-skills PR #68, 2026-05-14).
    expect(body.accepts[0].resource).toBe('https://tensorfeed.ai/api/premium/x');
    expect(body.accepts[0].extra).toEqual({
      name: 'USD Coin',
      version: '2',
      resource: 'https://tensorfeed.ai/api/premium/x',
    });
    expect(body.extensions).toEqual({});
  });

  it('lets caller override maxTimeoutSeconds and error', () => {
    const body = paymentRequiredV2({
      resourceUrl: 'https://example.com/x',
      description: 'd',
      amountAtomic: '1',
      payTo: PAY_TO,
      maxTimeoutSeconds: 120,
      error: 'custom error',
    });
    expect(body.accepts[0].maxTimeoutSeconds).toBe(120);
    expect(body.error).toBe('custom error');
  });
});

describe('encodeSettlementHeader', () => {
  it('encodes a successful settlement to base64 JSON', () => {
    const encoded = encodeSettlementHeader({
      success: true,
      payer: TEST_ADDR,
      transaction: '0xabc',
      network: 'eip155:8453',
      amount: '20000',
    });
    const decoded = JSON.parse(atob(encoded));
    expect(decoded.success).toBe(true);
    expect(decoded.payer).toBe(TEST_ADDR);
    expect(decoded.transaction).toBe('0xabc');
    expect(decoded.network).toBe('eip155:8453');
  });

  it('encodes an error settlement', () => {
    const encoded = encodeSettlementHeader({
      success: false,
      errorReason: 'invalid_transaction_state',
      message: 'reverted',
    });
    const decoded = JSON.parse(atob(encoded));
    expect(decoded.success).toBe(false);
    expect(decoded.errorReason).toBe('invalid_transaction_state');
  });
});

describe('round-trip: parse then verify', () => {
  it('parses an encoded payload and verifies it successfully', async () => {
    const payload = await buildValidPayload();
    const encoded = encode(payload);
    const parsed = parseXPaymentHeader(encoded);
    expect(parsed).not.toBeNull();
    const result = await verifyPayment(parsed!, VALID_REQUIREMENTS);
    expect(result.isValid).toBe(true);
    expect(result.payer?.toLowerCase()).toBe(TEST_ADDR.toLowerCase());
  });
});

describe('getX402Config', () => {
  it('returns mainnet config by default when env is undefined', () => {
    const cfg = getX402Config(undefined);
    expect(cfg.chainId).toBe(8453);
    expect(cfg.network).toBe('eip155:8453');
  });

  it('returns mainnet config when X402_NETWORK is unset', () => {
    const cfg = getX402Config({ X402_NETWORK: undefined });
    expect(cfg.chainId).toBe(8453);
  });

  it('returns mainnet config when X402_NETWORK is "mainnet"', () => {
    const cfg = getX402Config({ X402_NETWORK: 'mainnet' });
    expect(cfg.chainId).toBe(8453);
    expect(cfg.network).toBe('eip155:8453');
  });

  it('returns sepolia config when X402_NETWORK is "sepolia"', () => {
    const cfg = getX402Config({ X402_NETWORK: 'sepolia' });
    expect(cfg.chainId).toBe(84532);
    expect(cfg.network).toBe('eip155:84532');
    expect(cfg.usdcAddress.toLowerCase()).toBe(
      '0x036CbD53842c5426634e7929541eC2318f3dCF7e'.toLowerCase(),
    );
  });

  it('case-insensitive on the X402_NETWORK value', () => {
    expect(getX402Config({ X402_NETWORK: 'SEPOLIA' }).chainId).toBe(84532);
    expect(getX402Config({ X402_NETWORK: 'Sepolia' }).chainId).toBe(84532);
  });
});

describe('Sepolia network signature flow', () => {
  const SEPOLIA_REQUIREMENTS: PaymentRequirements = {
    scheme: 'exact',
    network: SEPOLIA_CONFIG.network,
    amount: VALID_AMOUNT,
    asset: SEPOLIA_CONFIG.usdcAddress,
    payTo: PAY_TO,
    maxTimeoutSeconds: 60,
    extra: { name: 'USDC', version: '2' },
  };

  async function signSepolia(opts: {
    to: Address;
    value: string;
    validAfter: string;
    validBefore: string;
    nonce: Hex;
  }): Promise<Hex> {
    return TEST_ACCOUNT.signTypedData({
      domain: SEPOLIA_CONFIG.domain,
      types: X402_CONSTANTS.TRANSFER_WITH_AUTH_TYPES,
      primaryType: 'TransferWithAuthorization',
      message: {
        from: TEST_ADDR,
        to: opts.to,
        value: BigInt(opts.value),
        validAfter: BigInt(opts.validAfter),
        validBefore: BigInt(opts.validBefore),
        nonce: opts.nonce,
      },
    });
  }

  async function buildSepoliaPayload(): Promise<PaymentPayload> {
    const now = nowSecs();
    const auth = {
      from: TEST_ADDR,
      to: PAY_TO,
      value: VALID_AMOUNT,
      validAfter: String(now - 60),
      validBefore: String(now + 600),
      nonce: NONCE_B,
    };
    const signature = await signSepolia(auth);
    return {
      x402Version: 2,
      accepted: SEPOLIA_REQUIREMENTS,
      payload: { signature, authorization: auth },
      extensions: {},
    };
  }

  it('verifies a Sepolia-signed authorization under SEPOLIA_CONFIG', async () => {
    const payload = await buildSepoliaPayload();
    const result = await verifyPayment(
      payload,
      SEPOLIA_REQUIREMENTS,
      undefined,
      SEPOLIA_CONFIG,
    );
    expect(result.isValid).toBe(true);
    expect(result.payer?.toLowerCase()).toBe(TEST_ADDR.toLowerCase());
  });

  it('rejects a Sepolia-signed authorization replayed under mainnet domain (signature recovery to wrong addr)', async () => {
    // Security property: a Sepolia-signed authorization cannot be replayed
    // against mainnet because EIP-712 domain separation makes the recovered
    // signer differ from auth.from. The verifier (using MAINNET_CONFIG)
    // recovers a non-matching address and rejects.
    const payload = await buildSepoliaPayload();
    const result = await verifyPayment(payload, VALID_REQUIREMENTS);
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe('invalid_exact_evm_payload_signature');
  });

  it('rejects a Sepolia-signed authorization under mainnet requirements (network mismatch when requirements are sepolia)', async () => {
    // The verifier compares requirements.network against config.network.
    // When config is mainnet but requirements are sepolia (mismatched
    // requirements built incorrectly), the network check fires first.
    const payload = await buildSepoliaPayload();
    const result = await verifyPayment(payload, SEPOLIA_REQUIREMENTS);
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe('invalid_network');
  });

  it('rejects a mainnet-signed authorization under SEPOLIA_CONFIG (signature recovers to wrong addr)', async () => {
    // Sign with mainnet domain, try to verify under Sepolia config + sepolia
    // requirements. Signature recovery will succeed but recover to a
    // different address than auth.from, because the domain hash differs.
    const payload = await buildValidPayload({ nonce: NONCE_A });
    const tampered: PaymentPayload = {
      ...payload,
      accepted: SEPOLIA_REQUIREMENTS,
    };
    const result = await verifyPayment(
      tampered,
      SEPOLIA_REQUIREMENTS,
      undefined,
      SEPOLIA_CONFIG,
    );
    expect(result.isValid).toBe(false);
    expect(result.invalidReason).toBe('invalid_exact_evm_payload_signature');
  });
});

describe('paymentRequiredV2 with Sepolia config', () => {
  it('emits a Sepolia-shaped PaymentRequired body', () => {
    const body = paymentRequiredV2({
      resourceUrl: 'https://test.tensorfeed.ai/api/premium/x',
      description: 'Sepolia test',
      amountAtomic: '20000',
      payTo: PAY_TO,
      config: SEPOLIA_CONFIG,
    });
    expect(body.accepts[0].network).toBe('eip155:84532');
    expect(body.accepts[0].asset.toLowerCase()).toBe(
      SEPOLIA_CONFIG.usdcAddress.toLowerCase(),
    );
  });
});
