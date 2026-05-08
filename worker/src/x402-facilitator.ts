/**
 * Standards-compliant Coinbase x402 V2 facilitator (exact scheme on EVM).
 *
 * Spec: github.com/coinbase/x402/specs/x402-specification-v2.md
 *
 * Wire format the agent submits in the X-PAYMENT header (base64-encoded JSON):
 *   {
 *     x402Version: 2,
 *     resource: { url, description, mimeType }?,
 *     accepted: PaymentRequirements,
 *     payload: {
 *       signature: 0x<65-byte ECDSA sig>,
 *       authorization: {
 *         from, to, value, validAfter, validBefore, nonce
 *       }
 *     },
 *     extensions: {}?
 *   }
 *
 * The authorization is an EIP-3009 transferWithAuthorization signed by the
 * payer. The facilitator (1) verifies the EIP-712 signature against USDC's
 * domain on Base mainnet, (2) checks parameter alignment with the publisher's
 * PaymentRequirements, (3) submits transferWithAuthorization on the USDC
 * contract from a hot wallet (paying gas in Base ETH; USDC moves from->to).
 *
 * Idempotency: USDC enforces (from, nonce) uniqueness on-chain. We also
 * pre-stake a KV marker pay:x402:auth:{from}:{nonce} so concurrent identical
 * authorizations don't double-broadcast (wastes gas; second tx reverts).
 */

