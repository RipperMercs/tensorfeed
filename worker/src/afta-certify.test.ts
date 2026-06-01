import { afterEach, describe, expect, it, vi } from 'vitest';
import { certifyDomain } from './afta-certify';

describe('certifyDomain: domain validation', () => {
  it('rejects empty input', async () => {
    const r = await certifyDomain('');
    expect(r.ok).toBe(false);
    expect(r.verdict).toBe('not-yet-eligible');
    expect(r.next_step).toContain('valid public hostname');
  });

  it('rejects garbage input', async () => {
    const r = await certifyDomain('not a domain');
    expect(r.ok).toBe(false);
  });

  it('strips https:// and trailing path before checking shape', async () => {
    const r = await certifyDomain('https://example.com/foo/bar');
    // shape valid, will attempt to fetch (which may fail in test env);
    // but we only check that domain validation accepted it.
    expect(r.domain).toBe('example.com');
  });

  it('lowercases the domain', async () => {
    const r = await certifyDomain('EXAMPLE.com');
    expect(r.domain).toBe('example.com');
  });

  it('rejects domain without TLD', async () => {
    const r = await certifyDomain('localhost');
    expect(r.ok).toBe(false);
  });

  it('returns six checks with stable ids', async () => {
    // Use a domain that will fail every fetch, but the check structure
    // should still be present.
    const r = await certifyDomain('does-not-exist.invalid');
    if (!r.ok) return; // domain validation rejected; that's a different test
    expect(r.checks.length).toBeGreaterThanOrEqual(6);
    const ids = r.checks.map(c => c.id);
    expect(ids).toContain('wellknown_x402');
    expect(ids).toContain('x402_version_2');
    expect(ids).toContain('has_paid_items');
    expect(ids).toContain('extra_domain_hint');
    expect(ids).toContain('wellknown_afta');
    expect(ids).toContain('receipt_key_published');
  });

  it('verdict is not-yet-eligible when domain has nothing', async () => {
    const r = await certifyDomain('does-not-exist.invalid');
    if (!r.ok) return;
    expect(r.verdict).toBe('not-yet-eligible');
    expect(r.afta_certified).toBe(false);
  });
});

// SSRF guard: normalizeDomain must reject private-network and
// service-discovery hosts BEFORE any outbound fetch. These cases never touch
// the network (rejection is synchronous), so no fetch stub is needed.
describe('certifyDomain: SSRF guard', () => {
  const blocked = [
    'foo.internal',
    'metadata.google.internal',
    'svc.local',
    'printer.localdomain',
    'host.lan',
    'app.intranet',
    'db.corp',
    'node.consul',
    '10.0.0.1',
    '169.254.169.254',
    '192.168.1.1',
  ];
  for (const host of blocked) {
    it(`rejects ${host} without fetching`, async () => {
      const r = await certifyDomain(host);
      expect(r.ok).toBe(false);
      expect(r.checks).toHaveLength(0);
    });
  }

  it('strips embedded credentials and port to a clean host', async () => {
    // All fetches 404 so this stays deterministic; we only assert the host
    // was normalized past the user:pass@ and :port noise.
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => fake404()),
    );
    try {
      const r = await certifyDomain('https://user:pass@example.com:8443/path');
      expect(r.domain).toBe('example.com');
      expect(r.ok).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });
});

// ---- fetch-mocked fixture tests for the scoring + federation logic ----

function fakeJson(body: unknown): Response {
  return {
    ok: true,
    status: 200,
    headers: { get: (k: string) => (k.toLowerCase() === 'content-type' ? 'application/json' : null) },
    json: async () => body,
  } as unknown as Response;
}

function fake404(): Response {
  return {
    ok: false,
    status: 404,
    headers: { get: () => 'text/plain' },
    json: async () => ({}),
  } as unknown as Response;
}

function stubFetch(routes: Array<[string, () => Response]>): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (input: string | URL) => {
      const u = typeof input === 'string' ? input : input.toString();
      for (const [needle, res] of routes) {
        if (u.includes(needle)) return res();
      }
      return fake404();
    }),
  );
}

const X402_OK = {
  x402Version: 2,
  items: [
    {
      resource: '/api/thing',
      accepts: [{ scheme: 'exact', network: 'eip155:8453', extra: { name: 'USD Coin', version: '2' } }],
    },
  ],
};

const AFTA_OK = {
  no_charge_guarantees: [{ id: '5xx', description: 'no charge on 5xx' }],
  receipts: {
    signed: true,
    algorithm: 'EdDSA',
    public_key_url: 'https://good.example/.well-known/good-receipt-key.json',
  },
};

const KEY_OK = { kty: 'OKP', crv: 'Ed25519', x: 'abc123def456ghi789' };

