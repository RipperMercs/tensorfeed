/**
 * Solana USDC x402 rail constants. Kept separate from the viem-typed
 * X402Config in x402-facilitator.ts (which carries chain/domain/usdcAddress
 * fields that have no Solana meaning). These values were confirmed live from
 * CDP's /supported endpoint with TensorFeed's own key (see the admin probe at
 * /api/admin/cdp/supported) and against the x402 SVM reference spec.
 *
 * We advertise the x402 v2 network identifier to match TensorFeed's existing
 * Base v2 (eip155:8453) posture. The advertised extra.feePayer MUST be the
 * same-version (v2) feePayer; never pair the v1 feePayer with a v2 network.
 */

// Canonical Solana mainnet USDC SPL mint (6 decimals, same as Base USDC, so the
// micro-USDC amount math carries over unchanged).
export const SOLANA_USDC_MINT = 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v';

// x402 v2 CAIP-2 network id for Solana mainnet (genesis-hash form), exactly as
// CDP returned it from /supported. An SDK docstring elsewhere uses
// "solana:mainnet"; this probe value is the authoritative one.
export const SOLANA_NETWORK_V2 = 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp';

// CDP's v2 Solana fee payer. CDP sponsors the transaction fee (and the
// recipient ATA rent), so the receive wallet needs no SOL to operate.
export const SOLANA_FEEPAYER_V2 = 'GVJJ7rdGiXr5xaYbRwRbjfaJL7fmwRygFi1H6aGqDveb';
