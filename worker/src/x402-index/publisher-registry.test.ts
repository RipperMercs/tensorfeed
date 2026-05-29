import { describe, it, expect, vi } from 'vitest';
import { crawlPublisherManifest, isValidPublisherDomain, refreshAllPublishers } from './publisher-registry';
import { KV_KEY_PUBLISHERS, kvKeyPublisher } from './constants';
import type { PublisherRecord } from './types';

describe('isValidPublisherDomain (SSRF guard)', () => {
  it('rejects localhost and loopback hostnames', () => {
    expect(isValidPublisherDomain('localhost')).toBe(false);
    expect(isValidPublisherDomain('app.localhost')).toBe(false);
  });

  it('rejects all IPv4 literals (public and private alike), since a publisher domain should always be a hostname', () => {
    expect(isValidPublisherDomain('127.0.0.1')).toBe(false);
    expect(isValidPublisherDomain('0.0.0.0')).toBe(false);
    expect(isValidPublisherDomain('10.0.0.1')).toBe(false);
    expect(isValidPublisherDomain('172.16.0.1')).toBe(false);
    expect(isValidPublisherDomain('192.168.1.1')).toBe(false);
    expect(isValidPublisherDomain('169.254.169.254')).toBe(false);
    expect(isValidPublisherDomain('8.8.8.8')).toBe(false);
    expect(isValidPublisherDomain('1.1.1.1')).toBe(false);
  });

  it('rejects IPv6 literals (loopback and global alike)', () => {
    expect(isValidPublisherDomain('[::1]')).toBe(false);
    expect(isValidPublisherDomain('[2001:db8::1]')).toBe(false);
    expect(isValidPublisherDomain('[fe80::1]')).toBe(false);
  });

  it('rejects mDNS and internal TLDs', () => {
    expect(isValidPublisherDomain('printer.local')).toBe(false);
    expect(isValidPublisherDomain('vault.internal')).toBe(false);
  });

  it('rejects userinfo, scheme, path, and query smuggling', () => {
    expect(isValidPublisherDomain('attacker.com@victim.com')).toBe(false);
    expect(isValidPublisherDomain('https://evil.com')).toBe(false);
    expect(isValidPublisherDomain('evil.com/path')).toBe(false);
    expect(isValidPublisherDomain('evil.com?q=1')).toBe(false);
    expect(isValidPublisherDomain('evil.com#frag')).toBe(false);
  });

  it('rejects single-label hostnames and empty input', () => {
    expect(isValidPublisherDomain('mailhost')).toBe(false);
    expect(isValidPublisherDomain('')).toBe(false);
    expect(isValidPublisherDomain('a'.repeat(254))).toBe(false);
  });

  it('accepts well-formed public domains', () => {
    expect(isValidPublisherDomain('tensorfeed.ai')).toBe(true);
    expect(isValidPublisherDomain('terminalfeed.io')).toBe(true);
    expect(isValidPublisherDomain('api.example.co.uk')).toBe(true);
  });

  it('rejects CRLF / tab / null-byte / whitespace smuggling that the URL parser would strip', () => {
    expect(isValidPublisherDomain('evil.com\r\n.example.com')).toBe(false);
    expect(isValidPublisherDomain('evil.com\n.example.com')).toBe(false);
    expect(isValidPublisherDomain('evil.com\t.example.com')).toBe(false);
    expect(isValidPublisherDomain('evil.com ')).toBe(false);
    expect(isValidPublisherDomain('evil.com\x00.com')).toBe(false);
  });

  it('rejects IDN / Unicode homograph attempts (Cyrillic look-alikes)', () => {
    // Cyrillic small letter ie (U+0435) looks like Latin 'e'
    expect(isValidPublisherDomain('еxample.com')).toBe(false);
    // Fullwidth dot (U+3002) looks like ASCII '.'
    expect(isValidPublisherDomain('127。0。0。1')).toBe(false);
  });

  it('rejects alternate IP encodings that URL parser canonicalizes to private ranges', () => {
    expect(isValidPublisherDomain('2130706433')).toBe(false);     // decimal form of 127.0.0.1
    expect(isValidPublisherDomain('0x7f000001')).toBe(false);     // hex form of 127.0.0.1
    expect(isValidPublisherDomain('127.1')).toBe(false);          // shorthand IPv4
    expect(isValidPublisherDomain('0177.0.0.1')).toBe(false);     // octal form
  });

  it('rejects empty / oversized DNS labels', () => {
    expect(isValidPublisherDomain('..example.com')).toBe(false);
    expect(isValidPublisherDomain('.example.com')).toBe(false);
    expect(isValidPublisherDomain('example..com')).toBe(false);
    expect(isValidPublisherDomain('a'.repeat(64) + '.com')).toBe(false); // label > 63
  });
});