import {
  createPublicClient,
  createWalletClient,
  http,
  encodeFunctionData,
  recoverTypedDataAddress,
  parseSignature,
  isAddress,
  isHex,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import type { Env } from './types';

const USDC_BASE_MAINNET: Address = '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';
const BASE_CHAIN_ID = 8453;
const NETWORK_CAIP2 = 'eip155:8453';
const USDC_DECIMALS = 6;

const USDC_DOMAIN = {
  name: 'USDC',
  version: '2',
  chainId: BASE_CHAIN_ID,
  verifyingContract: USDC_BASE_MAINNET,
} as const;

const TRANSFER_WITH_AUTH_TYPES = {
  TransferWithAuthorization: [
    { name: 'from', type: 'address' },
    { name: 'to', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'validAfter', type: 'uint256' },
    { name: 'validBefore', type: 'uint256' },
    { name: 'nonce', type: 'bytes32' },
  ],
} as const;

const USDC_ABI = [
  {
    name: 'transferWithAuthorization',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'v', type: 'uint8' },
      { name: 'r', type: 'bytes32' },
      { name: 's', type: 'bytes32' },
    ],
    outputs: [],
  },
  {
    name: 'authorizationState',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'authorizer', type: 'address' },
      { name: 'nonce', type: 'bytes32' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const;

export interface AuthorizationFields {
  from: Address;
  to: Address;
  value: string;
  validAfter: string;
  validBefore: string;
  nonce: Hex;
}

export interface PaymentPayload {
  x402Version: number;
  resource?: { url?: string; description?: string; mimeType?: string };
  accepted?: PaymentRequirements;
  payload: {
    signature: Hex;
    authorization: AuthorizationFields;
  };
  extensions?: Record<string, unknown>;
}

export interface PaymentRequirements {
  scheme: string;
  network: string;
  amount: string;
  asset: string;
  payTo: Address;
  maxTimeoutSeconds: number;
  extra?: { name?: string; version?: string };
}

// Canonical x402 V2 error codes (do not invent custom names; spec-exact).
export type FacilitatorErrorCode =
  | 'invalid_payload'
  | 'invalid_x402_version'
  | 'invalid_scheme'
  | 'invalid_network'
  | 'invalid_payment_requirements'
  | 'invalid_exact_evm_payload_signature'
  | 'invalid_exact_evm_payload_recipient_mismatch'
  | 'invalid_exact_evm_payload_authorization_value_mismatch'
  | 'invalid_exact_evm_payload_authorization_valid_after'
  | 'invalid_exact_evm_payload_authorization_valid_before'
  | 'invalid_transaction_state'
  | 'unsupported_scheme'
  | 'insufficient_funds'
  | 'unexpected_verify_error'
  | 'unexpected_settle_error';

export interface VerifyResult {
  isValid: boolean;
  invalidReason?: FacilitatorErrorCode;
  payer?: string;
  message?: string;
}

export interface SettleResult {
  success: boolean;
  errorReason?: FacilitatorErrorCode;
  payer?: string;
  transaction?: string;
  network?: string;
  amount?: string;
  message?: string;
}

// ---------- header parsing ----------

/**
 * Decodes the X-PAYMENT header value (base64-encoded JSON) into a
 * structurally-valid PaymentPayload. Returns null on malformed input;
 * does NOT verify the signature here.
 */
export function parseXPaymentHeader(headerValue: string): PaymentPayload | null {
  if (!headerValue || typeof headerValue !== 'string') return null;
  // Reasonable upper bound: a 65-byte sig + 6-field auth + envelope
  // base64-encodes to well under 4KB. Reject larger inputs without parse.
  if (headerValue.length > 8192) return null;
  let json: string;
  try {
    json = atob(headerValue.trim());
  } catch {
    return null;
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const p = parsed as Record<string, unknown>;
  if (p.x402Version !== 2) return null;
  const inner = p.payload as Record<string, unknown> | undefined;
  if (!inner || typeof inner !== 'object') return null;
  const sig = inner.signature;
  const auth = inner.authorization as Record<string, unknown> | undefined;
  if (typeof sig !== 'string' || !isHex(sig)) return null;
  if (!auth || typeof auth !== 'object') return null;
  const required = ['from', 'to', 'value', 'validAfter', 'validBefore', 'nonce'] as const;
  for (const k of required) {
    if (typeof auth[k] !== 'string') return null;
  }
  if (!isAddress(auth.from as string)) return null;
  if (!isAddress(auth.to as string)) return null;
  if (!isHex(auth.nonce as string)) return null;
  // Numeric-string sanity (decimal, no leading zeros aside from "0", no negatives)
  for (const k of ['value', 'validAfter', 'validBefore'] as const) {
    const v = auth[k] as string;
    if (!/^\d+$/.test(v)) return null;
  }
  // 32-byte nonce check
  const nonceHex = auth.nonce as string;
  if (nonceHex.length !== 66) return null;
  return parsed as PaymentPayload;
}

// ---------- verification ----------

/**
 * Verifies the signed authorization against the publisher's PaymentRequirements.
 * Performs spec-defined checks (signature, parameter matching, time window)
 * but NOT balance verification or transaction simulation; settlement attempt
 * surfaces those as errorReason.
 */
export async function verifyPayment(
  payment: PaymentPayload,
  requirements: PaymentRequirements,
  nowUnixSecs: number = Math.floor(Date.now() / 1000),
): Promise<VerifyResult> {
  if (payment.x402Version !== 2) {
    return { isValid: false, invalidReason: 'invalid_x402_version' };
  }
  if (requirements.scheme !== 'exact') {
    return { isValid: false, invalidReason: 'unsupported_scheme' };
  }
  if (requirements.network !== NETWORK_CAIP2) {
    return { isValid: false, invalidReason: 'invalid_network' };
  }
  if (
    !requirements.asset ||
    requirements.asset.toLowerCase() !== USDC_BASE_MAINNET.toLowerCase()
  ) {
    return { isValid: false, invalidReason: 'invalid_payment_requirements' };
  }
  if (!isAddress(requirements.payTo)) {
    return { isValid: false, invalidReason: 'invalid_payment_requirements' };
  }

  const auth = payment.payload.authorization;

  // Parameter matching: recipient must equal the publisher's payTo.
  if (auth.to.toLowerCase() !== requirements.payTo.toLowerCase()) {
    return { isValid: false, invalidReason: 'invalid_exact_evm_payload_recipient_mismatch' };
  }

  // Value must equal the required amount (exact scheme: no overpay/underpay).
  // BigInt comparison to avoid string-shape issues with leading zeros etc.
  let authValue: bigint;
  let reqValue: bigint;
  try {
    authValue = BigInt(auth.value);
    reqValue = BigInt(requirements.amount);
  } catch {
    return { isValid: false, invalidReason: 'invalid_payload' };
  }
  if (authValue !== reqValue) {
    return {
      isValid: false,
      invalidReason: 'invalid_exact_evm_payload_authorization_value_mismatch',
    };
  }

  // Time window: validAfter <= now <= validBefore.
  let validAfter: bigint;
  let validBefore: bigint;
  try {
    validAfter = BigInt(auth.validAfter);
    validBefore = BigInt(auth.validBefore);
  } catch {
    return { isValid: false, invalidReason: 'invalid_payload' };
  }
  if (BigInt(nowUnixSecs) < validAfter) {
    return { isValid: false, invalidReason: 'invalid_exact_evm_payload_authorization_valid_after' };
  }
  if (BigInt(nowUnixSecs) > validBefore) {
    return {
      isValid: false,
      invalidReason: 'invalid_exact_evm_payload_authorization_valid_before',
    };
  }

  // Signature: recover the typed-data signer and require it to match auth.from.
  let recovered: Address;
  try {
    recovered = await recoverTypedDataAddress({
      domain: USDC_DOMAIN,
      types: TRANSFER_WITH_AUTH_TYPES,
      primaryType: 'TransferWithAuthorization',
      message: {
        from: auth.from,
        to: auth.to,
        value: authValue,
        validAfter: validAfter,
        validBefore: validBefore,
        nonce: auth.nonce,
      },
      signature: payment.payload.signature,
    });
  } catch {
    return { isValid: false, invalidReason: 'invalid_exact_evm_payload_signature' };
  }
  if (recovered.toLowerCase() !== auth.from.toLowerCase()) {
    return { isValid: false, invalidReason: 'invalid_exact_evm_payload_signature' };
  }

  return { isValid: true, payer: auth.from };
}

// ---------- on-chain helpers ----------

function rpcUrl(env: Env): string {
  return env.BASE_RPC_URL || 'https://mainnet.base.org';
}

function getPublicClient(env: Env): PublicClient {
  return createPublicClient({
    chain: base,
    transport: http(rpcUrl(env)),
  }) as PublicClient;
}

function getWalletClient(env: Env): WalletClient | null {
  const key = env.X402_BROADCAST_KEY;
  if (!key) return null;
  const normalized = (key.startsWith('0x') ? key : `0x${key}`) as Hex;
  if (!isHex(normalized) || normalized.length !== 66) return null;
  const account = privateKeyToAccount(normalized);
  return createWalletClient({
    account,
    chain: base,
    transport: http(rpcUrl(env)),
  });
}

/**
 * Reads the USDC authorizationState mapping to confirm the (from, nonce)
 * pair has not been consumed yet on-chain. EIP-3009 prevents replay at the
 * contract layer; this read is a pre-broadcast cheap rejection.
 */
async function isNonceUnused(env: Env, from: Address, nonce: Hex): Promise<boolean | null> {
  try {
    const client = getPublicClient(env);
    const used = (await client.readContract({
      address: USDC_BASE_MAINNET,
      abi: USDC_ABI,
      functionName: 'authorizationState',
      args: [from, nonce],
    })) as boolean;
    return !used;
  } catch {
    return null;
  }
}

// ---------- KV idempotency ----------

const X402_AUTH_KEY_PREFIX = 'pay:x402:auth:';
const X402_AUTH_TTL_SECONDS = 7 * 24 * 60 * 60;

interface AuthClaim {
  tx_hash?: string;
  claimed_at: string;
  pending: boolean;
}

function authKey(from: Address, nonce: Hex): string {
  return `${X402_AUTH_KEY_PREFIX}${from.toLowerCase()}:${nonce.toLowerCase()}`;
}

async function readAuthClaim(env: Env, from: Address, nonce: Hex): Promise<AuthClaim | null> {
  return (await env.TENSORFEED_CACHE.get(authKey(from, nonce), 'json')) as AuthClaim | null;
}

async function stakeAuthClaim(env: Env, from: Address, nonce: Hex): Promise<void> {
  await env.TENSORFEED_CACHE.put(
    authKey(from, nonce),
    JSON.stringify({ pending: true, claimed_at: new Date().toISOString() } satisfies AuthClaim),
    { expirationTtl: 60 },
  );
}

async function recordAuthSettled(
  env: Env,
  from: Address,
  nonce: Hex,
  txHash: string,
): Promise<void> {
  await env.TENSORFEED_CACHE.put(
    authKey(from, nonce),
    JSON.stringify({
      pending: false,
      tx_hash: txHash,
      claimed_at: new Date().toISOString(),
    } satisfies AuthClaim),
    { expirationTtl: X402_AUTH_TTL_SECONDS },
  );
}

// ---------- settlement ----------

/**
 * Submits the verified authorization on-chain via USDC.transferWithAuthorization.
 * Returns the broadcast tx hash on success. Idempotent at the KV layer to
 * avoid double-broadcast (wastes gas; second tx reverts on-chain).
 */
export async function settlePayment(
  payment: PaymentPayload,
  env: Env,
  waitForReceipt: boolean = true,
): Promise<SettleResult> {
  const auth = payment.payload.authorization;

  // Idempotency: if another request already settled this exact (from, nonce),
  // return the existing tx without rebroadcasting.
  const existing = await readAuthClaim(env, auth.from, auth.nonce);
  if (existing) {
    if (existing.tx_hash) {
      return {
        success: true,
        payer: auth.from,
        transaction: existing.tx_hash,
        network: NETWORK_CAIP2,
        amount: auth.value,
      };
    }
    if (existing.pending) {
      return {
        success: false,
        errorReason: 'invalid_transaction_state',
        message: 'This authorization is already in flight; retry briefly.',
      };
    }
  }

  const wallet = getWalletClient(env);
  if (!wallet) {
    return {
      success: false,
      errorReason: 'unexpected_settle_error',
      message: 'Facilitator broadcast wallet is not configured.',
    };
  }

  // On-chain replay-state pre-check (cheap RPC read, saves gas on bad tx).
  const unused = await isNonceUnused(env, auth.from, auth.nonce);
  if (unused === false) {
    return {
      success: false,
      errorReason: 'invalid_transaction_state',
      message: 'EIP-3009 nonce has already been used for this authorizer.',
    };
  }

  await stakeAuthClaim(env, auth.from, auth.nonce);

  let v: number, r: Hex, s: Hex;
  try {
    const split = parseSignature(payment.payload.signature);
    r = split.r;
    s = split.s;
    v = Number(split.v ?? (split.yParity === 0 ? 27 : 28));
  } catch {
    return {
      success: false,
      errorReason: 'invalid_exact_evm_payload_signature',
      message: 'Could not parse 65-byte signature.',
    };
  }

  let txHash: Hex;
  try {
    const data = encodeFunctionData({
      abi: USDC_ABI,
      functionName: 'transferWithAuthorization',
      args: [
        auth.from,
        auth.to,
        BigInt(auth.value),
        BigInt(auth.validAfter),
        BigInt(auth.validBefore),
        auth.nonce,
        v,
        r,
        s,
      ],
    });
    txHash = await wallet.sendTransaction({
      to: USDC_BASE_MAINNET,
      data,
      account: wallet.account!,
      chain: base,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'broadcast failed';
    return {
      success: false,
      errorReason: 'unexpected_settle_error',
      message,
    };
  }

  if (waitForReceipt) {
    try {
      const client = getPublicClient(env);
      const receipt = await client.waitForTransactionReceipt({ hash: txHash, timeout: 30_000 });
      if (receipt.status !== 'success') {
        return {
          success: false,
          errorReason: 'invalid_transaction_state',
          message: `Tx ${txHash} reverted on-chain.`,
          transaction: txHash,
        };
      }
    } catch (err) {
      // Receipt timeout is not necessarily a failure: the tx may still confirm.
      // Record the broadcast and let the caller retry verify if needed.
      await recordAuthSettled(env, auth.from, auth.nonce, txHash);
      return {
        success: true,
        payer: auth.from,
        transaction: txHash,
        network: NETWORK_CAIP2,
        amount: auth.value,
        message: 'broadcast succeeded; receipt pending',
      };
    }
  }

  await recordAuthSettled(env, auth.from, auth.nonce, txHash);
  return {
    success: true,
    payer: auth.from,
    transaction: txHash,
    network: NETWORK_CAIP2,
    amount: auth.value,
  };
}

// ---------- response helpers ----------

/**
 * Builds the canonical PaymentRequired (402) body for the exact scheme on
 * Base mainnet USDC. Drop-in for the publisher's 402 response when no
 * authentication / payment is presented.
 */
export function paymentRequiredV2(opts: {
  resourceUrl: string;
  description: string;
  amountAtomic: string; // micro-USDC (6 decimals)
  payTo: Address;
  maxTimeoutSeconds?: number;
  error?: string;
}): {
  x402Version: 2;
  error: string;
  resource: { url: string; description: string; mimeType: string };
  accepts: PaymentRequirements[];
  extensions: Record<string, unknown>;
} {
  return {
    x402Version: 2,
    error: opts.error ?? 'X-PAYMENT header required',
    resource: {
      url: opts.resourceUrl,
      description: opts.description,
      mimeType: 'application/json',
    },
    accepts: [
      {
        scheme: 'exact',
        network: NETWORK_CAIP2,
        amount: opts.amountAtomic,
        asset: USDC_BASE_MAINNET,
        payTo: opts.payTo,
        maxTimeoutSeconds: opts.maxTimeoutSeconds ?? 60,
        extra: { name: 'USDC', version: '2' },
      },
    ],
    extensions: {},
  };
}

/**
 * Encodes a SettlementResponse for the PAYMENT-RESPONSE response header.
 * Returns base64 of JSON per the spec.
 */
export function encodeSettlementHeader(result: SettleResult): string {
  const body = JSON.stringify({
    success: result.success,
    errorReason: result.errorReason,
    payer: result.payer,
    transaction: result.transaction,
    network: result.network,
    amount: result.amount,
  });
  return btoa(body);
}

export const X402_CONSTANTS = {
  USDC_BASE_MAINNET,
  BASE_CHAIN_ID,
  NETWORK_CAIP2,
  USDC_DECIMALS,
  USDC_DOMAIN,
  TRANSFER_WITH_AUTH_TYPES,
};
