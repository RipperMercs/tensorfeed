import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  validateHeadline,
  validateHref,
  buildAlert,
  filterActiveAlert,
  HEADLINE_MAX,
  setBreaking,
  clearBreaking,
  readRawBreaking,
  getBreakingAudit,
} from './breaking';
import { installFakeCache, InstalledCache } from './edge-cache-test-helpers';

const EM_DASH = String.fromCharCode(0x2014);
const EN_DASH = String.fromCharCode(0x2013);
const BELL = String.fromCharCode(0x07);

describe('validateHeadline', () => {
  it('accepts clean text', () => {
    expect(validateHeadline('Anthropic filed a confidential S-1 with the SEC')).toEqual({
      ok: true,
      value: 'Anthropic filed a confidential S-1 with the SEC',
    });
  });
  it('rejects empty / non-string', () => {
    expect(validateHeadline('').ok).toBe(false);
    expect(validateHeadline('   ').ok).toBe(false);
    expect(validateHeadline(42 as unknown).ok).toBe(false);
  });
  it('rejects over-length', () => {
    expect(validateHeadline('x'.repeat(HEADLINE_MAX + 1)).ok).toBe(false);
  });
  it('rejects em dash, en dash, and double-hyphen-as-punctuation', () => {
    expect(validateHeadline('A ' + EM_DASH + ' B').ok).toBe(false);
    expect(validateHeadline('A ' + EN_DASH + ' B').ok).toBe(false);
    expect(validateHeadline('A -- B').ok).toBe(false);
  });
  it('rejects control chars', () => {
    expect(validateHeadline('bad' + BELL + 'bell').ok).toBe(false);
  });
});

describe('validateHref', () => {
  it('accepts a same-origin relative path', () => {
    expect(validateHref('/originals/anthropic-confidential-s1-ipo')).toEqual({
      ok: true,
      value: '/originals/anthropic-confidential-s1-ipo',
    });
  });
  it('rejects offsite, scheme, protocol-relative, and backslash', () => {
    expect(validateHref('https://evil.example').ok).toBe(false);
    expect(validateHref('//evil.example').ok).toBe(false);
    expect(validateHref('javascript:alert(1)').ok).toBe(false);
    expect(validateHref('data:text/html,x').ok).toBe(false);
    expect(validateHref('/\\evil').ok).toBe(false);
    expect(validateHref('not-a-path').ok).toBe(false);
  });
});

describe('buildAlert', () => {
  it('mints id, sets published_at to now, expires_at to now + ttl', () => {
    const now = new Date('2026-06-01T10:00:00.000Z');
    const a = buildAlert('headline', '/x', 24, now, 'abcd');
    expect(a.id).toBe(`brk_${now.getTime()}_abcd`);
    expect(a.published_at).toBe('2026-06-01T10:00:00.000Z');
    expect(a.expires_at).toBe('2026-06-02T10:00:00.000Z');
  });
});

describe('filterActiveAlert', () => {
  const valid = {
    id: 'brk_1_x',
    headline: 'h',
    href: '/x',
    published_at: '2026-06-01T10:00:00.000Z',
    expires_at: '2026-06-02T10:00:00.000Z',
  };
  it('returns the alert when not expired', () => {
    expect(filterActiveAlert(valid, new Date('2026-06-01T12:00:00.000Z'))?.id).toBe('brk_1_x');
  });
  it('returns null when expired', () => {
    expect(filterActiveAlert(valid, new Date('2026-06-03T00:00:00.000Z'))).toBeNull();
  });
  it('returns null for null / malformed', () => {
    expect(filterActiveAlert(null, new Date())).toBeNull();
    expect(filterActiveAlert({ id: 5 } as unknown, new Date())).toBeNull();
    expect(filterActiveAlert({ id: 'x', expires_at: 'not-a-date' } as unknown, new Date())).toBeNull();
  });
});

class MemKV {
  store = new Map<string, string>();
  async get(key: string, type?: string) {
    const v = this.store.get(key);
    if (v === undefined) return null;
    return type === 'json' ? JSON.parse(v) : v;
  }
  async put(key: string, value: string) { this.store.set(key, value); }
  async delete(key: string) { this.store.delete(key); }
}
function makeBreakingEnv() {
  return {
    TENSORFEED_CACHE: new MemKV(),
    TENSORFEED_NEWS: new MemKV(),
    TENSORFEED_STATUS: new MemKV(),
  } as unknown as import('./types').Env;
}

describe('setBreaking / readRawBreaking / clearBreaking / audit', () => {
  let installedCache: InstalledCache;
  beforeEach(() => {
    installedCache = installFakeCache();
  });
  afterEach(() => {
    installedCache.uninstall();
  });

  it('writes the alert directly to KV and records a set audit entry', async () => {
    const env = makeBreakingEnv();
    const alert = buildAlert('Headline', '/x', 24, new Date('2026-06-01T10:00:00.000Z'), 'r1');
    await setBreaking(env, alert);
    expect((await readRawBreaking(env))?.id).toBe(alert.id);
    const audit = await getBreakingAudit(env);
    expect(audit.at(-1)?.action).toBe('set');
    expect(audit.at(-1)?.id).toBe(alert.id);
  });

  it('clear deletes the key and records a clear audit entry', async () => {
    const env = makeBreakingEnv();
    await setBreaking(env, buildAlert('H', '/x', 24, new Date(), 'r2'));
    await clearBreaking(env);
    expect(await readRawBreaking(env)).toBeNull();
    expect((await getBreakingAudit(env)).at(-1)?.action).toBe('clear');
  });

  it('audit ring buffer is capped', async () => {
    const env = makeBreakingEnv();
    for (let i = 0; i < 130; i++) await clearBreaking(env);
    expect((await getBreakingAudit(env)).length).toBeLessThanOrEqual(100);
  });
});