describe('crawlPublisherManifest SSRF integration', () => {
  it('returns invalid_domain error for SSRF-blocked input without making any HTTP call', async () => {
    const mockFetch = vi.fn();
    const rec = await crawlPublisherManifest('127.0.0.1', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.last_crawl_error).toBe('invalid_domain');
    expect(rec.pay_to_wallets).toEqual([]);
    expect(rec.domain).toBe('');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('does NOT construct a manifest_url from unvalidated input (log-injection guard)', async () => {
    const mockFetch = vi.fn();
    const rec = await crawlPublisherManifest('http://evil.com/path?x=1', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.last_crawl_error).toBe('invalid_domain');
    expect(rec.manifest_url).toBe('');
    expect(rec.domain).toBe('');
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('treats a 3xx redirect response as an error rather than following it', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 302,
      headers: { get: (): string | null => null },
      text: async () => '',
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.last_crawl_error).toBe('redirect_302');
    expect(rec.pay_to_wallets).toEqual([]);
  });
});

describe('crawlPublisherManifest', () => {
  it('extracts payTo wallets from a V2 manifest items[].accepts[]', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (): string | null => null },
      text: async () => JSON.stringify({
        items: [
          {
            accepts: [
              { scheme: 'exact', network: 'eip155:8453', payTo: '0xABC0000000000000000000000000000000000001' },
              { scheme: 'exact', network: 'eip155:8453', payTo: '0xABC0000000000000000000000000000000000002' },
            ],
          },
        ],
      }),
    });

    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);

    expect(rec.domain).toBe('example.com');
    expect(rec.manifest_url).toBe('https://example.com/.well-known/x402.json');
    expect(rec.pay_to_wallets).toEqual([
      '0xabc0000000000000000000000000000000000001',
      '0xabc0000000000000000000000000000000000002',
    ]);
    expect(rec.last_crawled).toBe('2026-05-27T00:00:00.000Z');
    expect(rec.last_crawl_error).toBeNull();
  });

  it('returns empty wallets when accepts has no Base network entries', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (): string | null => null },
      text: async () => JSON.stringify({
        items: [
          { accepts: [{ scheme: 'exact', network: 'solana', payTo: '0xabc0000000000000000000000000000000000001' }] },
        ],
      }),
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.pay_to_wallets).toEqual([]);
    expect(rec.last_crawl_error).toBeNull();
  });

  it('handles V1 flat accepts[] shape', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (): string | null => null },
      text: async () => JSON.stringify({
        accepts: [{ scheme: 'exact', network: 'base', payTo: '0xa1a0000000000000000000000000000000000001' }],
      }),
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.pay_to_wallets).toEqual(['0xa1a0000000000000000000000000000000000001']);
  });

  it('records HTTP error when manifest fetch returns non-2xx', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      headers: { get: (): string | null => null },
      text: async () => '',
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.last_crawl_error).toBe('HTTP 404');
    expect(rec.pay_to_wallets).toEqual([]);
  });

  it('records exception when fetch throws', async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error('network blew up'));
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.last_crawl_error).toBe('network blew up');
  });

  it('dedupes duplicate wallets across multiple accepts entries', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (): string | null => null },
      text: async () => JSON.stringify({
        items: [
          {
            accepts: [
              { scheme: 'exact', network: 'base', payTo: '0xd00000000000000000000000000000000000dead' },
              { scheme: 'exact', network: 'eip155:8453', payTo: '0xD00000000000000000000000000000000000DEAD' },
            ],
          },
        ],
      }),
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.pay_to_wallets).toEqual(['0xd00000000000000000000000000000000000dead']);
  });
});