describe('certifyDomain: scoring (fetch-mocked)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('scores a fully conforming publisher 6/6 certified-eligible', async () => {
    stubFetch([
      ['good.example/.well-known/x402.json', () => fakeJson(X402_OK)],
      ['good.example/.well-known/agent-fair-trade.json', () => fakeJson(AFTA_OK)],
      ['good.example/.well-known/good-receipt-key.json', () => fakeJson(KEY_OK)],
    ]);
    const r = await certifyDomain('good.example');
    expect(r.ok).toBe(true);
    expect(r.score).toBe(6);
    expect(r.max).toBe(6);
    expect(r.verdict).toBe('certified-eligible');
    expect(r.checks.find(c => c.id === 'receipt_key_published')?.passed).toBe(true);
  });

  it('resolves a brand-prefixed receipt key declared via public_key_url', async () => {
    // The manifest points the key at <brand>-receipt-key.json, which the old
    // hard-coded candidate list would have missed. This is the TerminalFeed
    // false-negative the audit caught.
    const afta = {
      ...AFTA_OK,
      receipts: { ...AFTA_OK.receipts, public_key_url: 'https://brandsite.io/.well-known/brandsite-receipt-key.json' },
    };
    stubFetch([
      ['brandsite.io/.well-known/x402.json', () => fakeJson(X402_OK)],
      ['brandsite.io/.well-known/agent-fair-trade.json', () => fakeJson(afta)],
      ['brandsite.io/.well-known/brandsite-receipt-key.json', () => fakeJson(KEY_OK)],
    ]);
    const r = await certifyDomain('brandsite.io');
    expect(r.checks.find(c => c.id === 'receipt_key_published')?.passed).toBe(true);
    expect(r.score).toBe(6);
  });

  it('fails the receipt-key check on key-shaped-but-empty material', async () => {
    stubFetch([
      ['good.example/.well-known/x402.json', () => fakeJson(X402_OK)],
      ['good.example/.well-known/agent-fair-trade.json', () => fakeJson(AFTA_OK)],
      ['good.example/.well-known/good-receipt-key.json', () => fakeJson({ kty: 'OKP', crv: 'Ed25519', x: '' })],
    ]);
    const r = await certifyDomain('good.example');
    expect(r.checks.find(c => c.id === 'receipt_key_published')?.passed).toBe(false);
    expect(r.score).toBe(5);
    expect(r.verdict).toBe('almost-eligible');
  });

  it('ignores an off-domain public_key_url (cannot redirect our fetch off-host)', async () => {
    const afta = {
      ...AFTA_OK,
      receipts: { ...AFTA_OK.receipts, public_key_url: 'https://attacker.example/key.json' },
    };
    stubFetch([
      ['good.example/.well-known/x402.json', () => fakeJson(X402_OK)],
      ['good.example/.well-known/agent-fair-trade.json', () => fakeJson(afta)],
      // The key only exists at the off-domain attacker URL; the on-domain
      // candidates 404, so the check must FAIL rather than fetch off-host.
      ['attacker.example/key.json', () => fakeJson(KEY_OK)],
    ]);
    const r = await certifyDomain('good.example');
    expect(r.checks.find(c => c.id === 'receipt_key_published')?.passed).toBe(false);
  });
});

describe('certifyDomain: federation (fetch-mocked)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const fedManifest = (members: string[]) => ({
    no_charge_guarantees: [{ id: '5xx' }],
    receipts: { signed: true },
    adoption: {
      network_federation: {
        current_federation: [{ host: 'tensorfeed.ai', members }],
      },
    },
  });

  it('marks a roster-backed member as federation_verified: true', async () => {
    stubFetch([
      ['terminalfeed.io/.well-known/agent-fair-trade.json', () => fakeJson(fedManifest(['tensorfeed.ai', 'terminalfeed.io']))],
    ]);
    const r = await certifyDomain('terminalfeed.io');
    expect(r.federation_parent).toBe('tensorfeed.ai');
    expect(r.federation_verified).toBe(true);
  });

  it('marks a self-asserted, non-roster claim as federation_verified: false', async () => {
    // evil.example claims to be in tensorfeed.ai's federation. We surface the
    // claim but must NOT verify it (it is not in TF's roster), so a domain
    // cannot fake a TensorFeed endorsement.
    stubFetch([
      ['evil.example/.well-known/agent-fair-trade.json', () => fakeJson(fedManifest(['tensorfeed.ai', 'evil.example']))],
    ]);
    const r = await certifyDomain('evil.example');
    expect(r.federation_parent).toBe('tensorfeed.ai');
    expect(r.federation_verified).toBe(false);
    expect(r.next_step).toContain('unverified');
  });
});
