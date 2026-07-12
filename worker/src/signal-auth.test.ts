import { describe, it, expect, beforeAll } from 'vitest';
import {
  verifyCredentials,
  createSession,
  verifySession,
  buildSessionCookie,
  clearSessionCookie,
  readCookie,
  COOKIE_NAME,
  SESSION_MAX_AGE_SEC,
} from './signal-auth';

// Independent re-implementation of the 6-round PBKDF2 chain and the HMAC token
// format, used to mint fixtures the way hash-a-password.mjs and createSession
// do. If signal-auth's verify agrees with these independently-produced values,
// the stored-hash and cookie formats are correct.
const subtle = crypto.subtle;
const enc = new TextEncoder();

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}
function bytesToHex(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += b.toString(16).padStart(2, '0');
  return s;
}
function b64url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
async function mintHash(password: string, salt: Uint8Array): Promise<string> {
  let block: Uint8Array = enc.encode(password);
  for (let i = 0; i < 6; i++) {
    const key = await subtle.importKey('raw', block, 'PBKDF2', false, ['deriveBits']);
    const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 }, key, 256);
    block = new Uint8Array(bits);
  }
  return bytesToHex(block);
}
async function craftToken(secret: string, email: string, expMs: number): Promise<string> {
  const payload = `${email.toLowerCase()}|${expMs}`;
  const key = await subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = b64url(new Uint8Array(await subtle.sign('HMAC', key, enc.encode(payload))));
  return `${b64url(enc.encode(payload))}.${sig}`;
}

const SALT_HEX = '00112233445566778899aabbccddeeff';
const PASSWORD = 'correct horse battery staple pizza-robot';
const EMAIL = 'evan@tensorfeed.ai';
const SECRET = 'a'.repeat(32); // >= 16 chars
let USERS = '';

beforeAll(async () => {
  const hashHex = await mintHash(PASSWORD, hexToBytes(SALT_HEX));
  USERS = `${EMAIL}:${SALT_HEX}:${hashHex}`;
});

describe('verifyCredentials', () => {
  it('accepts the correct email + password against an independently-minted hash', async () => {
    expect(await verifyCredentials(USERS, EMAIL, PASSWORD)).toBe(true);
  });
  it('is email case-insensitive', async () => {
    expect(await verifyCredentials(USERS, 'EVAN@TensorFeed.ai', PASSWORD)).toBe(true);
  });
  it('rejects a wrong password', async () => {
    expect(await verifyCredentials(USERS, EMAIL, 'wrong password')).toBe(false);
  });
  it('rejects an unknown email', async () => {
    expect(await verifyCredentials(USERS, 'nobody@tensorfeed.ai', PASSWORD)).toBe(false);
  });
  it('fails closed when CONSOLE_USERS is empty or malformed', async () => {
    expect(await verifyCredentials('', EMAIL, PASSWORD)).toBe(false);
    expect(await verifyCredentials('not-a-valid-entry', EMAIL, PASSWORD)).toBe(false);
  });
});

describe('createSession / verifySession', () => {
  it('round-trips a freshly minted session to the authenticated email', async () => {
    const token = await createSession(SECRET, EMAIL);
    expect(token).toContain('.');
    expect(await verifySession(SECRET, token)).toBe(EMAIL);
  });
  it('rejects a token signed with a different secret', async () => {
    const token = await createSession(SECRET, EMAIL);
    expect(await verifySession('b'.repeat(32), token)).toBeNull();
  });
  it('rejects a tampered signature', async () => {
    const token = await createSession(SECRET, EMAIL);
    const flipped = token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A');
    expect(await verifySession(SECRET, flipped)).toBeNull();
  });
  it('rejects a tampered payload (forged email)', async () => {
    const token = await createSession(SECRET, EMAIL);
    const sig = token.slice(token.lastIndexOf('.'));
    const forgedPayload = b64url(enc.encode('attacker@evil.com|' + (Date.now() + 1_000_000)));
    expect(await verifySession(SECRET, forgedPayload + sig)).toBeNull();
  });
  it('rejects an expired token even with a valid signature', async () => {
    const expired = await craftToken(SECRET, EMAIL, Date.now() - 1000);
    expect(await verifySession(SECRET, expired)).toBeNull();
  });
  it('accepts a not-yet-expired crafted token with a valid signature', async () => {
    const live = await craftToken(SECRET, EMAIL, Date.now() + 60_000);
    expect(await verifySession(SECRET, live)).toBe(EMAIL);
  });
  it('fails closed on a missing or too-short session secret', async () => {
    expect(await createSession('', EMAIL)).toBe('');
    expect(await createSession('short', EMAIL)).toBe('');
    const token = await createSession(SECRET, EMAIL);
    expect(await verifySession('', token)).toBeNull();
    expect(await verifySession('short', token)).toBeNull();
  });
  it('rejects empty or malformed tokens', async () => {
    expect(await verifySession(SECRET, undefined)).toBeNull();
    expect(await verifySession(SECRET, '')).toBeNull();
    expect(await verifySession(SECRET, 'no-dot-here')).toBeNull();
    expect(await verifySession(SECRET, '.onlysig')).toBeNull();
  });
});

describe('cookie helpers', () => {
  it('builds a hardened session cookie', () => {
    const c = buildSessionCookie('tok123');
    expect(c).toContain(`${COOKIE_NAME}=tok123`);
    expect(c).toContain('HttpOnly');
    expect(c).toContain('Secure');
    expect(c).toContain('SameSite=Lax');
    expect(c).toContain('Path=/');
    expect(c).toContain(`Max-Age=${SESSION_MAX_AGE_SEC}`);
  });
  it('clears the cookie with Max-Age=0, still hardened', () => {
    const c = clearSessionCookie();
    expect(c).toContain(`${COOKIE_NAME}=;`);
    expect(c).toContain('Max-Age=0');
    expect(c).toContain('HttpOnly');
    expect(c).toContain('Secure');
  });
  it('reads a named cookie out of a multi-cookie header', () => {
    const header = `foo=bar; ${COOKIE_NAME}=abc.def; baz=qux`;
    expect(readCookie(header, COOKIE_NAME)).toBe('abc.def');
    expect(readCookie(header, 'missing')).toBeNull();
    expect(readCookie(null, COOKIE_NAME)).toBeNull();
  });
});
