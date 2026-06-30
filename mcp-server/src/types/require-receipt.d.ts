// Minimal ambient types for @emilia-protocol/require-receipt (Apache-2.0),
// which ships as JS + JSDoc with no bundled .d.ts. We only declare the small
// surface receipt-gate.ts uses (makeReceiptGate / findActionRequirement /
// RECEIPT_REQUIRED_STATUS); see the package's gate.js / index.js for the full
// JSDoc'd contract.
declare module '@emilia-protocol/require-receipt' {
  export const RECEIPT_REQUIRED_STATUS: number;

  export interface ReceiptGateOptions {
    action: string | ((target: unknown) => string);
    trustedKeys?: string[];
    allowInlineKey?: boolean;
    maxAgeSec?: number;
    allowedOutcomes?: string[];
    statusCode?: number;
    manifestUrl?: string;
    assuranceClass?: string;
    store?: { has: (id: string) => boolean; add: (id: string) => void };
  }

  export interface GateRunSuccess<T> {
    ok: true;
    receiptId: string;
    outcome: string;
    signer: string;
    result: T;
  }
  export interface GateRunRefusal {
    ok: false;
    status: number;
    body: unknown;
  }

  export interface ReceiptGate {
    run<T>(
      receipt: unknown,
      ctx: { target?: unknown },
      fn: (c: { receiptId: string; outcome: string; signer: string }) => Promise<T> | T,
    ): Promise<GateRunSuccess<T> | GateRunRefusal>;
  }

  export function makeReceiptGate(opts: ReceiptGateOptions): ReceiptGate;

  export interface ActionRequirement {
    action_type: string;
    receipt_required: boolean;
    assurance_class?: string;
    max_age_sec?: number;
    [k: string]: unknown;
  }

  export function findActionRequirement(
    manifest: unknown,
    selector: { protocol?: string; tool?: string },
  ): ActionRequirement | undefined;
}