describe('crawlPublisherManifest record-storage hardening', () => {
  it('stores the normalized hostname on the record, not the raw domain argument', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (): string | null => null },
      text: async () => JSON.stringify({ items: [{ accepts: [{ scheme: 'exact', network: 'base', payTo: '0xABC0000000000000000000000000000000000001' }] }] }),
    });
    // Valid input but with mixed case + trailing dot
    const rec = await crawlPublisherManifest('TENSORFEED.AI.', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.domain).toBe('tensorfeed.ai');
    expect(rec.manifest_url).toBe('https://tensorfeed.ai/.well-known/x402.json');
  });

  it('returns empty domain (not the raw input) for SSRF-rejected input', async () => {
    const mockFetch = vi.fn();
    const rec = await crawlPublisherManifest('evil.com\r\n[FAKE_LOG]', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.domain).toBe('');
    expect(rec.manifest_url).toBe('');
    expect(rec.last_crawl_error).toBe('invalid_domain');
  });
});

describe('crawlPublisherManifest manifest-content hardening', () => {
  it('rejects manifests over 1 MB via Content-Length header', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (k: string) => (k.toLowerCase() === 'content-length' ? '2000000' : null) },
      text: async () => '',
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.last_crawl_error).toBe('manifest_too_large');
  });

  it('rejects manifests over 1 MB via response body size', async () => {
    const huge = 'x'.repeat(1_000_001);
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (): string | null => null },
      text: async () => huge,
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.last_crawl_error).toBe('manifest_too_large');
  });

  it('handles JSON parse errors gracefully', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (): string | null => null },
      text: async () => 'not json {{{',
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.last_crawl_error).toBe('manifest_parse_error');
  });

  it('skips payTo values that do not match the Ethereum address regex', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (): string | null => null },
      text: async () => JSON.stringify({
        items: [{
          accepts: [
            { scheme: 'exact', network: 'base', payTo: '<script>alert(1)</script>' },
            { scheme: 'exact', network: 'base', payTo: '0xABC0000000000000000000000000000000000001' },
            { scheme: 'exact', network: 'base', payTo: 'not-an-address' },
          ],
        }],
      }),
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.pay_to_wallets).toEqual(['0xabc0000000000000000000000000000000000001']);
  });

  it('caps pay_to_wallets at 100 entries even for absurd accepts arrays', async () => {
    const accepts = Array.from({ length: 250 }, (_, i) => ({
      scheme: 'exact',
      network: 'base',
      payTo: '0x' + i.toString(16).padStart(40, '0'),
    }));
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (): string | null => null },
      text: async () => JSON.stringify({ items: [{ accepts }] }),
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.pay_to_wallets.length).toBe(100);
  });

  it('only counts accepts with scheme=exact', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (): string | null => null },
      text: async () => JSON.stringify({
        items: [{
          accepts: [
            { scheme: 'streaming', network: 'base', payTo: '0xABC0000000000000000000000000000000000001' },
            { scheme: 'exact', network: 'base', payTo: '0xABC0000000000000000000000000000000000002' },
          ],
        }],
      }),
    });
    const rec = await crawlPublisherManifest('example.com', () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch);
    expect(rec.pay_to_wallets).toEqual(['0xabc0000000000000000000000000000000000002']);
  });
});

function mockKv() {
  const store = new Map<string, string>();
  return {
    store,
    get: vi.fn(async (key: string, type?: 'json') => {
      const raw = store.get(key);
      if (raw === undefined) return null;
      return type === 'json' ? JSON.parse(raw) : raw;
    }),
    put: vi.fn(async (key: string, value: string, _opts?: { expirationTtl?: number }) => {
      store.set(key, value);
    }),
  };
}

