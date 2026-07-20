/**
 * Generic binary recency-watch delta cursor, shared by premium endpoints whose
 * output is an AGGREGATE verdict (not an item-list). An agent passes
 * ?since=<cursor> from a prior paid response; if the underlying data-capture
 * time has not advanced (and the identity key still matches), the poll is
 * unchanged and no-charges. Mirrors the capturedAt gate of whats-new's
 * computeWhatsNewDelta, minus the item-level delta tier.
 *
 * cap = the capture time that gates "did it change" (e.g. an ingest batch time).
 * key = an optional identity binding (e.g. a hash of the caller's lockfile, or a
 *       window shape), so a different input can never get a wrong free poll.
 */
export const DELTA_CURSOR_VERSION = 1;

export interface DeltaCursor {
  v: number;
  cap: string | null;
  key: string | null;
}

// Byte-level base64url helpers so a cursor payload carrying any Unicode (not
// just Latin1) encodes without throwing. btoa alone rejects code points above
// U+00FF, so a raw btoa(JSON.stringify(...)) would throw if a caller ever passed
// a non-ASCII cap or key. For an ASCII payload these produce output byte for
// byte identical to the old btoa form, so cursors issued before this change
// still decode. Kept self-contained (no imports) to keep the module pure.
function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const b64 = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

const CURSOR_ENC = new TextEncoder();
const CURSOR_DEC = new TextDecoder();

/** Opaque, URL-safe base64url JSON. UTF-8 safe: any Unicode in cap/key encodes without throwing. */
export function encodeDeltaCursor(version: number, cap: string | null, key: string | null): string {
  const payload: DeltaCursor = { v: version, cap, key };
  return bytesToBase64Url(CURSOR_ENC.encode(JSON.stringify(payload)));
}

/** Decode a cursor. Returns null on any malformed input or version mismatch. Never throws. */
export function decodeDeltaCursor(raw: string, expectedVersion: number): DeltaCursor | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(CURSOR_DEC.decode(base64UrlToBytes(raw))) as Partial<DeltaCursor>;
    if (obj.v !== expectedVersion) return null;
    if (!(obj.cap === null || typeof obj.cap === 'string')) return null;
    if (!(obj.key === null || typeof obj.key === 'string')) return null;
    return { v: obj.v, cap: obj.cap ?? null, key: obj.key ?? null };
  } catch {
    return null;
  }
}

/**
 * The gate. Returns:
 *   'full'      -> serve and charge the full result (no usable/comparable cursor)
 *   'no_charge' -> capture time unchanged since the cursor (free poll)
 *   'advanced'  -> capture time advanced (binary consumers charge; a future
 *                  item-list consumer could compute a real delta)
 * Favors the customer at every ambiguity by falling back to 'full' (charge), so
 * a forged future cursor cannot buy a free-forever poll.
 */
export function gateDeltaCursor(args: {
  resultCap: string | null;
  cursorCap: string | null;
  resultKey: string | null;
  cursorKey: string | null;
}): 'full' | 'no_charge' | 'advanced' {
  const { resultCap, cursorCap, resultKey, cursorKey } = args;
  if (resultCap === null) return 'full';
  if (cursorKey !== resultKey) return 'full';
  if (cursorCap === null) return 'full';
  const c = Date.parse(cursorCap);
  const r = Date.parse(resultCap);
  if (!Number.isFinite(c) || !Number.isFinite(r)) return 'full';
  if (c > r) return 'full';
  if (c === r) return 'no_charge';
  return 'advanced';
}

export interface DeltaContinuation {
  method: 'GET' | 'POST';
  url: string;
  description: string;
}

/** The exact next call for the poll loop. Null when no cursor was issued. */
export function buildDeltaContinuation(
  method: 'GET' | 'POST',
  path: string,
  cursor: string,
  description: string,
): DeltaContinuation | null {
  if (!cursor) return null;
  const sep = path.includes('?') ? '&' : '?';
  return { method, url: `${path}${sep}since=${cursor}`, description };
}
