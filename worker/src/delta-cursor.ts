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

/** Opaque, URL-safe base64url JSON. Payload is ASCII (ISO time, short key), so btoa is safe. */
export function encodeDeltaCursor(version: number, cap: string | null, key: string | null): string {
  const payload: DeltaCursor = { v: version, cap, key };
  return btoa(JSON.stringify(payload)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Decode a cursor. Returns null on any malformed input or version mismatch. Never throws. */
export function decodeDeltaCursor(raw: string, expectedVersion: number): DeltaCursor | null {
  if (!raw) return null;
  try {
    const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
    const obj = JSON.parse(atob(b64)) as Partial<DeltaCursor>;
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
  return { method, url: `${path}?since=${cursor}`, description };
}