describe('refreshAllPublishers', () => {
  it('crawls each seed, writes wallet map + per-publisher records to KV', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;

    const mockFetch = vi.fn(async (url: string | URL) => {
      const u = url.toString();
      if (u === 'https://tensorfeed.ai/.well-known/x402.json') {
        return {
          ok: true,
          headers: { get: (): string | null => null },
          text: async () => JSON.stringify({
            items: [{ accepts: [{ scheme: 'exact', network: 'base', payTo: '0xaaa0000000000000000000000000000000000001' }] }],
          }),
        };
      }
      if (u === 'https://terminalfeed.io/.well-known/x402.json') {
        return {
          ok: true,
          headers: { get: (): string | null => null },
          text: async () => JSON.stringify({
            items: [{ accepts: [{ scheme: 'exact', network: 'base', payTo: '0xbbb0000000000000000000000000000000000001' }] }],
          }),
        };
      }
      return { ok: false, status: 404, headers: { get: (): string | null => null }, text: async () => '' };
    }) as unknown as typeof fetch;

    const result = await refreshAllPublishers(env, ['tensorfeed.ai', 'terminalfeed.io'], () => '2026-05-27T00:00:00.000Z', mockFetch, []);

    expect(result.count).toBe(2);
    expect(result.errors).toBe(0);

    const walletMap = await kv.get(KV_KEY_PUBLISHERS, 'json');
    expect(walletMap).toEqual({
      '0xaaa0000000000000000000000000000000000001': 'tensorfeed.ai',
      '0xbbb0000000000000000000000000000000000001': 'terminalfeed.io',
    });

    const tfRec = await kv.get(kvKeyPublisher('tensorfeed.ai'), 'json') as PublisherRecord;
    expect(tfRec.domain).toBe('tensorfeed.ai');
    expect(tfRec.pay_to_wallets).toEqual(['0xaaa0000000000000000000000000000000000001']);
    expect(tfRec.first_seen).toBe('2026-05-27T00:00:00.000Z');
  });

  it('preserves first_seen across re-crawls (merge with existing KV record)', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;

    // Pre-seed an existing record from a prior crawl 30 days ago.
    kv.store.set(kvKeyPublisher('tensorfeed.ai'), JSON.stringify({
      domain: 'tensorfeed.ai',
      manifest_url: 'https://tensorfeed.ai/.well-known/x402.json',
      pay_to_wallets: ['0xaaa0000000000000000000000000000000000001'],
      first_seen: '2026-04-27T00:00:00.000Z',
      last_crawled: '2026-05-26T00:00:00.000Z',
      last_crawl_error: null,
      last_event_at: null,
    }));

    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (): string | null => null },
      text: async () => JSON.stringify({
        items: [{ accepts: [{ scheme: 'exact', network: 'base', payTo: '0xaaa0000000000000000000000000000000000001' }] }],
      }),
    });

    await refreshAllPublishers(env, ['tensorfeed.ai'], () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch, []);

    const rec = await kv.get(kvKeyPublisher('tensorfeed.ai'), 'json') as PublisherRecord;
    expect(rec.first_seen).toBe('2026-04-27T00:00:00.000Z'); // PRESERVED from the original
    expect(rec.last_crawled).toBe('2026-05-27T00:00:00.000Z'); // BUT last_crawled advances
  });

  it('records crawl failure in the publisher record and reports errors count', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;

    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      headers: { get: (): string | null => null },
      text: async () => '',
    });

    const result = await refreshAllPublishers(env, ['tensorfeed.ai'], () => '2026-05-27T00:00:00.000Z', mockFetch as unknown as typeof fetch, []);

    expect(result.errors).toBe(1);

    const rec = await kv.get(kvKeyPublisher('tensorfeed.ai'), 'json') as PublisherRecord;
    expect(rec.last_crawl_error).toBe('HTTP 503');
    expect(rec.last_crawled).toBe('2026-05-27T00:00:00.000Z');
  });

  it('skips wallets for publishers that errored when building wallet map', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;

    const mockFetch = vi.fn(async (url: string | URL) => {
      const u = url.toString();
      if (u === 'https://tensorfeed.ai/.well-known/x402.json') {
        return {
          ok: true,
          headers: { get: (): string | null => null },
          text: async () => JSON.stringify({
            items: [{ accepts: [{ scheme: 'exact', network: 'base', payTo: '0xaaa0000000000000000000000000000000000001' }] }],
          }),
        };
      }
      return { ok: false, status: 500, headers: { get: (): string | null => null }, text: async () => '' };
    }) as unknown as typeof fetch;

    await refreshAllPublishers(env, ['tensorfeed.ai', 'broken.example'], () => '2026-05-27T00:00:00.000Z', mockFetch, []);

    const walletMap = await kv.get(KV_KEY_PUBLISHERS, 'json');
    // broken.example contributed no wallets because its crawl failed
    expect(walletMap).toEqual({
      '0xaaa0000000000000000000000000000000000001': 'tensorfeed.ai',
    });
  });

  it('uses first-wins attribution when two publishers declare the same wallet (AFTA federation)', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;

    // Both publishers declare the SAME wallet, as TF + TerminalFeed do under
    // the AFTA federation. The first publisher in iteration order must keep
    // the wallet attribution; the second publisher still gets a per-publisher
    // KV record but contributes nothing to the wallet map.
    const sharedWallet = '0x549c82e6bfc54bdae9a2073744cbc2af5d1fc6d1';
    const mockFetch = vi.fn(async (url: string | URL) => {
      const u = url.toString();
      const body = {
        items: [{ accepts: [{ scheme: 'exact', network: 'eip155:8453', payTo: sharedWallet }] }],
      };
      if (u === 'https://tensorfeed.ai/.well-known/x402.json' || u === 'https://terminalfeed.io/.well-known/x402.json') {
        return { ok: true, headers: { get: (): string | null => null }, text: async () => JSON.stringify(body) };
      }
      return { ok: false, status: 404, headers: { get: (): string | null => null }, text: async () => '' };
    }) as unknown as typeof fetch;

    const result = await refreshAllPublishers(env, ['tensorfeed.ai', 'terminalfeed.io'], () => '2026-05-28T00:00:00.000Z', mockFetch, []);

    expect(result.count).toBe(2);
    expect(result.errors).toBe(0);

    // Wallet map should attribute to the FIRST publisher in iteration order.
    const walletMap = await kv.get(KV_KEY_PUBLISHERS, 'json');
    expect(walletMap).toEqual({ [sharedWallet]: 'tensorfeed.ai' });

    // Both per-publisher records must still be in KV; getPublishers reads from
    // the prefix list so both show up in the public /publishers endpoint.
    const tf = await kv.get(kvKeyPublisher('tensorfeed.ai'), 'json') as PublisherRecord;
    const tfd = await kv.get(kvKeyPublisher('terminalfeed.io'), 'json') as PublisherRecord;
    expect(tf.pay_to_wallets).toEqual([sharedWallet]);
    expect(tfd.pay_to_wallets).toEqual([sharedWallet]);
    expect(tf.last_crawl_error).toBeNull();
    expect(tfd.last_crawl_error).toBeNull();
  });

  it('seeds manually-listed discovery-dark publishers into the wallet map without crawling them', async () => {
    const kv = mockKv();
    const env = { TENSORFEED_CACHE: kv } as unknown as import('../types').Env;

    // The crawled seed has a manifest; the manual entry does not (its
    // /.well-known/x402.json would 404), but its wallet is known from the live
    // 402 challenge of its paid endpoint.
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: (): string | null => null },
      text: async () => JSON.stringify({
        items: [{ accepts: [{ scheme: 'exact', network: 'base', payTo: '0xaaa0000000000000000000000000000000000001' }] }],
      }),
    });

    // Wallet passed in mixed case to prove normalization runs on manual entries too.
    const manual = [
      { domain: 'x402.example.com', wallets: ['0xC78F83C13BA79BE3781E7C5F658D1341729515B0'], note: 'seeded from live 402' },
    ];
    const result = await refreshAllPublishers(env, ['tensorfeed.ai'], () => '2026-05-29T00:00:00.000Z', mockFetch as unknown as typeof fetch, manual);

    expect(result.count).toBe(2); // crawled seed + manual entry
    expect(result.errors).toBe(0);
    expect(mockFetch).toHaveBeenCalledTimes(1); // only the crawled seed, the manual entry is never fetched

    const walletMap = await kv.get(KV_KEY_PUBLISHERS, 'json');
    expect(walletMap).toEqual({
      '0xaaa0000000000000000000000000000000000001': 'tensorfeed.ai',
      '0xc78f83c13ba79be3781e7c5f658d1341729515b0': 'x402.example.com',
    });

    const rec = await kv.get(kvKeyPublisher('x402.example.com'), 'json') as PublisherRecord;
    expect(rec.source).toBe('manual');
    expect(rec.manifest_url).toBe('');
    expect(rec.last_crawl_error).toBeNull();
    expect(rec.pay_to_wallets).toEqual(['0xc78f83c13ba79be3781e7c5f658d1341729515b0']);
    expect(rec.note).toBe('seeded from live 402');
  });
});
