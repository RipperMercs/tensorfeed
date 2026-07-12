/**
 * Signal console auth. WebCrypto only (Workers-safe), no database, fail-closed
 * when secrets are missing. Ported from the VR.org Vantage console auth, with
 * the primitives adapted for the edge:
 *
 *   scryptSync      -> PBKDF2 via crypto.subtle.deriveBits
 *   createHmac      -> HMAC-SHA256 via crypto.subtle.sign
 *   timingSafeEqual -> constantTimeEqual() below (WebCrypto has none)
 *
 * Work factor: Cloudflare Workers hard-caps PBKDF2 at 100,000 iterations per
 * deriveBits call (workerd rejects higher with NotSupportedError). To reach the
 * OWASP 2023 target of 600,000 for PBKDF2-SHA256 anyway, the derivation chains 6
 * rounds of 100,000, feeding each round's output into the next as key material.
 * hash-a-password.mjs performs the identical 6-round chain, so the stored hash
 * verifies. Login is a rare, single-account path, so the extra CPU is immaterial.
 *
 * These functions are ASYNC (WebCrypto is async). Await them in the handlers.
 *
 * Secrets (via `wrangler secret put`, never in the repo), read off env:
 *   CONSOLE_USERS          = "email:saltHex:pbkdf2HashHex,..."
 *   CONSOLE_SESSION_SECRET = random hex string used to HMAC-sign the cookie
 */

export const COOKIE_NAME = 'signal_session';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const SESSION_MAX_AGE_SEC = Math.floor(SESSION_TTL_MS / 1000);

// PBKDF2 parameters. Keep these identical to hash-a-password.mjs or hashes will
// not verify. 6 rounds of 100k (the Workers per-call ceiling) is 600k effective.
const PBKDF2_ROUND_ITERATIONS = 100_000;
const PBKDF2_ROUNDS = 6;
const KEYLEN_BITS = 256; // 32 bytes

interface UserRecord {
  saltHex: string;
  hashHex: string;
}

function loadUsers(consoleUsers: string): Map<string, UserRecord> {
  const users = new Map<string, UserRecord>();
  for (const entry of (consoleUsers || '').split(',')) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const [email, saltHex, hashHex] = trimmed.split(':');
    if (email && saltHex && hashHex) {
      users.set(email.trim().toLowerCase(), { saltHex, hashHex });
    }
  }
  return users;
}

// hex and base64url helpers (no Buffer at the edge)
function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function b64urlEncode(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function utf8(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

// Constant-time comparison. WebCrypto has no timingSafeEqual, so compare byte by
// byte with no early exit. A length mismatch returns false immediately, which
// leaks only the length, never the content.
function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function pbkdf2(password: string, salt: Uint8Array): Promise<Uint8Array> {
  // Chain PBKDF2_ROUNDS derivations, each at the Workers per-call cap, to reach
  // the 600k-iteration OWASP target without exceeding the per-call limit.
  let block: Uint8Array = utf8(password);
  for (let round = 0; round < PBKDF2_ROUNDS; round++) {
    const key = await crypto.subtle.importKey('raw', block, 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ROUND_ITERATIONS },
      key,
      KEYLEN_BITS,
    );
    block = new Uint8Array(bits);
  }
  return block;
}

export async function verifyCredentials(consoleUsers: string, email: string, password: string): Promise<boolean> {
  const record = loadUsers(consoleUsers).get(String(email || '').trim().toLowerCase());
  if (!record) return false;
  try {
    const derived = await pbkdf2(password, hexToBytes(record.saltHex));
    return constantTimeEqual(derived, hexToBytes(record.hashHex));
  } catch {
    return false;
  }
}

async function hmac(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', utf8(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, utf8(payload)));
  return b64urlEncode(sig);
}

export async function createSession(secret: string, email: string): Promise<string> {
  if (!secret || secret.length < 16) return '';
  const payload = `${email.trim().toLowerCase()}|${Date.now() + SESSION_TTL_MS}`;
  const encoded = b64urlEncode(utf8(payload));
  const sig = await hmac(payload, secret);
  return `${encoded}.${sig}`;
}

// Returns the authenticated email if the token is valid and unexpired, else null.
export async function verifySession(secret: string, token: string | undefined | null): Promise<string | null> {
  if (!token || !secret || secret.length < 16) return null;

  const dot = token.lastIndexOf('.');
  if (dot < 1) return null;

  const encoded = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);

  let payload: string;
  try {
    const b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    payload = new TextDecoder().decode(bytes);
  } catch {
    return null;
  }

  const expectedSig = await hmac(payload, secret);
  if (!constantTimeEqual(utf8(providedSig), utf8(expectedSig))) return null;

  const sep = payload.lastIndexOf('|');
  if (sep < 1) return null;
  const email = payload.slice(0, sep);
  const exp = Number(payload.slice(sep + 1));
  if (!email || !Number.isFinite(exp) || Date.now() > exp) return null;

  return email;
}

// Build the Set-Cookie value for a fresh session. Secure is hardcoded true (the
// site is HTTPS-only through Cloudflare and process.env.NODE_ENV is unreliable at
// the edge). HttpOnly blocks JS access; SameSite=Lax is enough given the login is
// a low-impact CSRF target.
export function buildSessionCookie(token: string): string {
  return `${COOKIE_NAME}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_MAX_AGE_SEC}`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

// Extract a named cookie value from a Cookie header. Returns null when absent.
export function readCookie(cookieHeader: string | null, name: string): string | null {
  if (!cookieHeader) return null;
  for (const part of cookieHeader.split(';')) {
    const eq = part.indexOf('=');
    if (eq < 1) continue;
    if (part.slice(0, eq).trim() === name) return part.slice(eq + 1).trim();
  }
  return null;
}
