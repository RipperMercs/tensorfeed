// SPDX-License-Identifier: Apache-2.0
//
// OPT-IN "Receipt Required" gate for the one irreversible, paid action in this
// server: create_watch (registers a webhook + spends a credit). OFF by default.
// With no TENSORFEED_RECEIPT_REQUIRED env var, isReceiptRequired() returns
// false and create_watch behaves exactly as before. When a maintainer opts in,
// create_watch refuses to register the watch unless the call arrives with a
// verifiable EMILIA authorization receipt bound to THIS watch (type +
// callback_url): proof a named human authorized this exact action.
//
// The hard parts (target binding, one-time consumption, sanitized rejections)
// live in the reviewed @emilia-protocol/require-receipt gate; this file only
// wires it to create_watch. See:
//   spec  draft-schrock-ep-authorization-receipts (IETF I-D, not an RFC)
//   docs  https://www.emiliaprotocol.ai/fire-drill/rr-1

import {
  makeReceiptGate,
  findActionRequirement,
  RECEIPT_REQUIRED_STATUS,
  type ReceiptGate,
} from '@emilia-protocol/require-receipt';

// Inline Action Risk Manifest for create_watch. Kept in-process (rather than a
// separate served file) to keep the diff minimal; mirror it at
// /.well-known/agent-actions.json if you want agents to discover it.
const MANIFEST = {
  '@version': 'EP-ACTION-RISK-MANIFEST-v0.1',
  service: { name: 'tensorfeed-mcp', manifest_url: '/.well-known/agent-actions.json' },
  actions: [
    {
      id: 'mcp.create_watch',
      description:
        'Registers a webhook watch and spends 1 paid credit; each fire POSTs to a caller-supplied callback_url for 90 days. Requires a named human authorization receipt.',
      match: { protocol: 'mcp', tool: 'create_watch' },
      action_type: 'tensorfeed.watch.create',
      risk: 'high',
      receipt_required: true,
      assurance_class: 'class_a',
      max_age_sec: 900,
    },
  ],
};

/**
 * Opt-in switch. The gate is a no-op unless TENSORFEED_RECEIPT_REQUIRED is set
 * to a truthy value (1/true/yes/on). Existing deployments keep working with
 * byte-identical behavior.
 */
export function isReceiptRequired(): boolean {
  const v = (process.env.TENSORFEED_RECEIPT_REQUIRED ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

let gate: ReceiptGate | undefined;
function createWatchGate(): ReceiptGate {
  if (!gate) {
    const req = findActionRequirement(MANIFEST, { protocol: 'mcp', tool: 'create_watch' });
    gate = makeReceiptGate({
      action: req?.action_type ?? 'tensorfeed.watch.create',
      // Secure by default: pin issuer SPKI keys via TENSORFEED_RECEIPT_TRUSTED_KEYS.
      // Inline (self-signed) keys are accepted ONLY with an explicit non-prod opt-in
      // (TENSORFEED_RECEIPT_ALLOW_INLINE_KEY); gateCreateWatch fails closed before
      // reaching here if neither is configured.
      trustedKeys: trustedKeysFromEnv(),
      allowInlineKey: trustedKeysFromEnv().length === 0 && allowInlineKeyFromEnv(),
      maxAgeSec: req?.max_age_sec ?? 900,
      statusCode: RECEIPT_REQUIRED_STATUS,
      // Only advertise a manifest URL the server actually serves (set
      // TENSORFEED_RECEIPT_MANIFEST_URL once you mirror it) so the 428 challenge
      // never points agents at a 404.
      manifestUrl: process.env.TENSORFEED_RECEIPT_MANIFEST_URL || undefined,
      assuranceClass: req?.assurance_class,
    });
  }
  return gate;
}

function trustedKeysFromEnv(): string[] {
  return (process.env.TENSORFEED_RECEIPT_TRUSTED_KEYS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Explicit NON-PRODUCTION opt-in to accept self-signed (inline-key) receipts. */
function allowInlineKeyFromEnv(): boolean {
  const v = (process.env.TENSORFEED_RECEIPT_ALLOW_INLINE_KEY ?? '').trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

export interface GateOutcome {
  /** When true, the action ran and the receipt was consumed. */
  ok: boolean;
  /** Human-readable refusal text for the MCP tool result (set when !ok). */
  refusalText?: string;
}

/**
 * Run `perform` behind the create_watch receipt gate, binding the receipt to
 * the specific watch (type + callback_url) so an approval for one watch cannot
 * register another. `perform` MUST throw on failure so a transient error never
 * burns a valid approval. Returns { ok: false, refusalText } when the receipt
 * is missing/forged/replayed/expired; otherwise runs `perform` and returns
 * { ok: true } after consuming the receipt.
 */
export async function gateCreateWatch(
  binding: { type: string; callback_url: string },
  receipt: unknown,
  perform: () => Promise<void>,
): Promise<GateOutcome> {
  // FAIL CLOSED: enforcement is on but no issuer key is trusted and inline keys
  // are not explicitly enabled. Refuse rather than register a watch / spend a
  // credit under a self-signed receipt.
  if (trustedKeysFromEnv().length === 0 && !allowInlineKeyFromEnv()) {
    return {
      ok: false,
      refusalText:
        'Receipt enforcement misconfigured (receipt_enforcement_misconfigured): set '
        + 'TENSORFEED_RECEIPT_TRUSTED_KEYS to the issuer key(s) you trust '
        + '(or TENSORFEED_RECEIPT_ALLOW_INLINE_KEY=1 for non-production demos). '
        + 'Refusing to register a watch / spend a credit under a self-signed receipt.',
    };
  }
  const target = `${binding.type}|${binding.callback_url}`;
  const r = await createWatchGate().run(receipt, { target }, async () => {
    await perform();
  });
  if (r.ok) return { ok: true };

  const reason =
    (r.body as { rejected?: { reason?: string } } | undefined)?.rejected?.reason ?? 'missing';
  return {
    ok: false,
    refusalText:
      `Receipt Required (${RECEIPT_REQUIRED_STATUS}): create_watch is gated by TENSORFEED_RECEIPT_REQUIRED ` +
      `and was refused (${reason}). This action needs a verifiable EMILIA authorization receipt bound to ` +
      `type="${binding.type}" + this callback_url, proving a named human authorized it. Pass it as the ` +
      `authorization_receipt argument. Spec: draft-schrock-ep-authorization-receipts. ` +
      `Details: https://www.emiliaprotocol.ai/fire-drill/rr-1`,
  };
}
